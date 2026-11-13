import { initialVineyard } from './vineyard';
export const today = () => new Date().toLocaleDateString('en-CA');
export const initialData = {
  settings: { farm: 'Fazenda Vitória', owner: 'Victoria', location: 'Petrolina, PE', season: '2026/27' },
  vineyard: initialVineyard,
  harvest: [],
  inventory: [],
  transactions: [],
  tasks: [],
  activity: [],
};
export const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const number = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export const parseDate = value => new Date(`${value}T12:00:00`);
export const shortDate = value => parseDate(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
