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
  entries: [], employees: [], visits: [], attendance: [], absences: [], payrolls: [], employeeHistory: [],
};
export const entryKinds = {
  planting: 'Plantio',
  service: 'Serviço de Campo', diesel: 'Diesel',
  fertilization: 'Adubação', input: 'Insumo', material: 'Matéria-Prima / Outro Custo',
  labor: 'Mão de Obra', harvest: 'Colheita', sale: 'Venda de Fruta', water: 'Água', note: 'Anotação', pruning: 'Poda',
};
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const valveName = v => !v?.id ? 'Geral / Não Rateado' : `Lote ${v.lot} · Válvula ${String(v.number).padStart(2, '0')}`;
export const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0;
export function costOf(entry) {
  let amount = 0;
  if (entry.kind === 'labor') amount = entry.attendance !== 'Presente' ? 0 : numeric(entry.rate) * (entry.payMode === 'Diária' ? numeric(entry.days) : numeric(entry.hours)) + numeric(entry.extra) + numeric(entry.commission);
  if (['input', 'fertilization', 'water', 'service', 'diesel'].includes(entry.kind)) amount = numeric(entry.quantity) * numeric(entry.unitPrice);
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
  const services = realized.filter(e => e.kind === 'service').reduce((s, e) => s + costOf(e), 0);
  const diesel = realized.filter(e => e.kind === 'diesel').reduce((s, e) => s + costOf(e), 0);
  const sales = realized.filter(e => e.kind === 'sale');
  const revenue = sales.reduce((s, e) => s + saleValues(e).net, 0);
  const received = sales.reduce((s, e) => s + saleValues(e).received, 0);
  const paidCosts = realized.filter(e => e.paymentStatus === 'Pago' && !e.payrollId && !e.linkedTransactionId && !e.linkedPayrollId).reduce((s, e) => s + costOf(e), 0);
  return { inputs, labor, materials, water, services, diesel, cost: inputs + labor + materials + water + services + diesel,
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
  const result = { ...value, valves: [...value.valves, ...initialVineyard.valves.filter(v => !value.valves.some(existing => existing.id === v.id))], employees: Array.isArray(value.employees) ? value.employees : [] };
  for (const key of ['visits', 'attendance', 'absences', 'payrolls', 'employeeHistory', 'activity']) if (!Array.isArray(result[key])) result[key] = [];
  return result;
}

export const varietyColors = { 'Vitória': '#74509b', 'Sugar Crisp': '#27865e', 'Timpson': '#bd8a32' };
export function cropCycle(model, valveId, asOf = localDate()) {
  const plantings = model.entries.filter(e => e.kind === 'planting' && e.valveId === valveId).sort((a, b) => b.date.localeCompare(a.date));
  const planting = plantings.find(e => e.status === 'Realizado') || plantings[0];
  const valve = model.valves.find(v => v.id === valveId);
  const start = planting?.date;
  const end = planting?.expectedHarvestDate || valve?.harvestDate;
  if (!start || !end || end < start) return { start, end, variety: planting?.variety || valve?.variety, progress: null };
  const day = s => Date.parse(`${s}T12:00:00Z`);
  const duration = (day(end) - day(start)) / 86400000;
  const progress = duration === 0 ? (asOf >= end ? 100 : 0) : Math.max(0, Math.min(100, Math.round((day(asOf) - day(start)) / 86400000 / duration * 100)));
  return { start, end, variety: planting?.variety || valve?.variety, progress, remaining: Math.max(0, Math.ceil((day(end) - day(asOf)) / 86400000)), month: new Date(`${end}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), planned: planting?.status === 'Planejado' };
}
export function payrollNet(row) { return Math.round((numeric(row.base) + numeric(row.extra) + numeric(row.commission) - numeric(row.deductions) + Number.EPSILON) * 100) / 100; }
export function financialAlerts(model, general = [], asOf = localDate()) {
  const alerts = [];
  for (const sale of model.entries.filter(e => e.kind === 'sale' && e.status === 'Realizado')) {
    const outstanding = saleValues(sale).outstanding;
    if (outstanding > 0) alerts.push({ id: sale.id, title: sale.buyer || sale.name, dueDate: sale.dueDate, amount: outstanding, category: 'Venda a Receber', overdue: Boolean(sale.dueDate && sale.dueDate < asOf) });
  }
  for (const expense of model.entries.filter(e => costOf(e) > 0 && e.status === 'Realizado' && e.paymentStatus !== 'Pago' && !e.payrollId && !e.linkedTransactionId && !e.linkedPayrollId)) alerts.push({ id: expense.id, title: expense.name, dueDate: expense.dueDate, amount: costOf(expense), category: 'Custo a Pagar', overdue: Boolean(expense.dueDate && expense.dueDate < asOf) });
  for (const row of model.payrolls.filter(e => e.status !== 'Pago')) alerts.push({ id: row.id, title: model.employees.find(p => p.id === row.employeeId)?.name || 'Pagamento de Funcionário', dueDate: row.dueDate, amount: payrollNet(row), category: 'Pagamento de Funcionário', overdue: Boolean(row.dueDate && row.dueDate < asOf) });
  for (const row of general.filter(e => e.status === 'Pendente')) alerts.push({ id: row.id, title: row.name, dueDate: row.dueDate || row.date, amount: numeric(row.amount), category: row.type === 'Receita' ? 'Receita a Receber' : 'Despesa a Pagar', overdue: Boolean((row.dueDate || row.date) < asOf) });
  return alerts.sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
}
