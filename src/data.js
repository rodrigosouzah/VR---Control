export const today = () => new Date().toLocaleDateString('en-CA');
const dateIn = days => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const initialData = {
  settings: { farm: 'Fazenda Vitória', owner: 'Victoria', location: 'Araraquara, SP', season: '2026/27' },
  harvest: [
    { id: 'h1', name: 'Talhão 04', crop: 'Milho', area: 24, quantity: 142.8, date: dateIn(-5), status: 'Concluída' },
    { id: 'h2', name: 'Talhão 02', crop: 'Soja', area: 32, quantity: 96.4, date: dateIn(2), status: 'Planejada' },
    { id: 'h3', name: 'Talhão 07', crop: 'Café', area: 18, quantity: 68.5, date: dateIn(6), status: 'Em andamento' },
    { id: 'h4', name: 'Talhão 01', crop: 'Milho', area: 16, quantity: 39.4, date: dateIn(-2), status: 'Concluída' },
  ],
  inventory: [
    { id: 'i1', name: 'Fertilizante NPK 10-10-10', category: 'Fertilizantes', quantity: 2450, unit: 'kg', minimum: 500, price: 5.6 },
    { id: 'i2', name: 'Glifosato 480', category: 'Defensivos', quantity: 48, unit: 'L', minimum: 80, price: 38.75 },
    { id: 'i3', name: 'Semente milho AG 8700', category: 'Sementes', quantity: 82, unit: 'sc', minimum: 30, price: 770 },
    { id: 'i4', name: 'Ureia agrícola', category: 'Fertilizantes', quantity: 180, unit: 'kg', minimum: 300, price: 5.3 },
  ],
  transactions: [
    { id: 'f1', name: 'Venda de milho', type: 'Receita', category: 'Produção', amount: 184500, date: dateIn(-4), status: 'Realizado' },
    { id: 'f2', name: 'Venda de café', type: 'Receita', category: 'Produção', amount: 99820, date: dateIn(-2), status: 'Realizado' },
    { id: 'f3', name: 'Compra de insumos', type: 'Despesa', category: 'Insumos', amount: 98590, date: dateIn(-6), status: 'Realizado' },
    { id: 'f4', name: 'Manutenção de maquinário', type: 'Despesa', category: 'Manutenção', amount: 1280, date: dateIn(-1), status: 'Realizado' },
    { id: 'f5', name: 'Equipe de campo', type: 'Despesa', category: 'Pessoal', amount: 56000, date: dateIn(-3), status: 'Realizado' },
  ],
  tasks: [
    { id: 't1', name: 'Adubação de cobertura', plot: 'Talhão 04', crop: 'Milho', date: dateIn(0), status: 'Pendente', tone: 'green' },
    { id: 't2', name: 'Aplicação de defensivo', plot: 'Talhão 02', crop: 'Soja', date: dateIn(2), status: 'Pendente', tone: 'amber' },
    { id: 't3', name: 'Início da colheita', plot: 'Talhão 07', crop: 'Café', date: dateIn(6), status: 'Pendente', tone: 'purple' },
  ],
  activity: [],
};
export const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const number = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export const parseDate = value => new Date(`${value}T12:00:00`);
export const shortDate = value => parseDate(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
