import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutGrid, Leaf, Package, Wallet, CalendarDays, ChartNoAxesCombined, CircleHelp, Settings, Search, Plus, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Bell, Menu, X, Download, Check, Trash2, Sprout, MapPin, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import logo from '../logos/Logo2.png';
import { initialData, today, money, number, parseDate, shortDate } from './data';
import './styles.css';

const STORAGE = 'vr-control-v1';
const modules = [
  { id: 'harvest', label: 'Colheita', title: 'Planilha de Colheita', description: 'Acompanhe safras, produtividade e rendimento por talhão.', icon: Leaf, tone: 'green' },
  { id: 'inventory', label: 'Insumos e Estoque', title: 'Planilha de Insumos', description: 'Controle estoque, consumo, fornecedores e reposições.', icon: Package, tone: 'amber' },
  { id: 'transactions', label: 'Financeiro', title: 'Fluxo Financeiro', description: 'Visualize receitas, despesas e projeções da operação.', icon: Wallet, tone: 'blue' },
  { id: 'tasks', label: 'Agenda Agrícola', title: 'Agenda Agrícola', description: 'Organize adubação, plantio, manejo e equipe de campo.', icon: CalendarDays, tone: 'purple' },
];
const nav = [{ id: 'home', label: 'Visão Geral', icon: LayoutGrid }, ...modules, { id: 'reports', label: 'Relatórios', icon: ChartNoAxesCombined }];
const columns = {
  harvest: ['Talhão', 'Cultura', 'Área', 'Produção', 'Data', 'Status', 'Ações'],
  inventory: ['Insumo', 'Categoria', 'Estoque', 'Mínimo', 'Valor Total', 'Status', 'Ações'],
  transactions: ['Descrição', 'Categoria', 'Tipo', 'Valor', 'Data', 'Status', 'Ações'],
  tasks: ['Atividade', 'Talhão', 'Cultura', 'Data', 'Status', 'Ações'],
};
function readData() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE));
    if (data && ['harvest', 'inventory', 'transactions', 'tasks', 'activity'].every(k => Array.isArray(data[k])) && data.settings) return data;
  } catch { /* Fall back to demonstration data if storage is unavailable or corrupt. */ }
  return structuredClone(initialData);
}
function exportCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]).filter(k => k !== 'id' && k !== 'tone');
  const escape = value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
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
  const income = data.transactions.filter(t => t.type === 'Receita' && t.status === 'Realizado').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = data.transactions.filter(t => t.type === 'Despesa' && t.status === 'Realizado').reduce((s, t) => s + Number(t.amount), 0);
  const alerts = data.inventory.filter(i => Number(i.quantity) < Number(i.minimum));
  const pending = data.tasks.filter(t => t.status !== 'Concluída').sort((a, b) => a.date.localeCompare(b.date));
  const totalHarvest = data.harvest.reduce((s, h) => s + Number(h.quantity), 0);
  const area = data.harvest.reduce((s, h) => s + Number(h.area), 0);
  const inventoryValue = data.inventory.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const current = modules.find(m => m.id === active);
  const matches = row => Object.entries(row).filter(([key]) => key !== 'id').some(([, v]) => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  const filtered = current ? data[active].filter(matches).filter(row => filter === 'Todos' || (active === 'inventory' ? (Number(row.quantity) < Number(row.minimum) ? 'Em alerta' : 'Normal') === filter : active === 'transactions' ? row.type === filter : row.status === filter)) : [];
  function record(kind, row) {
    setData(previous => ({ ...previous, [kind]: [{ ...row, id: crypto.randomUUID() }, ...previous[kind]], activity: [{ id: crypto.randomUUID(), title: `${row.name} registrado`, meta: modules.find(m => m.id === kind).label, date: new Date().toISOString() }, ...previous.activity].slice(0, 30) }));
    setModal(null); setToast('Lançamento salvo com sucesso.');
  }
  function completeTask(id) { setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, status: t.status === 'Concluída' ? 'Pendente' : 'Concluída' } : t) })); setToast('Status da atividade atualizado.'); }
  function remove(kind, id) { setData(d => ({ ...d, [kind]: d[kind].filter(row => row.id !== id) })); setModal(null); setToast('Registro excluído.'); }
  const defaultKind = current?.id || 'transactions';
  const metrics = [
    { value: `${number(totalHarvest)} t`, text: `${data.harvest.length} registros de colheita`, progress: data.harvest.length ? Math.round(data.harvest.filter(h => h.status === 'Concluída').length / data.harvest.length * 100) : 0 },
    { value: `${data.inventory.length} itens`, text: `${alerts.length} itens em alerta`, progress: data.inventory.length ? Math.round((data.inventory.length - alerts.length) / data.inventory.length * 100) : 0 },
    { value: money(income), text: 'Receitas realizadas', progress: income ? Math.round((income - expenses) / income * 100) : 0 },
    { value: `${data.tasks.length} atividades`, text: `${pending.length} tarefas pendentes`, progress: data.tasks.length ? Math.round((data.tasks.length - pending.length) / data.tasks.length * 100) : 0 },
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
    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 11 + i); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return { label: d.toLocaleDateString('pt-BR', { month: 'short' }), value: data.transactions.filter(t => t.type === 'Receita' && t.status === 'Realizado' && t.date.startsWith(key)).reduce((s, t) => s + Number(t.amount), 0) }; });
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
      <div className="top-actions"><div className="weather"><MapPin size={18} /><div><strong>{data.settings.farm}</strong><span>{data.settings.location}</span></div></div><button className="icon-button notification" onClick={() => setModal({ type: 'notifications' })} aria-label="Notificações"><Bell size={18} />{alerts.length > 0 && <i />}</button><button className="primary compact" aria-label="Novo lançamento" onClick={() => setModal({ type: 'record', kind: defaultKind })}><Plus size={18} /><span>Novo lançamento</span></button></div></header>
      <div className="page"><div className="demo-notice"><span className="demo-dot" />Ambiente de demonstração · Dados salvos neste navegador</div>{storageError && <p role="alert" className="storage-error">O navegador não permitiu salvar. Os dados desta sessão podem ser perdidos ao sair.</p>}
      {query && !current ? <><div className="section-heading"><h1>Resultados da Busca</h1><span>{query}</span></div>{modules.map(m => <section className="panel search-results" key={m.id}><div className="panel-title"><h2>{m.label}</h2><button className="text-button" onClick={() => { setActive(m.id); setFilter('Todos'); }}>Abrir área <ArrowRight size={14} /></button></div>{data[m.id].filter(matches).map(r => <button key={r.id} className="search-result" onClick={() => { setActive(m.id); setFilter('Todos'); }}>{r.name}<span>{r.date ? shortDate(r.date) : r.category}</span><ArrowRight size={14} /></button>)}{!data[m.id].some(matches) && <p className="empty">Nenhum registro encontrado nesta área.</p>}</section>)}</> : active === 'home' ? <>
        <section className="welcome"><div><p className="eyebrow">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</p><h1>{new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, {data.settings.farm}.</h1><p>Aqui está o resumo da sua operação hoje.</p></div><div className="season"><div className="season-icon"><Leaf size={20} /></div><div><span>Safra Atual</span><strong>{data.settings.season}</strong></div><div className="season-bar"><i style={{ width: `${metrics[0].progress}%` }} /></div><b>{metrics[0].progress}%</b></div></section>
        <div className="section-heading"><div><h2>Áreas de Gestão</h2><p>Acesse e acompanhe cada frente da sua operação.</p></div><button className="text-button" onClick={() => go('settings')}><SlidersHorizontal size={13} />Configurar fazenda</button></div>
        <div className="module-grid">{modules.map((m, i) => <button className="module-card" key={m.id} onClick={() => go(m.id)}><div className="module-top"><div className={`module-icon ${m.tone}`}><m.icon size={23} /></div><div className="round-arrow"><ArrowRight size={16} /></div></div><h3>{m.title}</h3><p>{m.description}</p><div className="module-metric"><div><span>{metrics[i].text}</span><strong>{metrics[i].value}</strong></div><div className="donut" style={{ '--progress': `${Math.max(0, Math.min(100, metrics[i].progress)) * 3.6}deg` }}><span>{metrics[i].progress}%</span></div></div></button>)}</div>
        <div className="content-grid"><section className="panel"><div className="panel-title"><div><h2>Próximas Atividades</h2><p>Seu planejamento de campo</p></div><button className="text-button" onClick={() => go('tasks')}>Ver agenda <ArrowRight size={14} /></button></div><Schedule /></section><FinanceSummary /></div>
        <section className="panel activity-panel"><div className="panel-title"><div><h2>Atividade Recente</h2><p>Últimas atualizações da operação</p></div><button className="text-button" onClick={() => setModal({ type: 'activity' })}>Ver todas</button></div><div className="activity-list">{(data.activity.length ? data.activity : [{ id: 'a1', title: 'Colheita de milho registrada', meta: 'Talhão 04 · 142,8 toneladas' }, { id: 'a2', title: 'Estoque de insumos atualizado', meta: 'Fertilizante NPK · 2.450 kg' }, { id: 'a3', title: 'Venda de café registrada', meta: 'Financeiro · Receita realizada' }]).slice(0, 3).map((a, i) => <div className="activity-row" key={a.id}><div className="activity-avatar" style={{ background: ['#dcefe3', '#e9e3f5', '#f7e8d5'][i % 3] }}><Sprout size={17} /></div><div><strong>{a.title}</strong><span>{a.meta}</span></div><b className="positive">{a.date ? new Date(a.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Demonstração'}</b></div>)}</div></section>
      </> : current ? <>
        <button className="back-button" onClick={() => go('home')}><ArrowLeft size={13} /> Voltar à visão geral</button><section className="detail-hero"><div className={`module-icon large ${current.tone}`}><current.icon size={27} /></div><div><p className="eyebrow">ÁREAS DE GESTÃO</p><h1>{current.title}</h1><p>{current.description}</p></div><div className="detail-actions"><button className="secondary" disabled={!filtered.length} onClick={() => exportCSV(filtered, `vr-control-${active}.csv`)}><Download size={15} />Exportar CSV</button><button className="primary" onClick={() => setModal({ type: 'record', kind: active })}><Plus size={16} />Novo registro</button></div></section>
        <div className="kpi-grid">{(active === 'harvest' ? [['Produção registrada', `${number(totalHarvest)} t`], ['Área cadastrada', `${number(area)} ha`], ['Produtividade média', `${number(area ? totalHarvest / area : 0)} t/ha`], ['Colheitas concluídas', data.harvest.filter(h => h.status === 'Concluída').length]] : active === 'inventory' ? [['Itens cadastrados', data.inventory.length], ['Valor em estoque', money(inventoryValue)], ['Itens em alerta', alerts.length], ['Categorias', new Set(data.inventory.map(i => i.category)).size]] : active === 'transactions' ? [['Receitas realizadas', money(income)], ['Despesas realizadas', money(expenses)], ['Saldo realizado', money(income - expenses)], ['Lançamentos', data.transactions.length]] : [['Atividades', data.tasks.length], ['Pendentes', pending.length], ['Concluídas', data.tasks.length - pending.length], ['Atrasadas', pending.filter(t => t.date < today()).length]]).map(([label, value]) => <div className="kpi" key={label}><div><current.icon size={18} /></div><span>{label}</span><strong>{value}</strong></div>)}</div>
        {active === 'tasks' && <FarmCalendar tasks={data.tasks} onAdd={() => setModal({ type: 'record', kind: 'tasks' })} />}
        <section className="panel data-panel"><div className="panel-title"><div><h2>{active === 'tasks' ? 'Todas as Atividades' : 'Registros da Operação'}</h2><p>{filtered.length} registros encontrados</p></div><div className="table-tools"><label className="table-search"><Search size={14} /><input aria-label="Buscar registros" placeholder="Buscar registros..." value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filtrar registros" className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>{(active === 'inventory' ? ['Todos', 'Em alerta', 'Normal'] : active === 'transactions' ? ['Todos', 'Receita', 'Despesa'] : active === 'tasks' ? ['Todos', 'Pendente', 'Concluída'] : ['Todos', 'Planejada', 'Em andamento', 'Concluída']).map(f => <option key={f}>{f}</option>)}</select></div></div>
        <div className="table-wrap"><table><thead><tr>{columns[active].map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td>{active === 'harvest' ? <><td>{row.crop}</td><td>{number(row.area)} ha</td><td>{number(row.quantity)} t</td><td>{shortDate(row.date)}</td><td><span className={`table-status ${row.status !== 'Concluída' ? 'warning' : ''}`}>{row.status}</span></td></> : active === 'inventory' ? <><td>{row.category}</td><td>{number(row.quantity)} {row.unit}</td><td>{number(row.minimum)} {row.unit}</td><td>{money(row.quantity * row.price)}</td><td><span className={`table-status ${Number(row.quantity) < Number(row.minimum) ? 'warning' : ''}`}>{Number(row.quantity) < Number(row.minimum) ? 'Estoque baixo' : 'Estoque normal'}</span></td></> : active === 'transactions' ? <><td>{row.category}</td><td>{row.type}</td><td className={row.type === 'Receita' ? 'positive' : 'negative'}>{row.type === 'Receita' ? '+' : '−'} {money(row.amount)}</td><td>{shortDate(row.date)}</td><td><span className={`table-status ${row.status === 'Pendente' ? 'warning' : ''}`}>{row.status}</span></td></> : <><td>{row.plot}</td><td>{row.crop}</td><td>{shortDate(row.date)}</td><td><span className={`table-status ${row.status !== 'Concluída' ? 'warning' : ''}`}>{row.status}</span></td></>}<td><div className="row-actions">{active === 'tasks' && <button className={`row-action ${row.status === 'Concluída' ? 'positive' : ''}`} aria-label={`${row.status === 'Concluída' ? 'Reabrir' : 'Concluir'} ${row.name}`} onClick={() => completeTask(row.id)}><Check size={15} /></button>}<button className="row-action delete-action" aria-label={`Excluir ${row.name}`} onClick={() => setModal({ type: 'delete', kind: active, row })}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>{!filtered.length && <div className="empty"><Search size={24} /><p>Nenhum registro encontrado.</p><button className="text-button" onClick={() => { setQuery(''); setFilter('Todos'); }}>Limpar filtros</button></div>}<div className="table-footer"><span>{filtered.length} de {data[active].length} registros</span><span>Safra {data.settings.season}</span></div></section>
      </> : active === 'reports' ? <><PageTitle title="Relatórios da Operação" description="Uma visão consolidada dos dados da sua fazenda." /><div className="content-grid reports-grid"><FinanceSummary /><section className="panel"><div className="panel-title"><div><h2>Indicadores da Safra</h2><p>{data.settings.season}</p></div><Leaf size={20} /></div><div className="report-totals"><div><span>Produção registrada</span><strong>{number(totalHarvest)} t</strong></div><div><span>Área cadastrada</span><strong>{number(area)} ha</strong></div><div><span>Valor em estoque</span><strong>{money(inventoryValue)}</strong></div><div><span>Atividades concluídas</span><strong>{data.tasks.length - pending.length} de {data.tasks.length}</strong></div></div></section></div><section className="panel search-results"><div className="panel-title"><div><h2>Exportar Dados</h2><p>Baixe os registros em CSV para abrir em sua planilha.</p></div></div>{modules.map(m => <div className="export-row" key={m.id}><m.icon size={18} /><strong>{m.label}</strong><span>{data[m.id].length} registros</span><button className="secondary" disabled={!data[m.id].length} onClick={() => exportCSV(data[m.id], `vr-control-${m.id}.csv`)}><Download size={15} />Baixar CSV</button></div>)}</section></> : active === 'settings' ? <><PageTitle title="Configurações" description="Personalize as informações da sua fazenda." /><SettingsForm settings={data.settings} onSave={settings => { setData(d => ({ ...d, settings })); setToast('Configurações salvas.'); }} /><section className="panel brand-panel"><h2>Uma solução VR Soluciones</h2><img src={logo} alt="VR Soluciones — Software que facilita tu vida" /><p>VR Control — Gestão Rural · Versão 0.1.0</p></section></> : <><PageTitle title="Central de Ajuda" description="Tudo o que você precisa para começar." /><section className="panel help-panel">{[['Como cadastrar um lançamento?', 'Use “Novo lançamento” no topo da página. Escolha entre colheita, insumos, financeiro e agenda, preencha os campos e salve.'], ['Onde meus dados ficam salvos?', 'Esta primeira versão armazena os dados apenas neste navegador. Não há sincronização entre dispositivos, login ou servidor de dados. Limpar os dados do navegador apaga seus registros. Exporte os CSVs para manter uma cópia.'], ['Como acompanhar o estoque?', 'Em Insumos e Estoque, cadastre a quantidade e o estoque mínimo. O painel destaca os itens que estão abaixo desse limite.'], ['Como concluir uma atividade?', 'Acesse a Agenda Agrícola e clique no botão de confirmação da atividade. Você pode reabri-la clicando novamente.'], ['Como exportar meus registros?', 'Abra Relatórios ou uma área de gestão e clique em Exportar CSV. Os filtros da área são respeitados na exportação.']].map(([title, text]) => <details key={title}><summary>{title}</summary><p>{text}</p></details>)}</section></>}
      <footer className="page-footer"><span>VR Control · Gestão Rural</span><span><ShieldCheck size={12} />Dados locais · Versão de demonstração</span></footer></div>
    </main>
    {toast && <div className="toast" role="status"><Check size={17} />{toast}<button aria-label="Dispensar mensagem" onClick={() => setToast('')}><X size={15} /></button></div>}
    {modal?.type === 'record' && <RecordForm kind={modal.kind} onClose={() => setModal(null)} onSave={record} />}
    {modal?.type === 'delete' && <Modal title="Excluir registro?" onClose={() => setModal(null)}><p className="modal-description">O registro “{modal.row.name}” será removido. Essa ação não pode ser desfeita.</p><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary danger" onClick={() => remove(modal.kind, modal.row.id)}>Excluir registro</button></div></Modal>}
    {modal?.type === 'notifications' && <Modal title="Notificações" onClose={() => setModal(null)}>{alerts.map(i => <div className="notice-item" key={i.id}><Package size={18} /><div><strong>{i.name}</strong><p>Estoque baixo: {number(i.quantity)} {i.unit}. Mínimo: {number(i.minimum)} {i.unit}.</p></div></div>)}{!alerts.length && <p className="empty">Nenhum alerta de estoque.</p>}<div className="modal-actions"><button className="primary" onClick={() => { setModal(null); go('inventory'); }}>Ver estoque</button></div></Modal>}
    {modal?.type === 'activity' && <Modal title="Atividade Recente" onClose={() => setModal(null)}>{data.activity.length ? data.activity.map(a => <div className="notice-item" key={a.id}><Leaf size={18} /><div><strong>{a.title}</strong><p>{a.meta} · {new Date(a.date).toLocaleString('pt-BR')}</p></div></div>) : <p className="empty">Seus novos lançamentos aparecerão aqui.</p>}</Modal>}
  </div>;
}
function PageTitle({ title, description }) { return <section className="welcome"><div><p className="eyebrow">VR CONTROL · GESTÃO RURAL</p><h1>{title}</h1><p>{description}</p></div></section>; }
function SettingsForm({ settings, onSave }) {
  return <section className="panel settings-panel"><h2>Informações da Fazenda</h2><form onSubmit={e => { e.preventDefault(); onSave(Object.fromEntries(new FormData(e.currentTarget))); }}><label>Nome da fazenda<input name="farm" required maxLength={60} defaultValue={settings.farm} /></label><div className="form-row"><label>Seu nome<input name="owner" required maxLength={40} defaultValue={settings.owner} /></label><label>Cidade e estado<input name="location" required maxLength={60} defaultValue={settings.location} /></label></div><label>Safra Atual<input name="season" required maxLength={20} defaultValue={settings.season} /></label><div className="modal-actions"><button className="primary" type="submit"><Check size={16} />Salvar configurações</button></div></form></section>;
}
function RecordForm({ kind, onClose, onSave }) {
  const [selected, setSelected] = useState(kind);
  const [error, setError] = useState('');
  const input = (name, label, type = 'text', options = {}) => <label>{label}<input name={name} type={type} required {...(type === 'number' ? { min: 0, max: 1e12, step: 'any' } : { maxLength: 120 })} {...options} /></label>;
  const select = (name, label, values) => <label>{label}<select name={name} aria-label={label} required>{values.map(value => <option key={value}>{value}</option>)}</select></label>;
  function submit(e) {
    e.preventDefault(); const row = Object.fromEntries(new FormData(e.currentTarget));
    for (const key of ['quantity', 'area', 'price', 'minimum', 'amount']) if (key in row) row[key] = Number(row[key]);
    for (const key of ['name', 'plot', 'crop']) if (key in row) { row[key] = row[key].trim(); if (!row[key]) { setError('Preencha os campos sem usar apenas espaços.'); return; } }
    if (selected === 'tasks') row.tone = 'green';
    onSave(selected, row);
  }
  return <Modal title="Novo lançamento" onClose={onClose}><label className="area-select">Área de Gestão<select aria-label="Área de Gestão" value={selected} onChange={e => { setSelected(e.target.value); setError(''); }}>{modules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label><form key={selected} onSubmit={submit}>
    {input('name', selected === 'harvest' ? 'Nome do talhão' : selected === 'inventory' ? 'Nome do insumo' : selected === 'tasks' ? 'Nome da atividade' : 'Descrição')}
    {selected === 'harvest' && <><div className="form-row">{input('crop', 'Cultura')}{input('area', 'Área (ha)', 'number', { min: 0.01 })}</div><div className="form-row">{input('quantity', 'Produção (t)', 'number')}{input('date', 'Data', 'date', { defaultValue: today() })}</div>{select('status', 'Status', ['Planejada', 'Em andamento', 'Concluída'])}</>}
    {selected === 'inventory' && <>{select('category', 'Categoria', ['Fertilizantes', 'Defensivos', 'Sementes', 'Equipamentos', 'Outros'])}<div className="form-row">{input('quantity', 'Quantidade', 'number')}{select('unit', 'Unidade', ['kg', 'L', 'sc', 'un'])}</div><div className="form-row">{input('minimum', 'Estoque mínimo', 'number')}{input('price', 'Preço unitário (R$)', 'number', { step: '0.01' })}</div></>}
    {selected === 'transactions' && <><div className="form-row">{select('type', 'Tipo', ['Receita', 'Despesa'])}{input('amount', 'Valor (R$)', 'number', { min: 0.01, step: '0.01' })}</div>{select('category', 'Categoria', ['Produção', 'Insumos', 'Manutenção', 'Pessoal', 'Outros'])}<div className="form-row">{input('date', 'Data', 'date', { defaultValue: today() })}{select('status', 'Status', ['Realizado', 'Pendente'])}</div></>}
    {selected === 'tasks' && <><div className="form-row">{input('plot', 'Talhão')}{input('crop', 'Cultura')}</div>{input('date', 'Data prevista', 'date', { defaultValue: today() })}{select('status', 'Status', ['Pendente', 'Concluída'])}</>}
    {error && <p role="alert" className="negative">{error}</p>}<div className="modal-actions"><button className="secondary" type="button" onClick={onClose}>Cancelar</button><button className="primary" type="submit"><Check size={16} />Salvar lançamento</button></div></form></Modal>;
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
