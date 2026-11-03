// Cálculo e formatação dos relatórios.

import {
  currency, formatDateBR, numberBR, parseISO, recordTotals, rnd,
  weekdayName, weekdayShort,
} from './db.js';

const TYPE_LABELS = {
  week: 'Relatório semanal',
  month: 'Relatório mensal',
  custom: 'Relatório personalizado',
  day: 'Relatório diário',
};

export function buildReport(records, { type = 'custom', start, end, settings }) {
  const from = start;
  const to = end;
  const inRange = records
    .filter((r) => r.date >= from && r.date <= to)
    .sort((a, b) => (a.date === b.date ? a.client.localeCompare(b.client, 'pt-BR') : a.date.localeCompare(b.date)));

  const totals = {
    count: 0,
    installQty: 0,
    cameraQty: 0,
    installTotal: 0,
    cameraTotal: 0,
    total: 0,
    days: 0,
  };

  const byDay = new Map();
  for (const record of inRange) {
    const t = recordTotals(record);
    totals.count += 1;
    totals.installQty += t.installQty;
    totals.cameraQty += t.cameraQty;
    totals.installTotal = rnd(totals.installTotal + t.installTotal);
    totals.cameraTotal = rnd(totals.cameraTotal + t.cameraTotal);
    totals.total = rnd(totals.total + t.total);

    if (!byDay.has(record.date)) {
      byDay.set(record.date, {
        date: record.date,
        count: 0,
        installQty: 0,
        cameraQty: 0,
        installTotal: 0,
        cameraTotal: 0,
        total: 0,
      });
    }
    const day = byDay.get(record.date);
    day.count += 1;
    day.installQty += t.installQty;
    day.cameraQty += t.cameraQty;
    day.installTotal = rnd(day.installTotal + t.installTotal);
    day.cameraTotal = rnd(day.cameraTotal + t.cameraTotal);
    day.total = rnd(day.total + t.total);
  }

  const days = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  totals.days = days.length;
  totals.averagePerDay = days.length ? rnd(totals.total / days.length) : 0;

  return {
    type,
    typeLabel: TYPE_LABELS[type] || TYPE_LABELS.custom,
    start: from,
    end: to,
    periodText: periodText(from, to),
    records: inRange,
    days,
    totals,
    settings: { ...settings },
    generatedAt: new Date(),
  };
}

export function periodText(start, end) {
  if (start === end) return formatDateBR(start);
  return `${formatDateBR(start)} a ${formatDateBR(end)}`;
}

/** Texto pronto para WhatsApp/e-mail. */
export function reportToText(report, { includeClients = false, style = 'whatsapp' } = {}) {
  const bold = (text) => (style === 'whatsapp' ? `*${text}*` : text);
  const lines = [];
  const { totals, settings } = report;

  lines.push(bold(report.typeLabel.toUpperCase()));
  lines.push(report.periodText);
  if (settings.company) lines.push(settings.company);
  lines.push('');

  if (totals.count === 0) {
    lines.push('Nenhum lançamento no período.');
  } else {
    lines.push(`${bold('Instalações:')} ${numberBR(totals.installQty)} (${currency(totals.installTotal)})`);
    lines.push(`${bold('Câmeras:')} ${numberBR(totals.cameraQty)} (${currency(totals.cameraTotal)})`);
    lines.push(`${bold('TOTAL:')} ${currency(totals.total)}`);
    lines.push('');
    lines.push(bold('Resumo por dia:'));
    for (const day of report.days) {
      lines.push(
        `${formatDateBR(day.date)} (${weekdayShort(day.date)}) — `
        + `${numberBR(day.installQty)} inst. · ${numberBR(day.cameraQty)} câm. · ${currency(day.total)}`,
      );
    }
  }

  if (includeClients && totals.count > 0) {
    lines.push('');
    lines.push(bold('Clientes:'));
    for (const r of report.records) {
      const t = recordTotals(r);
      const parts = [`${formatDateBR(r.date)} · ${r.client}`];
      if (r.clientId) parts.push(`ID ${r.clientId}`);
      parts.push(`${numberBR(t.installQty)} inst.`);
      if (t.cameraQty > 0) parts.push(`${numberBR(t.cameraQty)} câm.`);
      parts.push(currency(t.total));
      if (r.status === 'pendente') parts.push('PENDENTE');
      lines.push(`- ${parts.join(' · ')}`);
    }
  }

  lines.push('');
  lines.push(`Gerado em ${report.generatedAt.toLocaleString('pt-BR')}`);
  if (settings.footer) lines.push(settings.footer);
  return lines.join('\n');
}

export function emailSubject(report) {
  const suffix = report.settings.company ? ` — ${report.settings.company}` : '';
  return `${report.typeLabel} ${report.periodText}${suffix}`;
}

export function reportToCSV(report) {
  const head = [
    'Data', 'Dia da semana', 'ID', 'Cliente', 'Qtd. instalacoes', 'Valor instalacao',
    'Qtd. cameras', 'Valor camera', 'Total', 'Status', 'Observacao',
  ];
  const rows = report.records.map((r) => {
    const t = recordTotals(r);
    return [
      formatDateBR(r.date),
      weekdayName(r.date),
      r.clientId || '',
      r.client,
      numberBR(t.installQty),
      numberBR(t.installTotal, 2),
      numberBR(t.cameraQty),
      numberBR(t.cameraTotal, 2),
      numberBR(t.total, 2),
      r.status === 'pendente' ? 'Pendente' : 'Concluido',
      r.note || '',
    ];
  });

  const totalRow = [
    'TOTAL', '', '', `${numberBR(report.totals.count)} lancamentos`,
    numberBR(report.totals.installQty), numberBR(report.totals.installTotal, 2),
    numberBR(report.totals.cameraQty), numberBR(report.totals.cameraTotal, 2),
    numberBR(report.totals.total, 2), '', '',
  ];

  const csv = [head, ...rows, totalRow]
    .map((cols) => cols.map(csvCell).join(';'))
    .join('\r\n');

  return `\uFEFF${csv}`;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reportFileName(report, extension) {
  return `relatorio-${report.start}-a-${report.end}.${extension}`;
}

export function groupByDayLabel(iso) {
  return `${formatDateBR(iso)} (${weekdayName(iso)})`;
}

export { parseISO };
