import type { WeatherData } from '@edwin/shared';

export function WeatherCard({ weather }: { weather?: WeatherData }) {
  if (!weather) {
    return (
      <div className="rounded-[20px] border border-white/[0.05] bg-[#151729]/60 p-6 backdrop-blur-xl">
        <p className="text-sm text-[#7a7b90]">Weather unavailable</p>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-white/[0.05] bg-[#151729]/60 p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-light text-[#f0f0f5]">{weather.temp}&deg;C</p>
          <p className="mt-1 text-sm text-[#7a7b90]">{weather.condition}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#7a7b90]">
            {weather.high}&deg; / {weather.low}&deg;
          </p>
          <p className="mt-1 text-xs text-[#45465a]">{weather.location}</p>
        </div>
      </div>
    </div>
  );
}
