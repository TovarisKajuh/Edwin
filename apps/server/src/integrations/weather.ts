/**
 * Weather Integration — Session 25.
 *
 * Edwin sees the weather via Open-Meteo API (free, no key needed).
 * Results cached for 30 minutes to avoid hammering the API.
 *
 * Location: Graz, Austria (lat 47.0707, lon 15.4395)
 */

// ── Types ────────────────────────────────────────────────────────

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  description: string;
}

export interface DailyForecast {
  date: string;
  high: number;
  low: number;
  weatherCode: number;
  description: string;
  precipitationProbability: number;
}

export interface WeatherReport {
  current: CurrentWeather;
  forecast: DailyForecast[];
  location: string;
  fetchedAt: string;
}

// ── WMO Weather Codes ────────────────────────────────────────────

const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function weatherDescription(code: number): string {
  return WMO_CODES[code] || 'Unknown';
}

// ── Cache ────────────────────────────────────────────────────────

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
let cachedReport: WeatherReport | null = null;

// ── Location ─────────────────────────────────────────────────────

const LAT = 47.0707;
const LON = 15.4395;
const LOCATION = 'Graz, Austria';

// ── API ──────────────────────────────────────────────────────────

const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  '&timezone=Europe%2FVienna&forecast_days=3';

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

/**
 * Fetch weather from Open-Meteo with 30-minute caching.
 */
export async function getWeather(): Promise<WeatherReport> {
  // Return cache if fresh
  if (cachedReport) {
    const age = Date.now() - new Date(cachedReport.fetchedAt).getTime();
    if (age < CACHE_DURATION_MS) {
      return cachedReport;
    }
  }

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  const report: WeatherReport = {
    current: {
      temperature: Math.round(data.current.temperature_2m),
      apparentTemperature: Math.round(data.current.apparent_temperature),
      weatherCode: data.current.weather_code,
      windSpeed: Math.round(data.current.wind_speed_10m),
      humidity: data.current.relative_humidity_2m,
      description: weatherDescription(data.current.weather_code),
    },
    forecast: data.daily.time.map((date, i) => ({
      date,
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      weatherCode: data.daily.weather_code[i],
      description: weatherDescription(data.daily.weather_code[i]),
      precipitationProbability: data.daily.precipitation_probability_max[i],
    })),
    location: LOCATION,
    fetchedAt: new Date().toISOString(),
  };

  cachedReport = report;
  return report;
}

/**
 * Format weather for Edwin's tool response (what Claude sees).
 */
export function formatWeatherForClaude(report: WeatherReport): string {
  const c = report.current;
  const lines = [
    `${report.location} — ${c.description}, ${c.temperature}°C (feels like ${c.apparentTemperature}°C)`,
    `Wind: ${c.windSpeed} km/h | Humidity: ${c.humidity}%`,
    '',
    'Forecast:',
  ];

  for (const day of report.forecast) {
    const precip = day.precipitationProbability > 0
      ? ` | ${day.precipitationProbability}% chance of precipitation`
      : '';
    lines.push(`  ${day.date}: ${day.description}, ${day.high}°C / ${day.low}°C${precip}`);
  }

  return lines.join('\n');
}

/**
 * Format weather for the dashboard API response.
 */
export function formatWeatherForDashboard(report: WeatherReport) {
  const today = report.forecast[0];
  return {
    temp: report.current.temperature,
    condition: report.current.description,
    icon: weatherIcon(report.current.weatherCode),
    high: today?.high ?? report.current.temperature,
    low: today?.low ?? report.current.temperature,
    location: report.location,
  };
}

function weatherIcon(code: number): string {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'unknown';
}

/**
 * Clear the weather cache (for testing).
 */
export function clearWeatherCache(): void {
  cachedReport = null;
}
