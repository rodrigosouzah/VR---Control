import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { localDate } from './vineyard';
import { parseDate } from './data';
import { documentBlob } from './documents';
import './management.css';

export function Photo({ document, name = '', large = false }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let cancelled = false; let objectURL;
    setUrl('');
    if (document?.id) documentBlob(document.id).then(blob => { if (blob && !cancelled) { objectURL = URL.createObjectURL(blob); setUrl(objectURL); } }).catch(() => {});
    return () => { cancelled = true; if (objectURL) URL.revokeObjectURL(objectURL); };
  }, [document?.id]);
  return <div className={`person-photo ${large ? 'large' : ''}`}>{url ? <img src={url} alt={`Foto de ${name}`} /> : <span>{name.slice(0, 2).toUpperCase() || '—'}</span>}</div>;
}
export function CalendarBoard({ title, entries, onAdd, onEdit, initialDate }) {
  const [anchor, setAnchor] = useState(initialDate || localDate());
  const d = parseDate(anchor); const first = new Date(d.getFullYear(), d.getMonth(), 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const days = Array.from({ length: Math.ceil((first.getDay() + last.getDate()) / 7) * 7 }, (_, i) => { const day = new Date(start); day.setDate(day.getDate() + i); return localDate(day); });
  return <section className="panel v-calendar"><div className="panel-title"><div><h2>{title}</h2><p>Clique em + para cadastrar ou no registro para editar.</p></div><div className="calendar-toolbar"><div><button aria-label="Mês anterior" onClick={() => setAnchor(localDate(new Date(d.getFullYear(), d.getMonth() - 1, 1)))}><ChevronLeft size={16} /></button><button onClick={() => setAnchor(localDate())}>Hoje</button><button aria-label="Próximo mês" onClick={() => setAnchor(localDate(new Date(d.getFullYear(), d.getMonth() + 1, 1)))}><ChevronRight size={16} /></button></div></div></div><div className="management-calendar-month"><strong>{d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong><input aria-label="Ir para Data" type="date" value={anchor} onChange={e => e.target.value && setAnchor(e.target.value)} /></div><div className="v-calendar-scroll"><div className="v-calendar-grid v-weekdays">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(s => <span key={s}>{s}</span>)}</div><div className="v-calendar-grid">{days.map(day => <div className={`v-calendar-day ${day === localDate() ? 'v-today' : ''} ${parseDate(day).getMonth() !== d.getMonth() ? 'v-other-month' : ''}`} key={day}><div className="v-day-header"><strong>{parseDate(day).getDate()}</strong><button aria-label={`Adicionar em ${day}`} onClick={() => onAdd(day)}><Plus size={13} /></button></div>{entries.filter(e => e.date === day).map(e => <button className={`v-calendar-event ${e.status === 'Cancelada' || e.status === 'Falta' ? 'calendar-negative' : ''}`} key={e.id} onClick={() => onEdit(e)}><strong>{e.title}</strong><span>{e.subtitle}</span><small>{e.status}</small></button>)}</div>)}</div></div></section>;
}
export function RecentActivity({ model, modules, title = 'Últimos Registros Desta Área', legacy = [] }) {
  const [expanded, setExpanded] = useState(false);
  const feed = [...(model.activity || []), ...legacy].filter(e => !modules || modules.includes(e.module)).sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
  return <section className="panel recent-area"><div className="panel-title"><div><h2>{title}</h2><p>Confira o que foi cadastrado, alterado ou excluído.</p></div>{feed.length > 3 && <button className="text-button" onClick={() => setExpanded(v => !v)}>{expanded ? 'Mostrar Menos' : 'Ver Mais'}</button>}</div>{feed.length ? <ol>{feed.slice(0, expanded ? 15 : 3).map((e, i) => <li key={e.id || i}><div><strong>{e.title || e.label}</strong><span>{e.action || e.meta}</span></div><time>{new Date(e.createdAt || e.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></li>)}</ol> : <p className="empty">Os registros desta área aparecerão aqui.</p>}</section>;
}
