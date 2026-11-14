import React, { useEffect, useMemo, useState } from 'react';
import { CloudRain, RefreshCw } from 'lucide-react';
import { cropCycle, localDate, valveName } from './vineyard';
import { parseDate, shortDate } from './data';
import { PETROLINA } from './Weather';
import { IS_DEMO, CACHE_PREFIX } from './runtime';
import { simulatedRain } from './demoClimate';

const shift = (date, days) => { const d = parseDate(date); d.setDate(d.getDate() + days); return localDate(d); };
export function rainCounts(start, end, rain) {
  let expected = 0, covered = 0, wet = 0, total = 0;
  for (let day = start; day <= end; day = shift(day, 1)) { expected++; if (Number.isFinite(rain[day])) { covered++; total += rain[day]; if (rain[day] > 0) wet++; } }
  return { expected, covered, wet, total, complete: covered === expected };
}
export default function RainHistory({ model, location = PETROLINA }) {
  const farmToday = new Date().toLocaleDateString('en-CA', { timeZone: location.timezone && location.timezone !== 'auto' ? location.timezone : 'America/Recife' });
  const yesterday = shift(farmToday, -1);
  const cycles = useMemo(() => model.valves.map(v => ({ valve: v, ...cropCycle(model, v.id) })).filter(c => c.start && c.end && c.start <= yesterday && c.end >= c.start), [model.valves, model.entries, yesterday]);
  const start = cycles.length ? cycles.reduce((s, c) => c.start < s ? c.start : s, cycles[0].start) : '';
  const end = cycles.length ? cycles.reduce((s, c) => { const e = c.end < yesterday ? c.end : yesterday; return e > s ? e : s; }, start) : '';
  const [rain, setRain] = useState({}); const [loading, setLoading] = useState(false); const [message, setMessage] = useState(''); const [refresh, setRefresh] = useState(0); const [updated, setUpdated] = useState(null);
  useEffect(() => {
    if (!start || !end || end < start) { setRain({}); setLoading(false); return; }
    if (IS_DEMO) { const days = {}; for (let day = start; day <= end; day = shift(day, 1)) days[day] = simulatedRain(day); setRain(days); setLoading(false); setMessage('Histórico de Chuva Simulado · Dados fictícios para testes, sem medição ou consulta meteorológica real.'); setUpdated(null); return; }
    const controller = new AbortController(); let cancelled = false;
    const key = `${CACHE_PREFIX}-rain:${location.latitude}:${location.longitude}:${start}:${end}`;
    setRain({}); setMessage(''); setLoading(true); setUpdated(null);
    let cached;
    try { cached = JSON.parse(localStorage.getItem(key)); if (cached?.rain) { setRain(cached.rain); setUpdated(cached.savedAt); } } catch { /* Optional cache. */ }
    const timer = setTimeout(() => controller.abort(), 20000);
    async function run() {
      const cutoff = shift(farmToday, -6);
      const result = {}; let failures = 0;
      const tasks = [];
      if (start <= cutoff) tasks.push(['https://archive-api.open-meteo.com/v1/archive', start, end < cutoff ? end : cutoff]);
      if (end > cutoff) tasks.push(['https://api.open-meteo.com/v1/forecast', start > cutoff ? start : shift(cutoff, 1), end]);
      await Promise.all(tasks.map(async ([url, from, until]) => {
        try {
          const query = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, start_date: from, end_date: until, daily: 'precipitation_sum', timezone: location.timezone || 'auto' });
          const response = await fetch(`${url}?${query}`, { signal: controller.signal });
          if (!response.ok) throw new Error(); const json = await response.json();
          if (!Array.isArray(json.daily?.time) || !Array.isArray(json.daily?.precipitation_sum)) throw new Error();
          json.daily.time.forEach((d, i) => { const value = json.daily.precipitation_sum[i]; if (d >= from && d <= until && Number.isFinite(value)) result[d] = value; });
        } catch { failures++; }
      }));
      if (cancelled) return;
      const combined = { ...(cached?.rain || {}), ...result }; setRain(combined);
      if (Object.keys(result).length) { const savedAt = Date.now(); setUpdated(savedAt); try { localStorage.setItem(key, JSON.stringify({ rain: combined, savedAt })); } catch { /* Results remain visible. */ } }
      if (failures) setMessage('Consulta parcial ou indisponível. Datas sem dados não são contadas como dias sem chuva.');
      setLoading(false); clearTimeout(timer);
    }
    run(); return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [start, end, location.latitude, location.longitude, location.timezone, refresh]);
  return <section className="panel rain-history"><div className="panel-title"><div><h2><CloudRain size={18} /> Dias com Chuva no Ciclo</h2><p>Do plantio até a previsão de colheita, considerando apenas datas já encerradas.</p></div><button className="text-button" disabled={loading || !cycles.length} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={13} />Atualizar</button></div>{!cycles.length ? <p className="empty">{model.entries.some(e => e.kind === 'planting') ? 'Ainda não há dias encerrados neste ciclo para apurar chuva. Hoje e datas futuras não são contados.' : 'Cadastre um plantio com data e previsão de colheita para acompanhar a chuva do ciclo.'}</p> : <><p className="rain-caption">{location.label} · Dia com chuva = precipitação maior que 0 mm. {IS_DEMO ? 'Cenário simulado de demonstração, sem dados meteorológicos reais.' : 'Estimativas meteorológicas da Open-Meteo, sem medição própria na fazenda.'} Hoje e datas futuras não entram neste total.{updated ? ` Consulta salva em ${new Date(updated).toLocaleString('pt-BR')}.` : ''}</p>{loading && <p className="v-muted">Consultando o histórico meteorológico…</p>}{message && <p role="status" className="rain-warning">{message}</p>}<div className="table-wrap"><table><thead><tr><th>Válvula</th><th>Período Apurado</th><th>Dias com Chuva</th><th>Dias com Dados</th><th>Chuva Acumulada</th></tr></thead><tbody>{cycles.map(c => { const until = c.end < yesterday ? c.end : yesterday; const s = rainCounts(c.start, until, rain); return <tr key={c.valve.id}><td><strong>{valveName(c.valve)}</strong><small className="v-cell-sub">{c.variety}</small></td><td>{shortDate(c.start)} a {shortDate(until)}</td><td>{s.covered ? `${s.wet}${s.complete ? '' : ' (parcial)'}` : 'Indisponível'}</td><td>{s.covered} de {s.expected}</td><td>{s.covered ? `${s.total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mm${s.complete ? '' : ' (parcial)'}` : '—'}</td></tr>; })}</tbody></table></div></>}</section>;
}
