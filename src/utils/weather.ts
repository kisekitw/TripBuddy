export interface WeatherData {
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  emoji: string;
  desc: string;
}

function weatherCodeToEmoji(code: number): { emoji: string; desc: string } {
  if (code === 0) return { emoji: "☀️", desc: "晴天" };
  if (code <= 3) return { emoji: "⛅️", desc: "多雲" };
  if (code <= 48) return { emoji: "🌫️", desc: "霧" };
  if (code <= 67) return { emoji: "🌧️", desc: "雨" };
  if (code <= 77) return { emoji: "❄️", desc: "雪" };
  if (code <= 82) return { emoji: "🌦️", desc: "陣雨" };
  if (code <= 86) return { emoji: "🌨️", desc: "陣雪" };
  return { emoji: "⛈️", desc: "雷暴" };
}

export async function fetchWeather(
  lat: number,
  lng: number,
  isoDate: string
): Promise<WeatherData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
      `&forecast_days=16&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const times: string[] = data.daily?.time ?? [];
    const idx = times.indexOf(isoDate);
    if (idx === -1) return null;
    const weatherCode: number = data.daily.weathercode[idx] ?? 0;
    const { emoji, desc } = weatherCodeToEmoji(weatherCode);
    return {
      maxTemp: data.daily.temperature_2m_max[idx],
      minTemp: data.daily.temperature_2m_min[idx],
      weatherCode,
      emoji,
      desc,
    };
  } catch {
    return null;
  }
}
