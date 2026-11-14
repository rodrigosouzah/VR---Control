import { configureDemo, STORAGE_KEY } from './runtime';
import { createDemoData, sampleDocuments } from './demoData';
import { installDemoDocuments } from './documents';
import './demo.css';

// A small, valid PDF built locally: no real invoice or medical document is used.
function samplePDF(title) {
  const text = `BT /F1 18 Tf 45 760 Td (VR CONTROL - DEMONSTRACAO) Tj 0 -40 Td /F1 13 Tf (${title}) Tj 0 -35 Td (DADOS FICTICIOS - SEM VALOR FISCAL OU MEDICO) Tj 0 -30 Td (Anexo de exemplo para testar cadastro, download e historico.) Tj 0 -25 Td (Nenhuma pessoa, transacao ou atendimento real esta representado.) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${text.length} >>\nstream\n${text}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: 'application/pdf' });
}
async function avatar(person, index) {
  const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = ['#e6f2e9', '#f4e9d6', '#ebe4f4'][index % 3]; ctx.fillRect(0, 0, 240, 240);
  ctx.fillStyle = ['#246b45', '#9b6b26', '#74509b'][index % 3];
  ctx.beginPath(); ctx.arc(120, 83, 39, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(120, 210, 83, 75, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 27px sans-serif'; ctx.fillText(person.name.split(' ').map(s => s[0]).join(''), 120, 186);
  ctx.fillStyle = '#173723'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('AVATAR FICTÍCIO', 120, 229);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Avatar indisponível.')), 'image/png'));
}
async function prepareDocuments(data, reset = false) {
  const docs = [
    { id: sampleDocuments.invoice.id, blob: samplePDF('NOTA DE EXEMPLO - SEM VALOR FISCAL') },
    { id: sampleDocuments.medical.id, blob: samplePDF('ANEXO ADMINISTRATIVO FICTICIO') },
    { id: sampleDocuments.receipt.id, blob: samplePDF('RECIBO FICTICIO PARA TESTES') },
  ];
  for (const [i, person] of data.vineyard.employees.entries()) docs.push({ id: person.photo.id, blob: await avatar(person, i) });
  await installDemoDocuments(docs, reset);
}

const defaults = createDemoData();
configureDemo(defaults, async () => {
  const fresh = createDemoData();
  await prepareDocuments(fresh, true);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  window.location.reload();
});
try { await prepareDocuments(defaults); } catch { /* Main still opens and reports unavailable attachments on download. */ }
await import('./main.jsx');
