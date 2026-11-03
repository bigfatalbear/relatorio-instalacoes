// Importação de planilhas .xlsx / .xls / .csv.

import { makeRecord, toISO, toNumber } from './db.js';

const HEADER_ALIASES = {
  date: ['DATA', 'DIA', 'DATADEINSTALACAO'],
  clientId: ['ID', 'CODIGO', 'COD', 'IDCLIENTE', 'CODIGOCLIENTE'],
  client: ['CLIENTES', 'CLIENTE', 'NOME', 'NOMEDOCLIENTE', 'NOMECLIENTE'],
  installUnit: ['INSTALACAO', 'VALORINSTALACAO', 'VALORDAINSTALACAO'],
  cameraUnit: ['CAMERA', 'VALORCAMERA', 'VALORDACAMERA'],
  installQty: ['QTDINSTALACAO', 'QTDINSTALACOES', 'QUANTIDADEINSTALACAO', 'QTDDEINSTALACAO'],
  cameraQty: ['QTDCAMERA', 'QTDCAMERAS', 'QUANTIDADECAMERA', 'QTDECAMERA'],
  status: ['OK', 'STATUS', 'SITUACAO'],
};

export async function importSpreadsheet(file, settings) {
  const name = (file.name || '').toLowerCase();
  const rows = name.endsWith('.csv')
    ? parseCSV(await file.text())
    : readWorkbookRows(await file.arrayBuffer());

  return rowsToRecords(rows, settings);
}

/* ---------------- leitura ---------------- */

function readWorkbookRows(buffer) {
  const XLSX = globalThis.XLSX;
  if (!XLSX) throw new Error('Biblioteca de planilhas não carregada.');

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: false });
  const rows = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: false });
    rows.push(...data);
  }
  return rows;
}

function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] || '';
  const candidates = [';', ',', '\t'];
  const delimiter = candidates
    .map((d) => ({ d, count: (firstLine.match(new RegExp(escapeRegExp(d), 'g')) || []).length }))
    .sort((a, b) => b.count - a.count)[0].d;

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field); field = '';
    } else if (char === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
}

/* ---------------- transformação ---------------- */

export function rowsToRecords(rows, settings) {
  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    const hasClient = normalized.some((h) => HEADER_ALIASES.client.includes(h));
    const hasDate = normalized.some((h) => HEADER_ALIASES.date.includes(h));
    return hasClient && hasDate;
  });

  const result = { records: [], ignored: 0, duplicates: 0, sheets: [] };
  if (headerIndex < 0) return result;

  const map = buildColumnMap(rows[headerIndex]);
  if (map.client == null || map.date == null) return result;

  let lastDate = null;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || !row.length) continue;

    const normalized = row.map(normalizeHeader);
    if (normalized.includes('DATA') && normalized.some((h) => HEADER_ALIASES.client.includes(h))) {
      lastDate = null; // nova aba/planilha: não herdar data da anterior
      continue;
    }

    const client = cleanText(row[map.client]);
    if (!client) { result.ignored += 1; continue; }
    if (/^(TOTAL|SUBTOTAL|VALOR|INSTALACAO|CAMERA)$/i.test(client)) { result.ignored += 1; continue; }

    let date = map.date != null ? parseDate(row[map.date]) : null;
    if (date) lastDate = date;
    else date = lastDate;
    if (!date) { result.ignored += 1; continue; }

    const installUnit = pickNumber(row, map.installUnit, settings.installUnit);
    const rawCameraUnit = pickNumber(row, map.cameraUnit, NaN);
    const hasCamera = Number.isFinite(rawCameraUnit) && rawCameraUnit > 0;
    const cameraUnit = hasCamera ? rawCameraUnit : settings.cameraUnit;
    let installQty = pickNumber(row, map.installQty, 1);
    let cameraQty = hasCamera ? pickNumber(row, map.cameraQty, 1) : 0;
    if (!Number.isFinite(cameraQty)) cameraQty = 1;
    if (!Number.isFinite(installQty) || installQty === 0) installQty = 1;

    const statusRaw = cleanText(map.status != null ? row[map.status] : '').toLowerCase();
    const status = statusRaw.includes('pend') ? 'pendente' : 'ok';

    result.records.push(makeRecord({
      date,
      clientId: map.clientId != null ? cleanText(row[map.clientId]) : '',
      client,
      installQty,
      installUnit,
      cameraQty: hasCamera ? Math.max(0, cameraQty) : 0,
      cameraUnit,
      status,
      note: '',
    }, settings));
  }

  return result;
}

function buildColumnMap(headerRow) {
  const map = {};
  headerRow.forEach((raw, index) => {
    const key = normalizeHeader(raw);
    if (!key) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (map[field] == null && aliases.includes(key)) map[field] = index;
    }
  });
  return map;
}

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function cleanText(value) {
  if (value == null) return '';
  if (value instanceof Date) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function pickNumber(row, index, fallback) {
  if (index == null) return fallback;
  const value = row[index];
  if (value == null || value === '') return fallback;
  const n = toNumber(value, NaN);
  return Number.isFinite(n) ? n : fallback;
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return toISO(value);
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(value) * 86400000;
    const d = new Date(ms);
    if (d.getUTCFullYear() < 1990 || d.getUTCFullYear() > 2100) return null;
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return validDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (match) {
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    return validDate(year, Number(match[2]), Number(match[1]));
  }
  return null;
}

function validDate(year, month, day) {
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
