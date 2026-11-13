import React, { useEffect, useState } from 'react';
import { CloudSun, CloudRain, Sun, Cloud, Wind, Droplets, RefreshCw, MapPin } from 'lucide-react';

export const PETROLINA = { latitude: -9.3891, longitude: -40.5031, label: 'Petrolina, PE', timezone: 'America/Recife' };
export const describeWeather = code => code === 0 ? 'Céu Limpo' : code <= 3 ? 'Parcialmente Nublado' : code <= 48 ? 'Neblina' : code <= 67 ? 'Chuva' : code <= 77 ? 'Neve' : code <= 82 ? 'Pancadas de Chuva' : 'Trovoadas';
export const WeatherIcon = ({ code, size = 24 }) => code === 0 ? <Sun size={size} /> : code <= 3 ? <CloudSun size={size} /> : code <= 48 ? <Cloud size={size} /> : <CloudRain size={size} />;
export function useWeather(location = PETROLINA, enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!enabled) { setData(null); setError(''); setLoading(false); return; }
    const controller = new AbortController();
    let cancelled = false;
    const key = `vr-weather:${location.latitude}:${location.longitude}`;
    setData(null); setError('');
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(key)); if (cached?.current && cached?.daily && cached?.fetchedAt) setData(cached); } catch { /* Cache is optional. */ }
    async function load() {
      setLoading(true); setError('');
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const query = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude,
          current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
          timezone: location.timezone || 'auto', forecast_days: 16 });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Previsão indisponível');
        const result = await response.json();
        if (typeof result.current?.temperature_2m !== 'number' || !Array.isArray(result.daily?.time)) throw new Error('Resposta incompleta');
        const saved = { ...result, fetchedAt: Date.now() }; setData(saved);
        try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* Fetch remains usable without caching. */ }
      } catch { if (cancelled) return; if (!controller.signal.aborted) setError('Não foi possível atualizar a previsão.'); else setError('A consulta demorou demais. Tente novamente.'); }
      finally { clearTimeout(timeout); if (!cancelled) setLoading(false); }
    }
    if (refresh > 0 || !cached?.current || !Array.isArray(cached?.daily?.time) || cached.daily.time.length < 16 || Date.now() - cached.fetchedAt >= 10 * 60 * 1000) load();
    const timer = setInterval(() => setRefresh(n => n + 1), 10 * 60 * 1000);
    return () => { cancelled = true; controller.abort(); clearInterval(timer); };
  }, [location.latitude, location.longitude, location.timezone, refresh, enabled]);
  return { data, error, loading, refreshWeather: () => setRefresh(n => n + 1) };
}
export default function Weather({ location = PETROLINA, onConfigure }) {
  const { data, error, loading, refreshWeather } = useWeather(location);
  const [expanded, setExpanded] = useState(false);
  const stale = data && (error || Date.now() - data.fetchedAt > 20 * 60 * 1000);
  return <section className="panel weather-panel" aria-label="Previsão do Tempo">
    <div className="weather-heading"><div className="weather-location"><MapPin size={15} /><strong>{location.label}</strong><span>Previsão do Tempo</span></div><div className="weather-controls"><button className="text-button" onClick={onConfigure}>Localização</button><button className="row-action" aria-label="Atualizar previsão" disabled={loading} onClick={refreshWeather}><RefreshCw size={15} className={loading ? 'spinning' : ''} /></button></div></div>
    {data ? <><div className="weather-current"><div className="weather-temperature"><WeatherIcon code={data.current.weather_code} size={35} /><strong>{Math.round(data.current.temperature_2m)}°C</strong><span>{describeWeather(data.current.weather_code)}</span></div><div className="weather-fact"><Droplets size={17} /><strong>{data.daily.precipitation_probability_max?.[0] ?? '—'}%</strong><span>Chance de Chuva Hoje</span></div><div className="weather-fact"><CloudRain size={17} /><strong>{data.daily.precipitation_sum?.[0] ?? '—'} mm</strong><span>Chuva Prevista Hoje</span></div><div className="weather-fact"><Wind size={17} /><strong>{data.current.wind_speed_10m} km/h</strong><span>Vento Atual</span></div></div><div className="weather-bottom"><span className={stale ? 'negative' : ''}>{stale ? 'Dados salvos · atualização indisponível' : 'Atualizado'} · {new Date(data.fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: data.timezone })} · Open-Meteo</span><button className="text-button" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? 'Ocultar Previsão' : 'Próximos 7 Dias'}</button></div>{expanded && <div className="weather-days">{data.daily.time.slice(0, 7).map((date, i) => <div key={date}><strong>{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}</strong><WeatherIcon code={data.daily.weather_code[i]} size={21} /><span>{Math.round(data.daily.temperature_2m_min[i])}° / {Math.round(data.daily.temperature_2m_max[i])}°</span><small>{data.daily.precipitation_probability_max[i]}% · {data.daily.precipitation_sum[i]} mm</small></div>)}</div>}</> : <div className="weather-empty"><CloudSun size={25} /><p>{loading ? `Consultando a previsão atualizada de ${location.label}…` : 'Previsão temporariamente indisponível.'}</p><span>Os valores só aparecem após uma consulta válida à fonte.</span></div>}
    {error && <p className="weather-error" role="status">{error}{data ? ' A última consulta válida continua identificada acima.' : ''}</p>}
  </section>;
}
