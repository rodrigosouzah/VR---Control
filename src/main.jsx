import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutGrid, Leaf, Package, Wallet, CalendarDays, ChartNoAxesCombined, CircleHelp, Settings, Search, Plus, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Bell, Menu, X, Download, Check, Trash2, Sprout, MapPin, ShieldCheck, SlidersHorizontal, Droplets, Grape, Users, ClipboardList, Pencil } from 'lucide-react';
import logo from '../logos/Logo2.png';
import { initialData, today, money, number, parseDate, shortDate } from './data';
import './styles.css';
import VineyardWorkspace from './VineyardWorkspace';
import { migrateVineyard, stats as vineyardStats, saleValues } from './vineyard';
import Weather, { PETROLINA } from './Weather';
import { openDocument, saveDocument } from './documents';

const STORAGE = 'vr-control-v1';
const modules = [
  { id: 'harvest', label: 'Colheita', title: 'Planilha de Colheita', description: 'Diário de colheita, equipe e custos por lote e válvula.', icon: Leaf, tone: 'green' },
  { id: 'inventory', label: 'Insumos e Estoque', title: 'Planilha de Insumos', description: 'Compras, estoque e calendário de adubação por válvula.', icon: Package, tone: 'amber' },
  { id: 'water', label: 'Água', title: 'Água', description: 'Irrigação, volume utilizado e custos de cada válvula.', icon: Droplets, tone: 'blue' },
  { id: 'fruit', label: 'Fruta', title: 'Fruta', description: 'Vendas à ARGOFRUTA, notas fiscais e recebimentos.', icon: Grape, tone: 'purple' },
  { id: 'reports', label: 'Relatórios', title: 'Relatórios', description: 'Resultados e custos separados por lote e válvula.', icon: ChartNoAxesCombined, tone: 'green' },
  { id: 'payroll', label: 'Folhas de Funcionários', title: 'Folhas de Funcionários', description: 'Horas, diárias, meias diárias e ausências por período.', icon: ClipboardList, tone: 'amber' },
  { id: 'employees', label: 'Colaboradores', title: 'Colaboradores', description: 'Profissionais fixos e avulsos e seu histórico detalhado.', icon: Users, tone: 'purple' },
  { id: 'transactions', label: 'Financeiro', title: 'Fluxo Financeiro', description: 'Custos fixos, folha, contas a pagar e fluxo de caixa.', icon: Wallet, tone: 'blue' },
];
const agendaModule = { id: 'tasks', label: 'Agenda Agrícola', title: 'Agenda Agrícola', description: 'Organize adubação, plantio, manejo e equipe de campo.', icon: CalendarDays, tone: 'purple' };
const recordModules = [modules[0], modules[1], modules[7], agendaModule];
const nav = [{ id: 'home', label: 'Visão Geral', icon: LayoutGrid }, ...modules, agendaModule];
const columns = {
  harvest: ['Talhão', 'Cultura', 'Área', 'Produção', 'Data', 'Status', 'Ações'],
  inventory: ['Insumo', 'Categoria', 'Estoque', 'Mínimo', 'Valor Total', 'Status', 'Ações'],
  transactions: ['Descrição', 'Categoria', 'Tipo', 'Valor', 'Data', 'Status', 'Ações'],
  tasks: ['Atividade', 'Talhão', 'Cultura', 'Data', 'Status', 'Ações'],
};
function readData() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE));
    if (data && ['harvest', 'inventory', 'transactions', 'tasks', 'activity'].every(k => Array.isArray(data[k])) && data.settings) return { ...data, settings: { ...data.settings, location: data.settings.location === 'Araraquara, SP' ? 'Petrolina, PE' : data.settings.location }, vineyard: migrateVineyard(data.vineyard) };
  } catch { /* Fall back to demonstration data if storage is unavailable or corrupt. */ }
  return structuredClone(initialData);
}
function exportCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]).filter(k => k !== 'id' && k !== 'tone');
  const escape = value => `"${(typeof value === 'number' ? value.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 6 }) : String(value ?? '')).replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  const csv = '\uFEFF' + [keys.map(escape).join(';'), ...rows.map(row => keys.map(k => escape(row[k])).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => { previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={e => { e.preventDefault(); closeRef.current(); }} onClick={e => { if (e.target === ref.current) closeRef.current(); }}>
    <div className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>{children}
  </dialog>;
}
function App() {
  const [data, setData] = useState(readData);
  const [active, setActive] = useState('home');
  const [harvestView, setHarvestView] = useState('vineyard');
  const [vineyardNew, setVineyardNew] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(false);
  const searchRef = useRef(null);
  useEffect(() => { try { localStorage.setItem(STORAGE, JSON.stringify(data)); setStorageError(false); } catch { setStorageError(true); } }, [data]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    const handler = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
  const go = id => { setActive(id); setQuery(''); setFilter('Todos'); setMobile(false); };
  const vineTotals = vineyardStats(data.vineyard.entries);
  const income = vineTotals.received + data.transactions.filter(t => t.type === 'Receita' && t.status === 'Realizado').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = vineTotals.paidCosts + data.transactions.filter(t => t.type === 'Despesa' && t.status === 'Realizado').reduce((s, t) => s + Number(t.amount), 0);
  const alerts = data.inventory.filter(i => Number(i.quantity) < Number(i.minimum));
  const pending = data.tasks.filter(t => t.status !== 'Concluída').sort((a, b) => a.date.localeCompare(b.date));
  const totalHarvest = data.harvest.reduce((s, h) => s + Number(h.quantity), 0);
  const area = data.harvest.reduce((s, h) => s + Number(h.area), 0);
  const inventoryValue = data.inventory.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const current = recordModules.find(m => m.id === active);
  const vineyardView = ['water', 'fruit', 'employees', 'payroll', 'reports'].includes(active) || (active === 'harvest' && harvestView === 'vineyard');
  const updateVineyard = updater => setData(previous => ({ ...previous, vineyard: updater(previous.vineyard) }));
  const matches = row => Object.entries(row).filter(([key]) => key !== 'id').some(([, v]) => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  const filtered = current ? data[active].filter(matches).filter(row => filter === 'Todos' || (active === 'inventory' ? (Number(row.quantity) < Number(row.minimum) ? 'Em alerta' : 'Normal') === filter : active === 'transactions' ? row.type === filter : row.status === filter)) : [];
  function record(kind, row) {
    setData(previous => ({ ...previous, [kind]: row.id ? previous[kind].map(existing => existing.id === row.id ? { ...existing, ...row } : existing) : [{ ...row, id: crypto.randomUUID() }, ...previous[kind]], activity: [{ id: crypto.randomUUID(), title: `${row.name} registrado`, meta: recordModules.find(m => m.id === kind).label, date: new Date().toISOString() }, ...previous.activity].slice(0, 30) }));
    setModal(null); setToast('Lançamento salvo com sucesso.');
  }
  function completeTask(id) { setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, status: t.status === 'Concluída' ? 'Pendente' : 'Concluída' } : t) })); setToast('Status da atividade atualizado.'); }
  function remove(kind, id) { setData(d => ({ ...d, [kind]: d[kind].filter(row => row.id !== id) })); setModal(null); setToast('Registro excluído.'); }
  const defaultKind = current?.id || 'transactions';
  const metrics = [
    { value: `${number(vineTotals.tonnes)} t`, text: '18 válvulas · 2 lotes', progress: Math.round(new Set(data.vineyard.entries.filter(e => e.kind === 'harvest' && e.status === 'Realizado').map(e => e.valveId)).size / 18 * 100) },
    { value: `${data.inventory.length} itens`, text: `${alerts.length} itens em alerta`, progress: data.inventory.length ? Math.round((data.inventory.length - alerts.length) / data.inventory.length * 100) : 0 },
    { value: money(vineTotals.water), text: 'Custo realizado de água', progress: 0 },
    { value: `${number(vineTotals.boxes)} caixas`, text: `${money(vineTotals.outstanding)} a receber`, progress: vineTotals.revenue ? Math.round(vineTotals.received / vineTotals.revenue * 100) : 0 },
    { value: '18 válvulas', text: `${money(vineTotals.cost)} em custos realizados`, progress: 0 },
    { value: `${number(vineTotals.hours)} h`, text: 'Horas de trabalho apontadas', progress: 0 },
    { value: `${data.vineyard.employees.length} pessoas`, text: `${data.vineyard.employees.filter(e => e.type === 'Fixo').length} fixos · ${data.vineyard.employees.filter(e => e.type === 'Avulso').length} avulsos`, progress: 0 },
    { value: money(income - expenses), text: 'Saldo de caixa realizado', progress: income ? Math.max(0, Math.round((income - expenses) / income * 100)) : 0 },
  ];
  function Schedule({ all = false }) {
    return <div className="schedule-list">{(all ? pending : pending.slice(0, 3)).map(t => <div className="schedule-row" key={t.id}>
      <div className={`date-block ${t.tone || 'green'}`}><strong>{parseDate(t.date).getDate()}</strong><span>{parseDate(t.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}</span></div>
      <div className="schedule-copy"><strong>{t.name}</strong><span>{t.plot} · {t.crop}</span></div><span className={`status ${t.date < today() ? 'amber' : t.tone || 'green'}`}>{t.date === today() ? 'Hoje' : t.date < today() ? 'Atrasada' : shortDate(t.date)}</span>
      <button className="row-action" onClick={() => completeTask(t.id)} aria-label={`Concluir ${t.name}`} title="Concluir atividade"><Check size={15} /></button>
    </div>)}{!pending.length && <p className="empty">Tudo em dia! Nenhuma atividade pendente.</p>}</div>;
  }
  function FinanceSummary() {
    // Each bar represents actual recorded monthly revenue, including empty months.
    const cashIncome = [...data.transactions.filter(t => t.type === 'Receita' && t.status === 'Realizado'), ...data.vineyard.entries.filter(e => e.kind === 'sale' && e.status === 'Realizado' && e.paymentDate).map(e => ({ date: e.paymentDate, amount: saleValues(e).received }))];
    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 11 + i); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return { label: d.toLocaleDateString('pt-BR', { month: 'short' }), value: cashIncome.filter(t => t.date.startsWith(key)).reduce((s, t) => s + Number(t.amount), 0) }; });
    const maximum = Math.max(...months.map(m => m.value), 1);
    return <section className="panel summary-panel"><div className="panel-title"><div><h2>Resumo Financeiro</h2><p>Receitas dos últimos 12 meses</p></div><button className="text-button" onClick={() => go('transactions')} aria-label="Abrir financeiro"><ArrowRight size={16} /></button></div>
      <div className="balance"><span>Saldo total realizado</span><strong className={income - expenses < 0 ? 'negative' : ''}>{money(income - expenses)}</strong><em>Receitas menos despesas realizadas</em></div>
      <div className="bars" role="img" aria-label="Gráfico de receitas mensais">{months.map((m, i) => <div key={i} className={i === 11 ? 'current' : ''} title={`${m.label}: ${money(m.value)}`}><i style={{ height: `${Math.max(2, m.value / maximum * 100)}%`, opacity: m.value ? 1 : 0.25 }} /><span>{m.label[0].toUpperCase()}</span></div>)}</div>
      <div className="finance-legend"><div><i className="income" /><span>Entradas</span><strong>{money(income)}</strong></div><div><i className="expense" /><span>Saídas</span><strong>{money(expenses)}</strong></div></div></section>;
  }
  return <div className="app-shell">
    {mobile && <button className="scrim" aria-label="Fechar menu" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'open' : ''}`} aria-label="Menu principal">
      <button className="brand" onClick={() => go('home')} aria-label="VR Control — Início"><div className="brand-mark" aria-hidden="true">VR</div><div className="brand-copy"><strong>Control</strong><span>Gestão Rural</span></div></button>
      <p className="nav-label">MENU PRINCIPAL</p><nav>{nav.map(item => <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => go(item.id)} aria-label={item.label} aria-current={active === item.id ? 'page' : undefined}><item.icon size={19} /><span>{item.label}</span>{item.id === 'inventory' && alerts.length > 0 && <i>{alerts.length}</i>}</button>)}</nav>
      <div className="sidebar-bottom"><button className={`nav-item ${active === 'help' ? 'active' : ''}`} onClick={() => go('help')}><CircleHelp size={19} />Central de Ajuda</button><button className={`nav-item ${active === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}><Settings size={19} />Configurações</button>
        <div className="powered-by"><img src={logo} alt="VR Soluciones — Software que facilita tu vida" /></div>
        <div className="profile"><div className="avatar">{data.settings.owner.slice(0, 2).toUpperCase()}</div><div><strong>{data.settings.owner}</strong><span>Administrador</span></div><button onClick={() => go('settings')} aria-label="Editar perfil"><Settings size={15} /></button></div>
      </div>
    </aside>
    <main><header className="topbar"><button className="icon-button menu-button" onClick={() => setMobile(true)} aria-label="Abrir menu"><Menu size={19} /></button><div className="search"><Search size={17} /><input ref={searchRef} aria-label="Buscar em toda a fazenda" placeholder="Buscar em toda a fazenda..." value={query} onChange={e => setQuery(e.target.value)} /><kbd>⌘ K</kbd>{query && <button onClick={() => setQuery('')} aria-label="Limpar busca"><X size={14} /></button>}</div>
      <div className="top-actions"><div className="weather"><MapPin size={18} /><div><strong>{data.settings.farm}</strong><span>{data.settings.location}</span></div></div><button className="icon-button notification" onClick={() => setModal({ type: 'notifications' })} aria-label="Notificações"><Bell size={18} />{alerts.length > 0 && <i />}</button><button className="primary compact" aria-label="Novo lançamento" onClick={() => { if (vineyardView) setVineyardNew(n => n + 1); else setModal({ type: 'record', kind: defaultKind }); }}><Plus size={18} /><span>Novo lançamento</span></button></div></header>
      <div className="page"><div className="demo-notice"><span className="demo-dot" />Ambiente de demonstração · Dados salvos neste navegador</div>{storageError && <p role="alert" className="storage-error">O navegador não permitiu salvar. Os dados desta sessão podem ser perdidos ao sair.</p>}
      {query && !current && !vineyardView ? <><div className="section-heading"><h1>Resultados da Busca</h1><span>{query}</span></div>{recordModules.map(m => <section className="panel search-results" key={m.id}><div className="panel-title"><h2>{m.label}</h2><button className="text-button" onClick={() => { setActive(m.id); setFilter('Todos'); }}>Abrir área <ArrowRight size={14} /></button></div>{data[m.id].filter(matches).map(r => <button key={r.id} className="search-result" onClick={() => { setActive(m.id); setFilter('Todos'); }}>{r.name}<span>{r.date ? shortDate(r.date) : r.category}</span><ArrowRight size={14} /></button>)}{!data[m.id].some(matches) && <p className="empty">Nenhum registro encontrado nesta área.</p>}</section>)}</> : active === 'home' ? <>
        <Weather location={data.settings.weather || PETROLINA} onConfigure={() => setModal({ type: 'weather' })} /><section className="welcome"><div><p className="eyebrow">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</p><h1>{new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, {data.settings.farm}.</h1><p>Aqui está o resumo da sua operação hoje.</p></div><div className="season"><div className="season-icon"><Leaf size={20} /></div><div><span>Safra Atual</span><strong>{data.settings.season}</strong></div><div className="season-bar"><i style={{ width: `${metrics[0].progress}%` }} /></div><b>{metrics[0].progress}%</b></div></section>
        <div className="section-heading"><div><h2>Áreas de Gestão</h2><p>Acesse e acompanhe cada frente da sua operação.</p></div><button className="text-button" onClick={() => go('settings')}><SlidersHorizontal size={13} />Configurar fazenda</button></div>
        <div className="module-grid">{modules.map((m, i) => <button className="module-card" key={m.id} onClick={() => go(m.id)}><div className="module-top"><div className={`module-icon ${m.tone}`}><m.icon size={23} /></div><div className="round-arrow"><ArrowRight size={16} /></div></div><h3>{m.title}</h3><p>{m.description}</p><div className="module-metric"><div><span>{metrics[i].text}</span><strong>{metrics[i].value}</strong></div><div className="donut" style={{ '--progress': `${Math.max(0, Math.min(100, metrics[i].progress)) * 3.6}deg` }}><span>{metrics[i].progress}%</span></div></div></button>)}</div>
        <div className="content-grid"><section className="panel"><div className="panel-title"><div><h2>Próximas Atividades</h2><p>Seu planejamento de campo</p></div><button className="text-button" onClick={() => go('tasks')}>Ver agenda <ArrowRight size={14} /></button></div><Schedule /></section><FinanceSummary /></div>
        <section className="panel activity-panel"><div className="panel-title"><div><h2>Atividade Recente</h2><p>Últimas atualizações da operação</p></div><button className="text-button" onClick={() => setModal({ type: 'activity' })}>Ver todas</button></div><div className="activity-list">{data.activity.slice(0, 3).map((a, i) => <div className="activity-row" key={a.id}><div className="activity-avatar" style={{ background: ['#dcefe3', '#e9e3f5', '#f7e8d5'][i % 3] }}><Sprout size={17} /></div><div><strong>{a.title}</strong><span>{a.meta}</span></div><b className="positive">{a.date ? new Date(a.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Demonstração'}</b></div>)}</div>{!data.activity.length && <p className="empty">Os novos lançamentos aparecerão aqui.</p>}</section>
      </> : vineyardView ? <VineyardWorkspace view={active} model={data.vineyard} onChange={updateVineyard} onLegacy={active === 'harvest' ? () => setHarvestView('legacy') : undefined} newRequest={vineyardNew} onNewConsumed={() => setVineyardNew(0)} globalQuery={query} /> : current ? <>
        <button className="back-button" onClick={() => active === 'harvest' ? setHarvestView('vineyard') : go('home')}><ArrowLeft size={13} /> {active === 'harvest' ? 'Voltar aos Lotes e Válvulas' : 'Voltar à visão geral'}</button><section className="detail-hero"><div className={`module-icon large ${current.tone}`}><current.icon size={27} /></div><div><p className="eyebrow">ÁREAS DE GESTÃO</p><h1>{current.title}</h1><p>{current.description}</p></div><div className="detail-actions"><button className="secondary" disabled={!filtered.length} onClick={() => exportCSV(filtered, `vr-control-${active}.csv`)}><Download size={15} />Exportar CSV</button><button className="primary" onClick={() => setModal({ type: 'record', kind: active })}><Plus size={16} />Novo registro</button></div></section>
        <div className="kpi-grid">{(active === 'harvest' ? [['Produção registrada', `${number(totalHarvest)} t`], ['Área cadastrada', `${number(area)} ha`], ['Produtividade média', `${number(area ? totalHarvest / area : 0)} t/ha`], ['Colheitas concluídas', data.harvest.filter(h => h.status === 'Concluída').length]] : active === 'inventory' ? [['Itens cadastrados', data.inventory.length], ['Valor em estoque', money(inventoryValue)], ['Itens em alerta', alerts.length], ['Categorias', new Set(data.inventory.map(i => i.category)).size]] : active === 'transactions' ? [['Receitas realizadas', money(income)], ['Despesas realizadas', money(expenses)], ['Saldo realizado', money(income - expenses)], ['Lançamentos', data.transactions.length]] : [['Atividades', data.tasks.length], ['Pendentes', pending.length], ['Concluídas', data.tasks.length - pending.length], ['Atrasadas', pending.filter(t => t.date < today()).length]]).map(([label, value]) => <div className="kpi" key={label}><div><current.icon size={18} /></div><span>{label}</span><strong>{value}</strong></div>)}</div>
        {active === 'inventory' && <VineyardWorkspace view="fertilization" model={data.vineyard} onChange={updateVineyard} />}
        {active === 'transactions' && <section className="panel v-finance-connection"><div className="panel-title"><div><h2>Produção de Uvas · Integração por Válvula</h2><p>Somente recebimentos e pagamentos confirmados entram no saldo de caixa acima. O mesmo registro não é lançado duas vezes.</p></div></div><div className="v-kpis"><div className="v-kpi"><span>Custos Apropriados</span><strong>{money(vineTotals.cost)}</strong></div><div className="v-kpi"><span>Pagamentos Confirmados</span><strong>{money(vineTotals.paidCosts)}</strong></div><div className="v-kpi"><span>Vendas a Receber</span><strong>{money(vineTotals.outstanding)}</strong></div><div className="v-kpi"><span>Recebido de Fruta</span><strong>{money(vineTotals.received)}</strong></div></div><div className="v-action-strip"><button className="secondary" onClick={() => go('reports')}>Custos por Válvula</button><button className="secondary" onClick={() => go('fruit')}>Contas a Receber · Fruta</button></div></section>}
        {active === 'tasks' && <FarmCalendar tasks={data.tasks} onAdd={() => setModal({ type: 'record', kind: 'tasks' })} />}
        <section className="panel data-panel"><div className="panel-title"><div><h2>{active === 'tasks' ? 'Todas as Atividades' : 'Registros da Operação'}</h2><p>{filtered.length} registros encontrados</p></div><div className="table-tools"><label className="table-search"><Search size={14} /><input aria-label="Buscar registros" placeholder="Buscar registros..." value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filtrar registros" className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>{(active === 'inventory' ? ['Todos', 'Em alerta', 'Normal'] : active === 'transactions' ? ['Todos', 'Receita', 'Despesa'] : active === 'tasks' ? ['Todos', 'Pendente', 'Concluída'] : ['Todos', 'Planejada', 'Em andamento', 'Concluída']).map(f => <option key={f}>{f}</option>)}</select></div></div>
        <div className="table-wrap"><table><thead><tr>{columns[active].map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td>{active === 'harvest' ? <><td>{row.crop}</td><td>{number(row.area)} ha</td><td>{number(row.quantity)} t</td><td>{shortDate(row.date)}</td><td><span className={`table-status ${row.status !== 'Concluída' ? 'warning' : ''}`}>{row.status}</span></td></> : active === 'inventory' ? <><td>{row.category}</td><td>{number(row.quantity)} {row.unit}</td><td>{number(row.minimum)} {row.unit}</td><td>{money(row.quantity * row.price)}</td><td><span className={`table-status ${Number(row.quantity) < Number(row.minimum) ? 'warning' : ''}`}>{Number(row.quantity) < Number(row.minimum) ? 'Estoque baixo' : 'Estoque normal'}</span></td></> : active === 'transactions' ? <><td>{row.category}</td><td>{row.type}</td><td className={row.type === 'Receita' ? 'positive' : 'negative'}>{row.type === 'Receita' ? '+' : '−'} {money(row.amount)}</td><td>{shortDate(row.date)}</td><td><span className={`table-status ${row.status === 'Pendente' ? 'warning' : ''}`}>{row.status}</span></td></> : <><td>{row.plot}</td><td>{row.crop}</td><td>{shortDate(row.date)}</td><td><span className={`table-status ${row.status !== 'Concluída' ? 'warning' : ''}`}>{row.status}</span></td></>}<td><div className="row-actions"><button className="row-action" aria-label={`Editar ${row.name}`} onClick={() => setModal({ type: 'record', kind: active, row })}><Pencil size={14} /></button>{active === 'tasks' && <button className={`row-action ${row.status === 'Concluída' ? 'positive' : ''}`} aria-label={`${row.status === 'Concluída' ? 'Reabrir' : 'Concluir'} ${row.name}`} onClick={() => completeTask(row.id)}><Check size={15} /></button>}<button className="row-action delete-action" aria-label={`Excluir ${row.name}`} onClick={() => setModal({ type: 'delete', kind: active, row })}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>{!filtered.length && <div className="empty"><Search size={24} /><p>Nenhum registro encontrado.</p><button className="text-button" onClick={() => { setQuery(''); setFilter('Todos'); }}>Limpar filtros</button></div>}<div className="table-footer"><span>{filtered.length} de {data[active].length} registros</span><span>Safra {data.settings.season}</span></div></section>
      </> : active === 'settings' ? <><PageTitle title="Configurações" description="Personalize as informações da sua fazenda." /><SettingsForm settings={data.settings} onSave={settings => { setData(d => ({ ...d, settings: { ...d.settings, ...settings } })); setToast('Configurações salvas.'); }} /><section className="panel brand-panel"><h2>Uma solução VR Soluciones</h2><img src={logo} alt="VR Soluciones — Software que facilita tu vida" /><p>VR Control — Gestão Rural · Versão 0.2.0</p></section></> : <><PageTitle title="Central de Ajuda" description="Tudo o que você precisa para começar." /><section className="panel help-panel">{[['Como cadastrar um lançamento?', 'Use “Novo lançamento” no topo da página. Escolha entre colheita, insumos, financeiro e agenda, preencha os campos e salve.'], ['Onde meus dados ficam salvos?', 'Esta primeira versão armazena os dados apenas neste navegador. Não há sincronização entre dispositivos, login ou servidor de dados. Limpar os dados do navegador apaga seus registros. Exporte os CSVs para manter uma cópia.'], ['Como acompanhar o estoque?', 'Em Insumos e Estoque, cadastre a quantidade e o estoque mínimo. O painel destaca os itens que estão abaixo desse limite.'], ['Como concluir uma atividade?', 'Acesse a Agenda Agrícola e clique no botão de confirmação da atividade. Você pode reabri-la clicando novamente.'], ['Como exportar meus registros?', 'Nas áreas de estoque e financeiro, use Exportar CSV. Em Relatórios por Lote e Válvula, use Exportar Backup para salvar os registros em JSON. Os arquivos anexados devem ser baixados separadamente.']].map(([title, text]) => <details key={title}><summary>{title}</summary><p>{text}</p></details>)}</section></>}
      <footer className="page-footer"><span>VR Control · Gestão Rural</span><span><ShieldCheck size={12} />Dados locais · Versão de demonstração</span></footer></div>
    </main>
    {toast && <div className="toast" role="status"><Check size={17} />{toast}<button aria-label="Dispensar mensagem" onClick={() => setToast('')}><X size={15} /></button></div>}
    {modal?.type === 'weather' && <WeatherSettings location={data.settings.weather || PETROLINA} onClose={() => setModal(null)} onSave={weather => { setData(d => ({ ...d, settings: { ...d.settings, weather, location: weather.label } })); setModal(null); setToast('Localização da previsão atualizada.'); }} />}
    {modal?.type === 'record' && <RecordForm kind={modal.kind} initialRow={modal.row} onClose={() => setModal(null)} onSave={record} />}
    {modal?.type === 'delete' && <Modal title="Excluir registro?" onClose={() => setModal(null)}><p className="modal-description">O registro “{modal.row.name}” será removido. Essa ação não pode ser desfeita.</p><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary danger" onClick={() => remove(modal.kind, modal.row.id)}>Excluir registro</button></div></Modal>}
    {modal?.type === 'notifications' && <Modal title="Notificações" onClose={() => setModal(null)}>{alerts.map(i => <div className="notice-item" key={i.id}><Package size={18} /><div><strong>{i.name}</strong><p>Estoque baixo: {number(i.quantity)} {i.unit}. Mínimo: {number(i.minimum)} {i.unit}.</p></div></div>)}{!alerts.length && <p className="empty">Nenhum alerta de estoque.</p>}<div className="modal-actions"><button className="primary" onClick={() => { setModal(null); go('inventory'); }}>Ver estoque</button></div></Modal>}
    {modal?.type === 'activity' && <Modal title="Atividade Recente" onClose={() => setModal(null)}>{data.activity.length ? data.activity.map(a => <div className="notice-item" key={a.id}><Leaf size={18} /><div><strong>{a.title}</strong><p>{a.meta} · {new Date(a.date).toLocaleString('pt-BR')}</p></div></div>) : <p className="empty">Seus novos lançamentos aparecerão aqui.</p>}</Modal>}
  </div>;
}
function PageTitle({ title, description }) { return <section className="welcome"><div><p className="eyebrow">VR CONTROL · GESTÃO RURAL</p><h1>{title}</h1><p>{description}</p></div></section>; }
function WeatherSettings({ location, onSave, onClose }) {
  const [values, setValues] = useState(location);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function locate() {
    setError('');
    if (!navigator.geolocation) { setError('Geolocalização indisponível. Informe as coordenadas.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(position => {
      setValues({ latitude: position.coords.latitude, longitude: position.coords.longitude, label: 'Localização do Dispositivo', timezone: 'auto' }); setBusy(false);
    }, () => { setError('Não foi possível obter a localização. Você pode informar as coordenadas manualmente.'); setBusy(false); }, { timeout: 10000 });
  }
  return <Modal title="Localização da Previsão" onClose={onClose}><form onSubmit={e => { e.preventDefault(); if (!values.label.trim()) return; onSave({ ...values, label: values.label.trim(), latitude: Number(values.latitude), longitude: Number(values.longitude) }); }}><p className="v-muted">Configurado para Petrolina, Pernambuco, Brasil. A previsão representa estas coordenadas, não uma estação meteorológica dentro da fazenda.</p><label>Nome da Localização<input aria-label="Nome da Localização" value={values.label} required maxLength={80} onChange={e => setValues(v => ({ ...v, label: e.target.value }))} /></label><div className="form-row"><label>Latitude<input aria-label="Latitude" type="number" min="-90" max="90" step="any" value={values.latitude} required onChange={e => setValues(v => ({ ...v, latitude: e.target.value }))} /></label><label>Longitude<input aria-label="Longitude" type="number" min="-180" max="180" step="any" value={values.longitude} required onChange={e => setValues(v => ({ ...v, longitude: e.target.value }))} /></label></div><button className="secondary" type="button" disabled={busy} onClick={locate}>{busy ? 'Obtendo Localização…' : 'Usar Localização do Dispositivo'}</button>{error && <p className="negative" role="alert">{error}</p>}<div className="modal-actions"><button className="secondary" type="button" onClick={onClose}>Cancelar</button><button className="primary" type="submit">Salvar Localização</button></div></form></Modal>;
}
function SettingsForm({ settings, onSave }) {
  return <section className="panel settings-panel"><h2>Informações da Fazenda</h2><form onSubmit={e => { e.preventDefault(); onSave(Object.fromEntries(new FormData(e.currentTarget))); }}><label>Nome da fazenda<input name="farm" required maxLength={60} defaultValue={settings.farm} /></label><div className="form-row"><label>Seu nome<input name="owner" required maxLength={40} defaultValue={settings.owner} /></label><label>Cidade e estado<input name="location" required maxLength={60} defaultValue={settings.location} /></label></div><label>Safra Atual<input name="season" required maxLength={20} defaultValue={settings.season} /></label><div className="modal-actions"><button className="primary" type="submit"><Check size={16} />Salvar configurações</button></div></form></section>;
}
function RecordForm({ kind, initialRow = {}, onClose, onSave }) {
  const [selected, setSelected] = useState(kind);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [saving, setSaving] = useState(false);
  const input = (name, label, type = 'text', options = {}) => <label>{label}<input name={name} type={type} required {...(type === 'number' ? { min: 0, max: 1e12, step: 'any' } : { maxLength: 120 })} {...options} defaultValue={initialRow[name] ?? options.defaultValue} /></label>;
  const select = (name, label, values) => <label>{label}<select name={name} aria-label={label} required defaultValue={initialRow[name]}>{values.map(value => <option key={value}>{value}</option>)}</select></label>;
  async function submit(e) {
    e.preventDefault(); const row = { ...initialRow, ...Object.fromEntries(new FormData(e.currentTarget)) };
    for (const key of ['quantity', 'area', 'price', 'minimum', 'amount']) if (key in row) row[key] = Number(row[key]);
    for (const key of ['name', 'plot', 'crop']) if (key in row) { row[key] = row[key].trim(); if (!row[key]) { setError('Preencha os campos sem usar apenas espaços.'); return; } }
    if (selected === 'tasks') row.tone = 'green';
    if (attachment) { setSaving(true); try { row.invoiceDocument = await saveDocument(attachment); } catch (error) { setError(error.message); setSaving(false); return; } }
    onSave(selected, row);
  }
  return <Modal title={initialRow.id ? 'Editar Registro' : 'Novo lançamento'} onClose={onClose}><label className="area-select">Área de Gestão<select aria-label="Área de Gestão" disabled={!!initialRow.id} value={selected} onChange={e => { setSelected(e.target.value); setError(''); }}>{recordModules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label><form key={selected} onSubmit={submit}>
    {input('name', selected === 'harvest' ? 'Nome do talhão' : selected === 'inventory' ? 'Nome do insumo' : selected === 'tasks' ? 'Nome da atividade' : 'Descrição')}
    {selected === 'harvest' && <><div className="form-row">{input('crop', 'Cultura')}{input('area', 'Área (ha)', 'number', { min: 0.01 })}</div><div className="form-row">{input('quantity', 'Produção (t)', 'number')}{input('date', 'Data', 'date', { defaultValue: today() })}</div>{select('status', 'Status', ['Planejada', 'Em andamento', 'Concluída'])}</>}
    {selected === 'inventory' && <>{select('category', 'Categoria', ['Fertilizantes', 'Defensivos', 'Sementes', 'Equipamentos', 'Embalagens', 'Outros'])}<div className="form-row">{input('quantity', 'Quantidade', 'number')}{select('unit', 'Unidade', ['kg', 'L', 'sc', 'un'])}</div><div className="form-row">{input('minimum', 'Estoque mínimo', 'number')}{input('price', 'Preço unitário (R$)', 'number', { step: '0.01' })}</div><label>Fornecedor<input name="supplier" maxLength={120} defaultValue={initialRow.supplier} /></label><label>Número da Nota Fiscal<input name="invoice" maxLength={80} defaultValue={initialRow.invoice} /></label><label>Data da Compra<input type="date" name="purchaseDate" defaultValue={initialRow.purchaseDate || today()} /></label><label>Anexar Nota Fiscal<input aria-label="Anexar Nota Fiscal" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e => setAttachment(e.target.files[0] || null)} /></label><p className="v-muted">PDF ou imagem de até 5 MB, salvo apenas neste navegador. A quantidade é o saldo cadastrado e deve ser ajustada manualmente.</p>{initialRow.invoiceDocument && <button type="button" className="text-button" onClick={() => openDocument(initialRow.invoiceDocument).catch(error => setError(error.message))}>Baixar {initialRow.invoiceDocument.name}</button>}</>}
    {selected === 'transactions' && <><div className="form-row">{select('type', 'Tipo', ['Receita', 'Despesa'])}{input('amount', 'Valor (R$)', 'number', { min: 0.01, step: '0.01' })}</div>{select('category', 'Categoria', ['Produção', 'Insumos', 'Manutenção', 'Pessoal', 'Custo Fixo', 'Folha de Pagamento', 'Combustível', 'Energia', 'Água', 'Impostos', 'Serviços', 'Outros'])}<div className="form-row">{input('date', 'Data', 'date', { defaultValue: today() })}{select('status', 'Status', ['Realizado', 'Pendente'])}</div></>}
    {selected === 'tasks' && <><div className="form-row">{input('plot', 'Talhão')}{input('crop', 'Cultura')}</div>{input('date', 'Data prevista', 'date', { defaultValue: today() })}{select('status', 'Status', ['Pendente', 'Concluída'])}</>}
    {error && <p role="alert" className="negative">{error}</p>}<div className="modal-actions"><button className="secondary" type="button" onClick={onClose}>Cancelar</button><button className="primary" type="submit" disabled={saving}><Check size={16} />{saving ? 'Salvando Anexo…' : 'Salvar lançamento'}</button></div></form></Modal>;
}
function FarmCalendar({ tasks, onAdd }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = month.getDay();
  return <section className="panel harvest-calendar"><div className="panel-title"><div><h2>Calendário Agrícola</h2><p>Atividades e planejamento de campo</p></div><button className="text-button" onClick={onAdd}><Plus size={15} />Nova atividade</button></div><div className="calendar-main"><div className="calendar-toolbar"><strong>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong><div><button aria-label="Mês anterior" onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><ChevronLeft size={15} /></button><button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Hoje</button><button aria-label="Próximo mês" onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><ChevronRight size={15} /></button></div></div><div className="calendar-grid calendar-weekdays">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <span key={d}>{d}</span>)}</div><div className="calendar-grid calendar-days">{Array.from({ length: Math.ceil((days + offset) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1; if (day < 1 || day > days) return <div className="empty" key={i} />;
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return <div key={i} className={key === today() ? 'today' : ''}><span className="day-number">{day}</span>{tasks.filter(t => t.date === key).map(t => <div key={t.id} className={`calendar-event ${t.tone || 'green'}`} title={`${t.name} · ${t.plot} · ${t.status}`}><strong>{t.status === 'Concluída' ? '✓ ' : ''}{t.name}</strong><span>{t.plot}</span></div>)}</div>;
  })}</div></div></section>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
