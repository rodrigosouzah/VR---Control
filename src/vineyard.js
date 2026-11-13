export const VARIETIES = ['Vitória', 'Sugar Crisp', 'Timpson'];
const assignments = {
  '467': ['Sugar Crisp', 'Vitória', 'Vitória', 'Vitória', 'Vitória', 'Vitória', 'Vitória', 'Vitória'],
  '463': ['Timpson', 'Timpson', 'Vitória', 'Timpson', 'Vitória', 'Vitória', 'Vitória', 'Sugar Crisp', 'Sugar Crisp', 'Sugar Crisp'],
};
export const initialVineyard = {
  version: 1,
  valves: Object.entries(assignments).flatMap(([lot, varieties]) => varieties.map((variety, i) => ({
    id: `${lot}-v${String(i + 1).padStart(2, '0')}`, lot, number: i + 1, variety,
    area: '', vines: '', pruningDate: '', harvestDate: '', notes: '',
  }))),
  entries: [], employees: [],
};
export const entryKinds = {
  fertilization: 'Adubação', input: 'Insumo', material: 'Matéria-Prima / Outro Custo',
  labor: 'Mão de Obra', harvest: 'Colheita', sale: 'Venda de Fruta', water: 'Água', note: 'Anotação', pruning: 'Poda',
};
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const valveName = v => `Lote ${v.lot} · Válvula ${String(v.number).padStart(2, '0')}`;
export const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0;
export function costOf(entry) {
  let amount = 0;
  if (entry.kind === 'labor') amount = entry.attendance !== 'Presente' ? 0 : numeric(entry.rate) * (entry.payMode === 'Diária' ? numeric(entry.days) : numeric(entry.hours)) + numeric(entry.extra) + numeric(entry.commission);
  if (['input', 'fertilization', 'water'].includes(entry.kind)) amount = numeric(entry.quantity) * numeric(entry.unitPrice);
  if (entry.kind === 'material') amount = numeric(entry.amount);
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
export function saleValues(entry) {
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const gross = round(numeric(entry.priceBasis === 'Caixa' ? entry.boxes : entry.kilograms) * numeric(entry.unitPrice));
  const discount = round(gross * numeric(entry.discountPercent) / 100);
  const net = round(gross - discount);
  const received = entry.paymentStatus === 'Recebido' ? net : entry.paymentStatus === 'Parcial' ? numeric(entry.receivedAmount) : 0;
  return { gross, discount, net, received, outstanding: round(net - received) };
}
export function isoWeek(value) {
  const d = new Date(`${value}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}
export function stats(entries) {
  const realized = entries.filter(e => e.status === 'Realizado');
  const sum = (kind, field) => realized.filter(e => e.kind === kind).reduce((s, e) => s + numeric(e[field]), 0);
  const inputs = realized.filter(e => ['input', 'fertilization'].includes(e.kind)).reduce((s, e) => s + costOf(e), 0);
  const labor = realized.filter(e => e.kind === 'labor').reduce((s, e) => s + costOf(e), 0);
  const materials = realized.filter(e => e.kind === 'material').reduce((s, e) => s + costOf(e), 0);
  const water = realized.filter(e => e.kind === 'water').reduce((s, e) => s + costOf(e), 0);
  const sales = realized.filter(e => e.kind === 'sale');
  const revenue = sales.reduce((s, e) => s + saleValues(e).net, 0);
  const received = sales.reduce((s, e) => s + saleValues(e).received, 0);
  const paidCosts = realized.filter(e => e.paymentStatus === 'Pago').reduce((s, e) => s + costOf(e), 0);
  return { inputs, labor, materials, water, cost: inputs + labor + materials + water,
    revenue, received, paidCosts, outstanding: revenue - received,
    gross: sales.reduce((s, e) => s + saleValues(e).gross, 0), discounts: sales.reduce((s, e) => s + saleValues(e).discount, 0),
    soldKg: sum('sale', 'kilograms'), tonnes: sum('harvest', 'kilograms') / 1000, boxes: sum('sale', 'boxes'),
    hours: realized.filter(e => e.kind === 'labor' && e.attendance !== 'Falta').reduce((s, e) => s + numeric(e.hours), 0),
    plannedCost: entries.filter(e => e.status === 'Planejado').reduce((s, e) => s + costOf(e), 0),
  };
}
export function migrateVineyard(value) {
  if (!value || !Array.isArray(value.valves) || !Array.isArray(value.entries)) return structuredClone(initialVineyard);
  // Preserve user records and add only missing registry entries, keyed by lot AND valve.
  return { ...value, valves: [...value.valves, ...initialVineyard.valves.filter(v => !value.valves.some(existing => existing.id === v.id))], employees: Array.isArray(value.employees) ? value.employees : [] };
}
