import type { WeatherData } from '@edwin/shared';

export function WeatherCard({ weather }: { weather?: WeatherData }) {
  if (!weather) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm text-zinc-500">Weather unavailable</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-light text-zinc-100">{weather.temp}&deg;C</p>
          <p className="mt-1 text-sm text-zinc-400">{weather.condition}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-400">
            {weather.high}&deg; / {weather.low}&deg;
          </p>
          <p className="mt-1 text-xs text-zinc-500">{weather.location}</p>
        </div>
      </div>
    </div>
  );
}
