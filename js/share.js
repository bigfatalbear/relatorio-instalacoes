// Compartilhamento: WhatsApp, e-mail, compartilhamento nativo, cópia e download.

export function whatsappUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function shareWhatsApp(text) {
  openExternal(whatsappUrl(text));
}

export function shareEmail(subject, body) {
  // mailto precisa ser navegado na própria aba para o Android abrir o app de e-mail.
  window.location.href = mailtoUrl(subject, body);
}

export async function shareNative({ title, text }) {
  if (!navigator.share) return false;
  try {
    await navigator.share({ title, text });
    return true;
  } catch (err) {
    if (err?.name === 'AbortError') return true;
    return false;
  }
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* tenta fallback */ }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function openExternal(url) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
