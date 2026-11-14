// Illustrative weather for the demo only; never presented as a live observation.
export function simulatedRain(date) {
  const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000);
  return day % 7 === 0 ? 8.4 : day % 11 === 0 ? 3.2 : 0;
}
export function demoWeather(location) {
  const base = new Date().toLocaleDateString('en-CA', { timeZone: location.timezone && location.timezone !== 'auto' ? location.timezone : 'America/Recife' });
  const times = Array.from({ length: 16 }, (_, i) => { const d = new Date(`${base}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  return { simulated: true, fetchedAt: Date.now(), timezone: 'America/Recife', current: { temperature_2m: 31, relative_humidity_2m: 48, precipitation: 0, weather_code: 1, wind_speed_10m: 12 }, daily: { time: times, weather_code: times.map(d => simulatedRain(d) ? 61 : 1), temperature_2m_min: times.map((_, i) => 22 + i % 3), temperature_2m_max: times.map((_, i) => 32 + i % 4), precipitation_probability_max: times.map(d => simulatedRain(d) ? 75 : 10), precipitation_sum: times.map(simulatedRain) } };
}
