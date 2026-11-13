import React from 'react';
import { VARIETIES } from './vineyard';

export function scopeFor(record, valves) {
  const valve = valves.find(v => v.id === record.valveId);
  const variety = record.variety || valve?.variety || record.crop || '';
  return { lot: valve?.lot || record.lot || '', valveId: valve?.id || '', variety: VARIETIES.includes(variety) ? variety : '' };
}
export default function ValveSelectors({ valves, value, onChange, required = false }) {
  const lot = valves.find(v => v.id === value.valveId)?.lot || value.lot || '';
  const available = valves.filter(v => v.lot === lot);
  const variety = VARIETIES.includes(value.variety) ? value.variety : '';
  function chooseLot(next) { onChange({ lot: next, valveId: '', variety: '' }); }
  function chooseValve(id) { const valve = available.find(v => v.id === id); onChange({ lot, valveId: valve?.id || '', variety: valve?.variety || variety }); }
  return <div className="v-location-selectors">
    <label className="v-field">Lote<select aria-label="Lote" required={required} value={lot} onChange={e => chooseLot(e.target.value)}><option value="">{required ? 'Selecione o Lote' : 'Geral / Todos os Lotes'}</option>{[...new Set(valves.map(v => v.lot))].sort((a, b) => Number(b) - Number(a)).map(id => <option value={id} key={id}>Lote {id}</option>)}</select></label>
    <label className="v-field">Válvula<select aria-label="Válvula" required={required || Boolean(lot)} disabled={!lot} value={value.valveId || ''} onChange={e => chooseValve(e.target.value)}><option value="">{required || lot ? 'Selecione a Válvula' : 'Todas as Válvulas'}</option>{available.map(v => <option value={v.id} key={v.id}>Válvula {String(v.number).padStart(2, '0')}</option>)}</select></label>
    <label className="v-field">Variedade de Uva<select aria-label="Variedade de Uva" required={required || Boolean(value.valveId)} value={variety} onChange={e => onChange({ lot, valveId: value.valveId || '', variety: e.target.value })}><option value="">{required || value.valveId ? 'Selecione a Variedade' : 'Todas as Variedades'}</option>{VARIETIES.map(name => <option key={name}>{name}</option>)}</select></label>
  </div>;
}
