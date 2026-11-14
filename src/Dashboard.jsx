import React, { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Settings2, CloudRain, Wallet, CalendarDays, Check } from 'lucide-react';
import Weather, { PETROLINA } from './Weather';
import RainHistory from './RainHistory';
import { Dialog } from './VineyardWorkspace';
import { RecentActivity } from './ManagementUI';
import { cropCycle, financialAlerts, localDate, varietyColors, valveName } from './vineyard';
import { money, number, shortDate } from './data';

export default function Dashboard({ model, settings, modules, cardMetrics, onSettings, onGo, onNew, onValve, onWeather, legacyActivity = [] }) {
  const [editing, setEditing] = useState(false); const [preferences, setPreferences] = useState(false); const [lot, setLot] = useState('Todos');
  const [dragging, setDragging] = useState(null); const drag = useRef(null);
  const bills = financialAlerts(model, model.generalTransactions || []);
  const incoming = bills.filter(b => b.category.includes('Receber'));
  const outgoing = bills.filter(b => !b.category.includes('Receber'));
  const visits = (model.visits || []).filter(v => v.date >= localDate() && v.status !== 'Cancelada').sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const cycles = model.valves.map(v => ({ valve: v, ...cropCycle(model, v.id) }));
  const nextHarvest = cycles.filter(c => c.end && c.end >= localDate()).sort((a, b) => a.end.localeCompare(b.end))[0];
  const defaultWidgets = useMemo(() => [
    { id: 'weather', label: 'Previsão do Tempo', span: 12 },
    { id: 'receivables', label: 'Valores a Receber', span: 3 },
    { id: 'payables', label: 'Contas a Pagar', span: 3 },
    { id: 'cash', label: 'Saldo Atual do Caixa', span: 3 },
    { id: 'visit-count', label: 'Próximas Visitas', span: 3, defaultHidden: true },
    { id: 'harvest-next', label: 'Próxima Colheita', span: 3 },
    { id: 'quick', label: 'Botões de Registro Rápido', span: 12 },
    { id: 'valves', label: 'Válvulas e Progresso da Colheita', span: 12 },
    { id: 'rain', label: 'Dias com Chuva no Ciclo', span: 12 },
    { id: 'visits', label: 'Agenda de Grupos', span: 12 },
    ...modules.map(m => ({ id: `link:${m.id}`, label: m.title, span: 4 })),
    { id: 'recent', label: 'Atividade Recente Geral', span: 12, defaultHidden: true },
  ], [modules]);
  const saved = settings.dashboard || {};
  const known = new Set(defaultWidgets.map(w => w.id));
  const order = [...new Set([...(saved.order || []).filter(id => known.has(id)), ...defaultWidgets.map(w => w.id)])];
  const hidden = saved.hidden || defaultWidgets.filter(w => w.defaultHidden).map(w => w.id);
  const update = changes => onSettings({ ...saved, order, hidden, ...changes });
  function move(id, target) { if (!id || id === target) return; const next = order.filter(v => v !== id); const index = next.indexOf(target); if (index < 0) return; next.splice(index, 0, id); update({ order: next }); }
  function start(e, id) { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = id; setDragging(id); }
  function slide(e) { if (!drag.current) return; const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-dashboard-widget]'); const target = el?.getAttribute('data-dashboard-widget'); if (target && target !== drag.current) move(drag.current, target); if (e.clientY > innerHeight - 70) window.scrollBy(0, 18); if (e.clientY < 100) window.scrollBy(0, -18); }
  function render(id) {
    if (id === 'weather') return <Weather location={settings.weather || PETROLINA} onConfigure={onWeather} />;
    if (id === 'receivables') return <button className="panel clear-card" onClick={() => onGo('sales')}><span>Quanto Falta Receber?</span><strong>{money(incoming.reduce((s, b) => s + b.amount, 0))}</strong><small>{incoming.filter(b => b.overdue).length} pagamentos atrasados · Ver Vendas</small></button>;
    if (id === 'payables') return <button className="panel clear-card" onClick={() => onGo('transactions')}><span>Quanto Temos a Pagar?</span><strong>{money(outgoing.reduce((s, b) => s + b.amount, 0))}</strong><small>{outgoing.filter(b => b.overdue).length} pendências vencidas · Ver Financeiro</small></button>;
    if (id === 'cash') return <button className="panel clear-card" onClick={() => onGo('transactions')}><span>Saldo Atual do Caixa</span><strong>{money(model.cashBalance)}</strong><small>Recebimentos menos pagamentos confirmados</small></button>;
    if (id === 'visit-count') return <button className="panel clear-card" onClick={() => onGo('tourism')}><span>Próximas Visitas</span><strong>{visits.length} grupos</strong><small>{visits[0] ? `${shortDate(visits[0].date)} · ${visits[0].groupName}` : 'Nenhuma visita agendada'}</small></button>;
    if (id === 'harvest-next') return <button className="panel clear-card" onClick={() => nextHarvest ? onValve(nextHarvest.valve.id) : onGo('planting')}><span>Próxima Colheita Prevista</span><strong>{nextHarvest ? shortDate(nextHarvest.end) : 'A Definir'}</strong><small>{nextHarvest ? valveName(nextHarvest.valve) : 'Cadastre plantio e previsão'}</small></button>;
    if (id === 'quick') return <section className="panel dashboard-quick"><h2>O Que Você Quer Registrar?</h2><div className="management-quick-actions"><button className="primary" onClick={() => onNew('planting')}><Plus size={16} />Plantio</button><button className="secondary" onClick={() => onNew('harvest')}><Plus size={16} />Colheita</button><button className="secondary" onClick={() => onNew('sales')}><Plus size={16} />Venda</button><button className="secondary" onClick={() => onNew('hr')}><Plus size={16} />Horário de Funcionário</button><button className="secondary" onClick={() => onNew('costs')}><Plus size={16} />Serviço ou Gasto</button></div></section>;
    if (id === 'valves') return <section className="panel dashboard-valves"><div className="panel-title"><div><h2>Como Estão as Válvulas?</h2><p>Progresso do tempo entre o plantio informado e a previsão de colheita. Não mede maturação real.</p></div><select aria-label="Lote das Válvulas no Painel" value={lot} onChange={e => setLot(e.target.value)}><option>Todos</option><option>467</option><option>463</option></select></div><div className="variety-legend">{Object.entries(varietyColors).map(([name, color]) => <span key={name}><i style={{ background: color }} />{name}</span>)}<small>Cores de identificação do painel.</small></div><div className="vine-cards">{cycles.filter(c => lot === 'Todos' || c.valve.lot === lot).map(c => <article className="vine-card" key={c.valve.id} style={{ '--variety': varietyColors[c.variety] || '#246b45' }}><button className="vine-card-heading" onClick={() => onValve(c.valve.id)}><strong>Válvula {String(c.valve.number).padStart(2, '0')}</strong><span>Lote {c.valve.lot}</span></button><p>{c.variety}</p>{c.progress === null ? <><div className="vine-progress empty-progress" /><span className="vine-month">Colheita ainda sem previsão</span><button className="text-button" onClick={() => onNew('planting', c.valve.id)}>Cadastrar Plantio</button></> : <><div className="vine-progress" role="progressbar" aria-label={`Progresso ${valveName(c.valve)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.progress}><i style={{ width: `${c.progress}%` }} /></div><div className="vine-progress-caption"><strong>{c.progress}% do período</strong><span>{c.planned ? 'Plantio Planejado' : c.remaining ? `${c.remaining} dias até a previsão` : 'Previsão alcançada'}</span></div><span className="vine-month">Colheita: <b>{c.month}</b></span><button className="text-button" onClick={() => onValve(c.valve.id)}>Abrir Ficha da Válvula</button></>}</article>)}</div></section>;
    if (id === 'rain') return <RainHistory model={model} location={settings.weather || PETROLINA} />;
    if (id === 'visits') return <section className="panel"><div className="panel-title"><h2>Grupos que Vão Visitar a Fazenda</h2><button className="text-button" onClick={() => onGo('tourism')}>Ver Calendário</button></div>{visits.slice(0, 4).map(v => <div className="history-row" key={v.id}><strong>{shortDate(v.date)} · {v.startTime}</strong><span>{v.groupName} · {v.people} pessoas</span></div>)}{!visits.length && <p className="empty">Nenhum grupo agendado. Cadastre uma visita em Agroturismo.</p>}</section>;
    if (id === 'recent') return <RecentActivity model={model} legacy={legacyActivity} title="Últimos Registros da Fazenda" />;
    const index = modules.findIndex(m => `link:${m.id}` === id); const module = modules[index]; const metric = cardMetrics[index];
    if (!module) return null;
    return <button className="module-card" onClick={() => onGo(module.id)}><div className="module-top"><div className={`module-icon ${module.tone}`}><module.icon size={23} /></div></div><h3>{module.title}</h3><p>{module.description}</p><div className="module-metric"><div><span>{metric?.text || 'Acessar Esta Área'}</span><strong>{metric?.value || 'Abrir'}</strong></div></div></button>;
  }
  return <><div className="dashboard-customize"><span>Informações da Fazenda</span><div><button className="secondary" onClick={() => setPreferences(true)}><Settings2 size={15} />Personalizar Painel</button><button className={editing ? 'primary' : 'text-button'} onClick={() => setEditing(v => !v)}>{editing ? <><Check size={14} />Concluir Organização</> : 'Reorganizar Cards'}</button></div></div>{editing && <p className="v-scope-note">Arraste pelo símbolo de pontinhos. No celular, segure e mova; você também pode usar as setas. As preferências são salvas neste navegador.</p>}<div className="custom-dashboard-grid">{order.filter(id => !hidden.includes(id)).map(id => { const widget = defaultWidgets.find(w => w.id === id); return <div key={id} data-dashboard-widget={id} className={`dashboard-widget span-${widget.span} ${dragging === id ? 'is-dragging' : ''}`}>
      {editing && <div className="widget-tools"><button className="widget-drag-handle" aria-label={`Arrastar ${widget.label}`} onPointerDown={e => start(e, id)} onPointerMove={slide} onPointerUp={() => { drag.current = null; setDragging(null); }} onPointerCancel={() => { drag.current = null; setDragging(null); }}><GripVertical size={18} />{widget.label}</button><button aria-label={`Mover ${widget.label} para cima`} onClick={() => { const i = order.indexOf(id); if (i > 0) move(id, order[i - 1]); }}><ArrowUp size={14} /></button><button aria-label={`Mover ${widget.label} para baixo`} onClick={() => { const i = order.indexOf(id); if (i < order.length - 1) { const next = [...order]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; update({ order: next }); } }}><ArrowDown size={14} /></button></div>}{render(id)}</div>; })}</div>{order.every(id => hidden.includes(id)) && <p className="empty">Seu painel está sem cards visíveis. Use Personalizar Painel para escolher o que mostrar.</p>}
    {preferences && <Dialog title="Personalizar Visão Geral" onClose={() => setPreferences(false)}><p className="v-muted">Marque os cards que deseja ver. A ordem pode ser alterada com as setas ou arrastando no painel.</p><div className="widget-preferences">{order.map((id, index) => { const widget = defaultWidgets.find(w => w.id === id); return <div key={id}><label><input type="checkbox" checked={!hidden.includes(id)} onChange={e => update({ hidden: e.target.checked ? hidden.filter(v => v !== id) : [...hidden, id] })} />{widget.label}</label><button aria-label={`Subir ${widget.label}`} disabled={index === 0} onClick={() => move(id, order[index - 1])}><ArrowUp size={15} /></button><button aria-label={`Descer ${widget.label}`} disabled={index === order.length - 1} onClick={() => { const next = [...order]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; update({ order: next }); }}><ArrowDown size={15} /></button></div>; })}</div><div className="modal-actions"><button className="secondary" onClick={() => onSettings({})}>Restaurar Organização Padrão</button><button className="primary" onClick={() => setPreferences(false)}>Concluir</button></div></Dialog>}
  </>;
}
