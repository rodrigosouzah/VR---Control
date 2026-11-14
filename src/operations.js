import { costOf, localDate, numeric, payrollNet } from './vineyard';
const dayMs = 86400000;
const clean = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export function inventoryForecast(item, entries, asOf = localDate()) {
  const start = new Date(`${asOf}T12:00:00`); start.setDate(start.getDate() - 29);
  const until = new Date(`${asOf}T12:00:00`); until.setDate(until.getDate() + 30);
  const match = row => ['input', 'fertilization'].includes(row.kind) && (row.inventoryId ? row.inventoryId === item.id : clean(row.name) === clean(item.name)) && clean(row.unit) === clean(item.unit);
  const rows = entries.filter(match);
  const consumed = rows.filter(r => r.status === 'Realizado' && r.date >= localDate(start) && r.date <= asOf).reduce((s, e) => s + numeric(e.quantity), 0);
  const planned = rows.filter(r => r.status === 'Planejado' && r.date >= asOf && r.date <= localDate(until)).reduce((s, e) => s + numeric(e.quantity), 0);
  const rate = consumed / 30; const days = rate > 0 ? Math.floor(numeric(item.quantity) / rate) : null;
  const low = numeric(item.quantity) <= numeric(item.minimum);
  const soon = days !== null && days <= numeric(item.reorderDays ?? 7);
  return { consumed, rate, days, planned, alert: low || soon || planned > numeric(item.quantity), reason: low ? 'Saldo no Mínimo' : planned > numeric(item.quantity) ? 'Programação Maior que o Saldo' : soon ? 'Compra Próxima' : 'Saldo Disponível' };
}
export function generalCostEntries(transactions) {
  return transactions.filter(t => t.type === 'Despesa').map(t => ({ id: `general:${t.id}`, linkedTransactionId: t.id, source: 'general', kind: 'material', name: t.name, lot: t.lot || '', valveId: t.valveId || '', variety: t.variety || '', category: t.category || 'Despesa Geral', date: t.date, dueDate: t.dueDate || t.date, amount: numeric(t.amount), status: 'Realizado', paymentStatus: t.status === 'Realizado' ? 'Pago' : 'Pendente', paymentDate: t.paymentDate || (t.status === 'Realizado' ? t.date : ''), notes: t.notes || '' }));
}
export function appendActivity(previous, next, actor = '') {
  const events = []; const now = new Date().toISOString();
  for (const key of ['entries', 'employees', 'attendance', 'absences', 'payrolls', 'visits']) {
    const before = previous[key] || [], after = next[key] || [];
    for (const row of after) {
      const old = before.find(e => e.id === row.id);
      if (old && JSON.stringify(old) === JSON.stringify(row)) continue;
      const module = key === 'entries' ? ({ sale: 'sales', labor: 'hr', input: 'inventory', fertilization: 'inventory', service: 'costs', diesel: 'costs', material: 'costs', water: 'costs', planting: 'planting' }[row.kind] || 'harvest') : key === 'visits' ? 'tourism' : 'hr';
      events.push({ id: crypto.randomUUID(), module, recordId: row.id, title: row.name || row.groupName || next.employees?.find(p => p.id === row.employeeId)?.name || 'Registro', action: old ? 'Atualizado' : 'Cadastrado', createdAt: now, actor });
    }
    for (const row of before) if (!after.some(e => e.id === row.id)) events.push({ id: crypto.randomUUID(), module: key === 'entries' ? ({ sale: 'sales', labor: 'hr', input: 'inventory', fertilization: 'inventory', planting: 'planting' }[row.kind] || 'costs') : key === 'visits' ? 'tourism' : 'hr', title: row.name || row.groupName || 'Registro', recordId: row.id, action: 'Excluído', createdAt: now, actor });
  }
  return { ...next, activity: [...events.slice(0, 25), ...(previous.activity || [])].slice(0, 150) };
}
export function payrollCash(model) { return (model.payrolls || []).filter(p => p.status === 'Pago').reduce((s, p) => s + payrollNet(p), 0); }
export function payrollUnallocatedCosts(model) {
  return (model.payrolls || []).map(p => {
    const assigned = model.entries.filter(e => e.kind === 'labor' && e.payrollId === p.id && e.status === 'Realizado').reduce((s, e) => s + costOf(e), 0);
    return { id: `payroll-cost:${p.id}`, linkedPayrollId: p.id, source: 'hr', kind: 'material', name: `Pagamento de ${model.employees.find(e => e.id === p.employeeId)?.name || 'Funcionário'} — Saldo Não Rateado`, date: p.periodEnd, dueDate: p.dueDate, amount: Math.max(0, payrollNet(p) - assigned), lot: p.lot || '', valveId: p.valveId || '', variety: p.variety || '', status: 'Realizado', paymentStatus: p.status === 'Pago' ? 'Pago' : 'Pendente', paymentDate: p.paymentDate };
  }).filter(e => e.amount > 0);
}
export function workedHours(start, end, interval) { if (!start || !end) return ''; const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; }; let minutes = toMin(end) - toMin(start); if (minutes < 0) minutes += 1440; return Math.max(0, Math.round((minutes - numeric(interval)) / 60 * 100) / 100); }
