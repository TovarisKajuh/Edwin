import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getWeather,
  formatWeatherForClaude,
  formatWeatherForDashboard,
  clearWeatherCache,
  type WeatherReport,
  type CurrentWeather,
  type DailyForecast,
} from '../weather';

const mockCurrent: CurrentWeather = {
  temperature: 14,
  apparentTemperature: 11,
  weatherCode: 2,
  windSpeed: 12,
  humidity: 58,
  description: 'Partly cloudy',
};

const mockForecast: DailyForecast[] = [
  { date: '2026-03-08', high: 16, low: 5, weatherCode: 2, description: 'Partly cloudy', precipitationProbability: 10 },
  { date: '2026-03-09', high: 18, low: 7, weatherCode: 0, description: 'Clear sky', precipitationProbability: 0 },
  { date: '2026-03-10', high: 12, low: 3, weatherCode: 61, description: 'Slight rain', precipitationProbability: 65 },
];

const mockReport: WeatherReport = {
  current: mockCurrent,
  forecast: mockForecast,
  location: 'Graz, Austria',
  fetchedAt: '2026-03-08T10:00:00.000Z',
};

describe('Weather Integration', () => {
  beforeEach(() => {
    clearWeatherCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearWeatherCache();
  });

  // ── formatWeatherForClaude ──────────────────────────────────────

  describe('formatWeatherForClaude', () => {
    it('should format current conditions and forecast', () => {
      const result = formatWeatherForClaude(mockReport);

      expect(result).toContain('Graz, Austria');
      expect(result).toContain('Partly cloudy');
      expect(result).toContain('14°C');
      expect(result).toContain('feels like 11°C');
      expect(result).toContain('Wind: 12 km/h');
      expect(result).toContain('Humidity: 58%');
      expect(result).toContain('Forecast:');
      expect(result).toContain('2026-03-08');
      expect(result).toContain('Clear sky');
      expect(result).toContain('65% chance of precipitation');
    });

    it('should not show precipitation when 0%', () => {
      const result = formatWeatherForClaude(mockReport);
      const clearLine = result.split('\n').find((l) => l.includes('Clear sky'));
      expect(clearLine).not.toContain('chance of precipitation');
    });
  });

  // ── formatWeatherForDashboard ───────────────────────────────────

  describe('formatWeatherForDashboard', () => {
    it('should return dashboard-friendly format', () => {
      const result = formatWeatherForDashboard(mockReport);

      expect(result.temp).toBe(14);
      expect(result.condition).toBe('Partly cloudy');
      expect(result.icon).toBe('partly-cloudy');
      expect(result.high).toBe(16);
      expect(result.low).toBe(5);
      expect(result.location).toBe('Graz, Austria');
    });

    it('should handle missing forecast gracefully', () => {
      const noForecast: WeatherReport = {
        ...mockReport,
        forecast: [],
      };
      const result = formatWeatherForDashboard(noForecast);
      expect(result.high).toBe(14); // falls back to current temp
      expect(result.low).toBe(14);
    });

    it('should map weather codes to icons', () => {
      const codes: [number, string][] = [
        [0, 'clear'],
        [1, 'clear'],
        [2, 'partly-cloudy'],
        [3, 'cloudy'],
        [45, 'fog'],
        [51, 'rain'],
        [65, 'rain'],
        [71, 'snow'],
        [85, 'snow'],
        [95, 'storm'],
        [99, 'storm'],
      ];

      for (const [code, expected] of codes) {
        const report: WeatherReport = {
          ...mockReport,
          current: { ...mockCurrent, weatherCode: code },
        };
        const result = formatWeatherForDashboard(report);
        expect(result.icon).toBe(expected);
      }
    });
  });

  // ── getWeather (API fetch) ──────────────────────────────────────

  describe('getWeather', () => {
    it('should fetch and parse weather data', async () => {
      const mockResponse = {
        current: {
          temperature_2m: 14.2,
          apparent_temperature: 11.1,
          weather_code: 2,
          wind_speed_10m: 11.8,
          relative_humidity_2m: 58,
        },
        daily: {
          time: ['2026-03-08', '2026-03-09', '2026-03-10'],
          weather_code: [2, 0, 61],
          temperature_2m_max: [16.3, 18.1, 11.9],
          temperature_2m_min: [4.7, 6.8, 2.5],
          precipitation_probability_max: [10, 0, 65],
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const report = await getWeather();

      expect(report.location).toBe('Graz, Austria');
      expect(report.current.temperature).toBe(14);
      expect(report.current.description).toBe('Partly cloudy');
      expect(report.forecast).toHaveLength(3);
      expect(report.forecast[0].high).toBe(16);
      expect(report.fetchedAt).toBeTruthy();
    });

    it('should cache results for 30 minutes', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 14,
            apparent_temperature: 11,
            weather_code: 2,
            wind_speed_10m: 12,
            relative_humidity_2m: 58,
          },
          daily: {
            time: ['2026-03-08'],
            weather_code: [2],
            temperature_2m_max: [16],
            temperature_2m_min: [5],
            precipitation_probability_max: [10],
          },
        }),
      } as Response);

      await getWeather();
      await getWeather();
      await getWeather();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      await expect(getWeather()).rejects.toThrow('Weather API error: 503');
    });
  });
});
