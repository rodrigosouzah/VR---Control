import { initialData } from './data';
import { costOf, localDate, saleValues } from './vineyard';

export const DEMO_VERSION = 1;
export const demoDocument = (id, name, type = 'application/pdf') => ({ id: `demo-${id}`, name, type });
export const sampleDocuments = {
  invoice: demoDocument('invoice', 'Nota-de-Exemplo-SEM-VALOR-FISCAL.pdf'),
  medical: demoDocument('medical', 'Anexo-Administrativo-FICTICIO.pdf'),
  receipt: demoDocument('receipt', 'Recibo-de-Exemplo-FICTICIO.pdf'),
};
const moneyRound = value => Math.round((value + Number.EPSILON) * 100) / 100;

/** Six calendar months of wholly invented records. No customer data is read. */
export function createDemoData(anchor = localDate()) {
  const data = structuredClone(initialData);
  const base = new Date(`${anchor}T12:00:00`);
  const date = offset => { const d = new Date(base); d.setDate(d.getDate() + offset); return localDate(d); };
  const begin = new Date(base); begin.setDate(1); begin.setMonth(begin.getMonth() - 6); begin.setDate(Math.min(base.getDate(), new Date(begin.getFullYear(), begin.getMonth() + 1, 0).getDate()));
  const firstDay = Math.round((Date.parse(`${localDate(begin)}T12:00:00Z`) - Date.parse(`${anchor}T12:00:00Z`)) / 86400000);
  const timestamp = (offset, hour = 15) => `${date(offset)}T${String(hour).padStart(2, '0')}:00:00-03:00`;
  data.demo = { version: DEMO_VERSION, anchor, from: date(firstDay), label: 'Seis meses de dados fictícios' };
  data.settings = { ...data.settings, farm: 'Fazenda Vitória · Demo', owner: 'Gestora Exemplo', season: `${begin.getFullYear()}/${String(base.getFullYear() + 1).slice(-2)}` };
  const model = data.vineyard;
  model.activity = [];
  const entries = model.entries;
  const scope = valve => ({ lot: valve.lot, valveId: valve.id, variety: valve.variety });
  const add = (valve, row) => { const record = { status: 'Realizado', notes: 'Registro fictício para testes. Valores e datas ilustrativos.', ...scope(valve), ...row }; entries.push(record); return record; };
  const people = [
    ['Ana Exemplo', 'Fixo', 'Encarregada de Campo', 180, 3960, 'Mensal'],
    ['Bruno Modelo', 'Fixo', 'Operador de Máquinas', 155, 3410, 'Mensal'],
    ['Carla Exemplo', 'Fixo', 'Manejo e Adubação', 145, 3190, 'Mensal'],
    ['Daniel Modelo', 'Fixo', 'Poda e Amarrio', 150, 3300, 'Quinzenal'],
    ['Elisa Exemplo', 'Fixo', 'Seleção e Colheita', 140, 3080, 'Quinzenal'],
    ['Fábio Modelo', 'Avulso', 'Colheita', 130, 0, 'Semanal'],
    ['Gabriela Exemplo', 'Avulso', 'Colheita e Embalagem', 135, 0, 'Semanal'],
    ['Hugo Modelo', 'Avulso', 'Poda e Raleio', 145, 0, 'Por Diária'],
    ['Isabela Exemplo', 'Fixo', 'Recepção e Agroturismo', 150, 3300, 'Mensal'],
    ['João Modelo', 'Avulso', 'Auxiliar de Campo', 125, 0, 'Semanal'],
  ];
  model.employees = people.map(([name, type, role, dailyRate, monthlySalary, paymentPeriod], i) => ({ id: `demo-person-${i + 1}`, name, type, role, dailyRate, hourlyRate: moneyRound(dailyRate / 8), monthlySalary, paymentPeriod, active: i !== 9, phone: `(87) 00000-${String(i + 1).padStart(4, '0')}`, birthDate: `${1982 + i}-04-12`, address: `Rua Fictícia ${i + 1}, S/N · Endereço de demonstração, Petrolina/PE`, emergencyContact: `Contato Exemplo ${i + 1} · (87) 00000-0000`, startDate: date(firstDay), notes: 'Pessoa inteiramente fictícia. Avatar ilustrativo; telefone e endereço não são contatos reais.', photo: demoDocument(`photo-${i + 1}`, `Avatar-Ficticio-${i + 1}.png`, 'image/png'), ...scope(model.valves[i % model.valves.length]), ...(i === 9 ? { terminationDate: date(-25), terminationReason: 'Fim do serviço temporário — exemplo fictício.' } : {}) }));
  const products = [
    ['Fertilizante Exemplo A', 'Fertilizantes', 'kg', 35, 50, 4.8],
    ['Composto Orgânico Exemplo', 'Fertilizantes', 'kg', 2400, 400, 1.2],
    ['Adubo Solúvel Exemplo B', 'Fertilizantes', 'kg', 24, 10, 8.5],
    ['Produto de Manejo Exemplo', 'Defensivos', 'L', 18, 8, 42],
    ['Corretivo Exemplo', 'Corretivos', 'kg', 1200, 200, 1.6],
    ['Fita para Amarrio', 'Outros', 'un', 850, 200, 0.35],
    ['Caixas para Embalagem', 'Outros', 'un', 70, 150, 6.5],
    ['Mudas de Exemplo', 'Mudas', 'un', 180, 50, 12],
  ];
  data.inventory = products.map(([name, category, unit, quantity, minimum, price], i) => ({ id: `demo-stock-${i + 1}`, name, category, unit, quantity, minimum, price, reorderDays: 10, supplier: 'Fornecedor de Demonstração', invoice: `DEMO-EST-${i + 1}`, date: date(-5 - i), notes: 'Saldo atual fictício, ajustado manualmente. Produtos e aplicações não são recomendações agronômicas.', invoiceDocument: sampleDocuments.invoice, ...scope(model.valves[i]) }));
  function labor(valve, person, offset, id, extra = {}) {
    const days = extra.days ?? 1;
    return add(valve, { id, kind: 'labor', name: person.name, employeeId: person.id, date: date(offset), attendance: 'Presente', payMode: 'Diária', days, hours: days * 8, startTime: '07:00', endTime: days === 0.5 ? '11:00' : '16:00', breakMinutes: days === 0.5 ? 0 : 60, rate: person.dailyRate, extra: 0, commission: 0, job: person.role, paymentStatus: 'Pendente', dueDate: date(offset + 7), ...extra });
  }
  // A completed cycle followed by a current cycle, on all eighteen valves.
  model.valves.forEach((valve, i) => {
    const oldStart = firstDay + i % 8;
    const oldHarvest = oldStart + 100 + i % 6 * 3;
    const newStart = oldHarvest + 7;
    const forecast = 7 + i * 4;
    Object.assign(valve, { area: moneyRound(1.15 + i % 5 * 0.18), vines: 1100 + i % 5 * 120, pruningDate: date(newStart + 2), harvestDate: date(forecast), notes: `Ficha fictícia do lote ${valve.lot}, válvula ${valve.number}. Datas de teste, sem referência de ciclo agronômico.` });
    for (const [cycle, start, end] of [['previous', oldStart, oldHarvest], ['current', newStart, forecast]]) {
      const parent = add(valve, { id: `demo-plant-${valve.id}-${cycle}`, kind: 'planting', name: `${cycle === 'previous' ? 'Ciclo Anterior' : 'Ciclo Atual'} · ${valve.variety}`, date: date(start), expectedHarvestDate: date(end), plantQuantity: valve.vines });
      const product = data.inventory[1];
      add(valve, { id: `${parent.id}-input`, groupId: parent.id, source: 'planting', kind: 'input', date: parent.date, name: product.name, inventoryId: product.id, inputType: product.category, quantity: 200 + i * 5, unit: product.unit, unitPrice: product.price, supplier: product.supplier, invoice: `DEMO-P-${i}-${cycle}`, invoiceDocument: sampleDocuments.invoice, paymentStatus: 'Pago', paymentDate: date(start + 2) });
      labor(valve, model.employees[2], start, `${parent.id}-crew`, { groupId: parent.id, source: 'planting', job: 'Preparação e Plantio' });
    }
    // Completed harvests from the previous cycle, with actual crews and sales.
    for (let h = 0; h < 3; h++) {
      const offset = oldHarvest + h * 3;
      const harvest = add(valve, { id: `demo-harvest-${valve.id}-${h}`, kind: 'harvest', name: `Colheita ${h + 1} · ${valve.variety}`, date: date(offset), kilograms: 1700 + i * 40 + h * 120, boxes: 340 + i * 8 + h * 24, bunches: 4250 + i * 100 + h * 300 });
      for (let p = 0; p < 3; p++) labor(valve, model.employees[4 + p], offset, `${harvest.id}-crew-${p}`, { groupId: harvest.id, source: 'harvest', job: 'Colheita e Seleção', days: h === 2 ? 0.5 : 1, hours: h === 2 ? 4 : 8, endTime: h === 2 ? '11:00' : '16:00', breakMinutes: h === 2 ? 0 : 60 });
      const sale = { id: `demo-sale-${valve.id}-${h}`, kind: 'sale', name: `${valve.variety} · Primeira Qualidade`, date: date(offset + 1), buyer: 'ARGOFRUTA (Demonstração)', invoice: `DEMO-${String(i * 3 + h + 1).padStart(4, '0')}`, kilograms: harvest.kilograms, boxes: harvest.boxes, priceBasis: 'kg', unitPrice: 4.2 + i % 3 * 0.6, discountPercent: 1.5, market: i % 3 === 0 ? 'M.E' : 'M.I', dueDate: date(offset + 15), paymentStatus: 'Recebido', paymentDate: date(offset + 12), invoiceDocument: sampleDocuments.invoice };
      add(valve, sale);
    }
    // Repeated costs throughout both cycles: planting inputs, fertilization,
    // pruning, tying, fuel and supplies. Paid and pending examples coexist.
    for (let offset = oldStart + 12, n = 0; offset <= 0; offset += 21, n++) {
      const product = data.inventory[n % 3];
      add(valve, { id: `demo-fert-${valve.id}-${n}`, kind: 'fertilization', name: product.name, inventoryId: product.id, date: date(offset), inputType: product.category, quantity: 12 + i % 4 * 3, unit: product.unit, unitPrice: product.price, supplier: product.supplier, invoice: `DEMO-AD-${i}-${n}`, invoiceDocument: sampleDocuments.invoice, paymentStatus: offset < -10 ? 'Pago' : 'Pendente', paymentDate: offset < -10 ? date(offset + 3) : '', dueDate: date(offset + 7), notes: 'Aplicação fictícia para testar custos e consumo. Não utilizar como orientação de adubação.' });
    }
    for (const [n, service] of ['Poda', 'Primeiro Amarrio', 'Raleio'].entries()) {
      const offset = newStart + 3 + n * 17;
      add(valve, { id: `demo-service-${valve.id}-${n}`, kind: 'service', name: `${service} · Equipe Exemplo`, serviceType: service, date: date(offset), quantity: 2 + i % 3, unit: 'Diária', unitPrice: 160, supplier: 'Serviços de Campo Demonstração', invoice: `DEMO-SERV-${i}-${n}`, invoiceDocument: sampleDocuments.receipt, paymentStatus: 'Pago', paymentDate: date(offset + 5), dueDate: date(offset + 5) });
    }
    add(valve, { id: `demo-diesel-${valve.id}`, kind: 'diesel', name: 'Diesel · Trator de Demonstração', date: date(-8 - i), quantity: 22 + i, unit: 'L', unitPrice: 6.1, equipment: 'Trator Exemplo 01', supplier: 'Posto Fictício', invoice: `DEMO-D-${i}`, invoiceDocument: sampleDocuments.invoice, paymentStatus: i % 3 === 0 ? 'Pendente' : 'Pago', dueDate: date(i % 3 === 0 ? -2 : -5 - i), paymentDate: i % 3 === 0 ? '' : date(-5 - i) });
    add(valve, { id: `demo-material-${valve.id}`, kind: 'material', name: 'Manutenção de Estrutura · Exemplo', category: 'Manutenção', date: date(-20 - i), amount: 220 + i * 15, paymentStatus: 'Pago', paymentDate: date(-15 - i), invoiceDocument: sampleDocuments.receipt });
    add(valve, { id: `demo-note-${valve.id}`, kind: 'note', name: 'Acompanhamento Semanal', frequency: 'Semanal', date: date(-i % 7), notes: `Lote ${valve.lot}, válvula ${valve.number}: equipe conferiu estrutura, desenvolvimento e programação. Anotação exclusivamente fictícia.` });
    const product = data.inventory[2];
    add(valve, { id: `demo-planned-input-${valve.id}`, kind: 'fertilization', name: product.name, inventoryId: product.id, inputType: product.category, date: date(2 + i % 9), quantity: 15, unit: product.unit, unitPrice: product.price, status: 'Planejado', paymentStatus: 'Pendente', dueDate: date(7 + i % 9), notes: 'Exemplo de programação futura. Produto, dose e data não constituem recomendação.' });
  });
  // A few valves already in partial harvest make the current month meaningful.
  for (let i = 0; i < 4; i++) {
    const valve = model.valves[i];
    const parent = add(valve, { id: `demo-recent-harvest-${i}`, kind: 'harvest', name: 'Colheita Parcial · Ciclo Atual', date: date(-3 + i), kilograms: 2250 + i * 100, boxes: 450 + i * 20, bunches: 5625 + i * 250 });
    for (let p = 0; p < 3; p++) labor(valve, model.employees[4 + p], -3 + i, `${parent.id}-crew-${p}`, { groupId: parent.id, source: 'harvest', job: 'Colheita' });
    const row = add(valve, { id: `demo-recent-sale-${i}`, kind: 'sale', name: `${valve.variety} · Lote Comercial de Exemplo`, buyer: i === 3 ? 'Comprador Exemplo B' : 'ARGOFRUTA (Demonstração)', date: date(-3 + i), kilograms: parent.kilograms, boxes: parent.boxes, priceBasis: 'kg', unitPrice: 5.2, discountPercent: 1.5, market: 'M.I', invoice: `DEMO-REC-${i}`, invoiceDocument: sampleDocuments.invoice, dueDate: date(i === 0 ? -1 : 3 + i), paymentStatus: i === 0 ? 'Pendente' : i === 1 ? 'Parcial' : i === 2 ? 'Recebido' : 'Pendente', paymentDate: i === 1 || i === 2 ? anchor : '', receivedAmount: 0 });
    if (row.paymentStatus === 'Parcial') row.receivedAmount = moneyRound(saleValues(row).net / 2);
  }
  // Personnel presence and operational allocations use one consistent person/day.
  for (let i = 0; i < 3; i++) {
    const valve = model.valves[i]; const offset = 10 + i * 4;
    const parent = add(valve, { id: `demo-next-plant-${i}`, kind: 'planting', name: 'Próximo Ciclo · Plantio Planejado', date: date(offset), expectedHarvestDate: date(offset + 115), plantQuantity: valve.vines, status: 'Planejado' });
    const product = data.inventory[1];
    add(valve, { id: `${parent.id}-input`, groupId: parent.id, source: 'planting', kind: 'input', name: product.name, inventoryId: product.id, inputType: product.category, quantity: 180, unit: product.unit, unitPrice: product.price, date: parent.date, status: 'Planejado', paymentStatus: 'Pendente' });
    labor(valve, model.employees[2], offset, `${parent.id}-crew`, { groupId: parent.id, source: 'planting', job: 'Plantio', status: 'Planejado', paymentStatus: 'Pendente' });
  }
  // Personnel presence and operational allocations use one consistent person/day.
  for (let offset = firstDay; offset <= 0; offset++) {
    const weekday = new Date(`${date(offset)}T12:00:00`).getDay();
    model.employees.forEach((person, p) => {
      if (date(offset) < person.startDate || (person.active === false && date(offset) > person.terminationDate)) return;
      const existing = entries.filter(e => e.kind === 'labor' && e.employeeId === person.id && e.date === date(offset));
      if (weekday === 0 && !existing.length) return;
      if (person.type === 'Avulso' && !existing.length && (offset + p) % 3 !== 0) return;
      const absent = p === 2 && [-12, -11].includes(offset) ? 'Falta Justificada' : p === 3 && offset === -7 ? 'Falta' : 'Presente';
      const hours = absent === 'Presente' ? (existing.length ? existing.reduce((s, r) => s + r.hours, 0) : weekday === 6 ? 4 : 8) : 0;
      const valve = model.valves[((offset - firstDay) + p) % 18];
      model.attendance.push({ id: `demo-att-${p}-${date(offset)}`, employeeId: person.id, date: date(offset), status: absent, startTime: absent === 'Presente' ? '07:00' : '', endTime: absent === 'Presente' ? hours === 4 ? '11:00' : '16:00' : '', breakMinutes: hours === 8 ? 60 : 0, hours, ...scope(valve), notes: 'Jornada fictícia de teste; horários definidos pela gestora.' });
      if (absent === 'Presente' && !existing.length) labor(valve, person, offset, `demo-daily-${p}-${date(offset)}`, { days: hours / 8, hours, endTime: hours === 4 ? '11:00' : '16:00', breakMinutes: hours === 8 ? 60 : 0, job: person.role });
    });
  }
  // Parent crews can share dates; split each person's workday across valves,
  // keeping total daily hours and day fractions coherent with the time sheet.
  const personDays = new Map();
  for (const row of entries.filter(e => e.kind === 'labor')) {
    const key = `${row.employeeId}:${row.date}`;
    if (!personDays.has(key)) personDays.set(key, []);
    personDays.get(key).push(row);
  }
  for (const rows of personDays.values()) {
    const target = new Date(`${rows[0].date}T12:00:00`).getDay() === 6 ? 4 : 8;
    const hours = target / rows.length;
    rows.forEach(row => { row.hours = hours; row.days = hours / 8; row.startTime = ''; row.endTime = ''; row.breakMinutes = 0; });
    const point = model.attendance.find(a => a.employeeId === rows[0].employeeId && a.date === rows[0].date);
    if (point) { point.hours = target; point.endTime = target === 4 ? '11:00' : '16:00'; point.breakMinutes = target === 4 ? 0 : 60; }
  }
  model.absences = [
    { id: 'demo-absence-1', employeeId: model.employees[2].id, startDate: date(-12), endDate: date(-11), type: 'Atestado', status: 'Conferido', notes: 'Anexo administrativo fictício, sem diagnóstico ou dados médicos reais.', document: sampleDocuments.medical },
    { id: 'demo-absence-2', employeeId: model.employees[3].id, startDate: date(-7), endDate: date(-7), type: 'Falta', status: 'Conferido', notes: 'Ausência fictícia sem desconto automático.' },
  ];
  // Payment periods are non-overlapping and use the same linked labor entries.
  model.employees.forEach((person, p) => {
    const span = person.paymentPeriod === 'Mensal' ? 30 : person.paymentPeriod === 'Quinzenal' ? 15 : 7;
    for (let start = firstDay, n = 0; start <= 0; start += span, n++) {
      const finish = Math.min(0, start + span - 1);
      const rows = entries.filter(e => e.kind === 'labor' && e.employeeId === person.id && e.date >= date(start) && e.date <= date(finish));
      if (!rows.length) continue;
      const paid = finish <= -8;
      const assigned = rows.reduce((s, row) => s + costOf(row), 0);
      const basePay = person.type === 'Fixo' ? Math.max(assigned, moneyRound(person.monthlySalary * (finish - start + 1) / 30)) : assigned;
      const payroll = { id: `demo-payroll-${p}-${n}`, employeeId: person.id, periodStart: date(start), periodEnd: date(finish), paymentPeriod: person.paymentPeriod, base: moneyRound(basePay), extra: n % 2 === 0 ? 35 : 0, commission: 0, deductions: 0, status: paid ? 'Pago' : 'Pendente', dueDate: date(finish + 5), paymentDate: paid ? date(finish + 3) : '', notes: 'Pagamento fictício. Adicionais ilustrativos e sem aplicação automática de regras trabalhistas.' };
      model.payrolls.push(payroll);
      rows.forEach(row => { row.payrollId = payroll.id; row.paymentStatus = paid ? 'Pago' : 'Pendente'; row.paymentDate = payroll.paymentDate; row.dueDate = payroll.dueDate; });
    }
  });
  model.employeeHistory = model.employees.map(person => ({ id: `demo-admission-${person.id}`, employeeId: person.id, name: person.name, date: person.startDate, action: 'Admissão', notes: 'Cadastro de exemplo para testes.' }));
  const former = model.employees[9];
  model.employeeHistory.push({ id: 'demo-dismissal', employeeId: former.id, name: former.name, date: former.terminationDate, action: 'Desligamento', notes: former.terminationReason });
  // Monthly overhead, purchases, and tourism income throughout the six months.
  for (let m = 0; m < 7; m++) {
    const d = new Date(begin.getFullYear(), begin.getMonth() + m, Math.min(base.getDate(), 10));
    if (localDate(d) < date(firstDay) || localDate(d) > anchor) continue;
    const month = localDate(d).slice(0, 7);
    for (const [j, [name, amount, category]] of [['Energia da Operação', 1350 + m * 45, 'Energia'], ['Internet e Telefone', 150, 'Custo Fixo'], ['Manutenção de Máquinas', 480 + m * 25, 'Manutenção'], ['Manutenção Predial e Estradas', 3200 + m * 180, 'Manutenção']].entries()) {
      data.transactions.push({ id: `demo-expense-${m}-${j}`, name: `${name} · ${month}`, type: 'Despesa', category, amount, date: localDate(d), dueDate: localDate(d), status: 'Realizado', notes: 'Despesa geral fictícia, sem rateio. Gastos de infraestrutura separados dos insumos aplicados.' });
    }
    data.transactions.push({ id: `demo-tour-income-${m}`, name: `Receita de Visitas · ${month}`, type: 'Receita', category: 'Agroturismo', amount: 980 + m * 120, date: localDate(d), dueDate: localDate(d), status: 'Realizado', notes: 'Receita fictícia de agroturismo.' });
  }
  data.transactions.push({ id: 'demo-overdue-bill', name: 'Manutenção da Bomba · Pendente', type: 'Despesa', category: 'Manutenção', amount: 890, date: date(-12), dueDate: date(-2), status: 'Pendente', notes: 'Exemplo de conta vencida a pagar.' }, { id: 'demo-upcoming-bill', name: 'Energia · Próximo Vencimento', type: 'Despesa', category: 'Energia', amount: 1680, date: anchor, dueDate: date(5), status: 'Pendente', notes: 'Exemplo de conta prevista.' });
  const groups = ['Escola Exemplo', 'Rota da Uva — Grupo Modelo', 'Associação de Demonstração', 'Famílias Exemplo', 'Excursão Vale Fictício'];
  for (let offset = firstDay + 3, i = 0; offset < -5; offset += 8, i++) model.visits.push({ id: `demo-visit-${i}`, groupName: `${groups[i % groups.length]} ${i + 1}`, date: date(offset), startTime: i % 2 ? '14:00' : '09:00', people: 12 + i % 8 * 3, contact: 'Responsável Exemplo', phone: '(87) 00000-0000', guide: model.employees[8].name, status: i % 9 === 0 ? 'Cancelada' : 'Realizada', ...scope(model.valves[i % 18]), notes: 'Roteiro fictício: recepção, visita guiada ao parreiral e apresentação da colheita.' });
  for (const [i, offset] of [0, 2, 5, 9, 15, 23].entries()) model.visits.push({ id: `demo-next-visit-${i}`, groupName: `${groups[i % groups.length]} · Próxima Visita`, date: date(offset), startTime: '09:30', people: 18 + i * 4, contact: 'Contato de Demonstração', phone: '(87) 00000-0000', guide: model.employees[8].name, status: i < 3 ? 'Confirmada' : 'Agendada', ...scope(model.valves[i]), notes: 'Visita fictícia agendada para testar o calendário.' });
  data.tasks = Array.from({ length: 48 }, (_, i) => {
    const offset = firstDay + i * 4;
    const valve = model.valves[i % 18];
    return { id: `demo-task-${i}`, name: ['Conferir Estoque', 'Revisar Estrutura', 'Organizar Equipe', 'Conferir Embalagens'][i % 4], plot: `Lote ${valve.lot} · Válvula ${valve.number}`, crop: valve.variety, ...scope(valve), date: date(offset), status: offset < 0 ? 'Concluída' : 'Pendente', tone: i % 2 ? 'green' : 'amber', notes: 'Atividade fictícia de rotina.' };
  });
  for (let i = 0; i < 8; i++) data.tasks.push({ ...data.tasks[i], id: `demo-future-task-${i}`, date: date(1 + i * 2), status: 'Pendente' });
  const moduleOf = kind => ({ planting: 'planting', input: 'inventory', fertilization: 'inventory', labor: 'hr', service: 'costs', diesel: 'costs', material: 'costs', sale: 'sales' }[kind] || 'harvest');
  model.activity = entries.filter(row => !row.groupId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90).map((row, i) => ({ id: `demo-activity-${i}`, module: moduleOf(row.kind), recordId: row.id, title: row.name, action: 'Cadastrado · Exemplo', actor: 'Gestora Exemplo', createdAt: `${row.date}T14:00:00-03:00` }));
  // Ensure every page has visible activity, including visits and older modules.
  for (const [i, [module, title]] of [['tourism', 'Próximas Visitas Confirmadas'], ['hr', 'Pagamento e Ponto Conferidos'], ['planting', 'Previsões de Colheita Conferidas'], ['inventory', 'Saldos de Estoque Ajustados'], ['costs', 'Comprovantes de Serviços Conferidos']].entries()) model.activity.unshift({ id: `demo-review-${i}`, module, title, action: 'Revisado · Exemplo', createdAt: timestamp(-i % 3), actor: 'Gestora Exemplo' });
  data.activity = [...data.transactions.map((r, i) => ({ id: `demo-general-${i}`, module: 'transactions', title: r.name, meta: 'Lançamento Fictício', date: `${r.date}T12:00:00-03:00` })), ...data.inventory.map((r, i) => ({ id: `demo-inv-${i}`, module: 'inventory', title: r.name, meta: 'Saldo Fictício Cadastrado', date: timestamp(-i) })), ...data.tasks.slice(-8).map((r, i) => ({ id: `demo-agenda-${i}`, module: 'tasks', title: r.name, meta: 'Atividade de Exemplo', date: timestamp(-i) }))];
  return data;
}
