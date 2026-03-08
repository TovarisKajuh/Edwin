/**
 * Temporal Context — Session 26.
 *
 * Edwin doesn't just know the time — he understands what it MEANS.
 * Saturday morning vs Monday morning. January vs July.
 * The rhythm of Jan's week and year.
 *
 * This module provides deep temporal intelligence that feeds into
 * all reasoning, soul directives, and proactive decisions.
 */

// ── Types ────────────────────────────────────────────────────────

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
export type WeekPosition = 'beginning' | 'middle' | 'end';
export type MonthPosition = 'beginning' | 'middle' | 'end';

export interface DaySignificance {
  dayName: string;
  dayOfWeek: number;
  energy: string;
  focus: string;
  risk: string | null;
  suggestion: string;
}

export interface SeasonalContext {
  season: Season;
  daylightHours: number;
  moodImpact: string;
  activitySuggestion: string;
  awareness: string;
}

export interface TemporalContext {
  day: DaySignificance;
  season: SeasonalContext;
  weekPosition: WeekPosition;
  monthPosition: MonthPosition;
  weekPositionNote: string;
  monthPositionNote: string;
  specialDay: string | null;
}

// ── Day of Week Significance ─────────────────────────────────────

const DAY_PROFILES: Record<number, Omit<DaySignificance, 'dayName' | 'dayOfWeek'>> = {
  0: { // Sunday
    energy: 'Rest and recharge. No pressure, no pushing.',
    focus: 'Recovery, reflection, gentle presence',
    risk: null,
    suggestion: 'Let Jan rest. Suggest something light and enjoyable.',
  },
  1: { // Monday
    energy: 'Fresh start energy. Planning and ambition.',
    focus: 'Week planning, setting intentions, tackling the hardest task',
    risk: 'Overwhelm from accumulated weekend avoidance',
    suggestion: 'Help Jan channel Monday energy into his top priority. Set the week up right.',
  },
  2: { // Tuesday
    energy: 'Execution mode. Momentum from Monday.',
    focus: 'Deep work, following through on Monday plans',
    risk: null,
    suggestion: 'Keep momentum going. This is a strong execution day.',
  },
  3: { // Wednesday
    energy: 'Mid-week — energy can dip. The hump day.',
    focus: 'Push through the middle. Check progress on weekly goals.',
    risk: 'Mid-week slump, gym skipping, procrastination surge',
    suggestion: 'Proactively motivate. Reference progress already made this week.',
  },
  4: { // Thursday
    energy: 'Almost there. Second wind before the weekend.',
    focus: 'Finish what was started. Clear the decks.',
    risk: 'Premature weekend mode — checking out early',
    suggestion: 'Encourage finishing strong. Friday is close but not here yet.',
  },
  5: { // Friday
    energy: 'Wind-down beginning. Weekend anticipation.',
    focus: 'Wrap up loose ends, plan weekend, celebrate wins',
    risk: 'Rushing through tasks, sloppy work to "finish"',
    suggestion: 'Help Jan finish the week well and transition to weekend mode.',
  },
  6: { // Saturday
    energy: 'Activity day. Social and personal time.',
    focus: 'Personal projects, social life, errands, fitness',
    risk: 'Wasting the day on screens or sleeping in too late',
    suggestion: 'Encourage activity and social connection. Saturday is for living.',
  },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDaySignificance(dayOfWeek: number): DaySignificance {
  const profile = DAY_PROFILES[dayOfWeek];
  return {
    dayName: DAY_NAMES[dayOfWeek],
    dayOfWeek,
    ...profile,
  };
}

// ── Seasonal Awareness ───────────────────────────────────────────
// Based on Graz, Austria (Central European latitude ~47°N)

export function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

// Approximate daylight hours for Graz latitude by month
const DAYLIGHT_HOURS: Record<number, number> = {
  1: 9,    // January
  2: 10.5, // February
  3: 12,   // March
  4: 13.5, // April
  5: 15,   // May
  6: 16,   // June (peak)
  7: 15.5, // July
  8: 14,   // August
  9: 12.5, // September
  10: 11,  // October
  11: 9.5, // November
  12: 8.5, // December (minimum)
};

const SEASONAL_PROFILES: Record<Season, Omit<SeasonalContext, 'season' | 'daylightHours'>> = {
  winter: {
    moodImpact: 'Shorter days can affect energy and mood. Light exposure matters.',
    activitySuggestion: 'Indoor activities, planning, skill-building. Outdoor walks when sunny.',
    awareness: 'Winter in Graz — cold, possibly grey. Be mindful of seasonal mood dips.',
  },
  spring: {
    moodImpact: 'Energy rising with longer days. Renewal and motivation.',
    activitySuggestion: 'Outdoor activities returning. Good time for new habits and fresh starts.',
    awareness: 'Spring in Graz — warming up, days getting longer. Channel the new energy.',
  },
  summer: {
    moodImpact: 'Peak energy from long days. Social energy high.',
    activitySuggestion: 'Outdoor exercise, social events, evening activities possible.',
    awareness: 'Summer in Graz — long days, warm weather. Maximize outdoor time.',
  },
  autumn: {
    moodImpact: 'Transition period. Days shortening. Focus shifts inward.',
    activitySuggestion: 'Establish routines before winter. Harvest the year\'s progress.',
    awareness: 'Autumn in Graz — cooling down, days shortening. Good for reflection and planning.',
  },
};

export function getSeasonalContext(month: number): SeasonalContext {
  const season = getSeason(month);
  const daylightHours = DAYLIGHT_HOURS[month] || 12;
  return {
    season,
    daylightHours,
    ...SEASONAL_PROFILES[season],
  };
}

// ── Week Position ────────────────────────────────────────────────

export function getWeekPosition(dayOfWeek: number): WeekPosition {
  if (dayOfWeek === 1 || dayOfWeek === 2) return 'beginning';
  if (dayOfWeek >= 3 && dayOfWeek <= 4) return 'middle';
  return 'end'; // Friday, Saturday, Sunday
}

const WEEK_POSITION_NOTES: Record<WeekPosition, string> = {
  beginning: 'Start of the week — time to plan, set intentions, and tackle priorities.',
  middle: 'Mid-week — maintain momentum, check progress, push through.',
  end: 'End of the week — wrap up, reflect on wins, prepare for what\'s next.',
};

// ── Month Position ───────────────────────────────────────────────

export function getMonthPosition(dayOfMonth: number): MonthPosition {
  if (dayOfMonth <= 10) return 'beginning';
  if (dayOfMonth <= 20) return 'middle';
  return 'end';
}

const MONTH_POSITION_NOTES: Record<MonthPosition, string> = {
  beginning: 'Start of the month — bills may be due, fresh monthly goals, budget review.',
  middle: 'Mid-month — steady execution, check monthly progress.',
  end: 'End of the month — month summary approaching, close out tasks, financial review.',
};

// ── Special Days / Holidays ──────────────────────────────────────
// Austrian public holidays and culturally significant dates

interface SpecialDay {
  month: number;
  day: number;
  name: string;
  note: string;
}

const FIXED_SPECIAL_DAYS: SpecialDay[] = [
  { month: 1, day: 1, name: 'New Year\'s Day', note: 'Public holiday. Rest and reflect on the year ahead.' },
  { month: 1, day: 6, name: 'Epiphany', note: 'Public holiday in Austria.' },
  { month: 5, day: 1, name: 'Labour Day', note: 'Public holiday. Day off.' },
  { month: 8, day: 15, name: 'Assumption of Mary', note: 'Public holiday in Austria.' },
  { month: 10, day: 26, name: 'Austrian National Day', note: 'National holiday.' },
  { month: 11, day: 1, name: 'All Saints\' Day', note: 'Public holiday.' },
  { month: 12, day: 8, name: 'Immaculate Conception', note: 'Public holiday.' },
  { month: 12, day: 24, name: 'Christmas Eve', note: 'Most shops close early. Family time.' },
  { month: 12, day: 25, name: 'Christmas Day', note: 'Public holiday. Rest and family.' },
  { month: 12, day: 26, name: 'St. Stephen\'s Day', note: 'Public holiday.' },
  { month: 12, day: 31, name: 'New Year\'s Eve', note: 'Celebration night. Plan ahead.' },
];

export function getSpecialDay(month: number, day: number): string | null {
  const special = FIXED_SPECIAL_DAYS.find((s) => s.month === month && s.day === day);
  if (!special) return null;
  return `${special.name} — ${special.note}`;
}

// ── Full Temporal Context ────────────────────────────────────────

export function buildTemporalContext(date: Date = new Date()): TemporalContext {
  const dayOfWeek = date.getDay();
  const month = date.getMonth() + 1; // 1-indexed
  const dayOfMonth = date.getDate();

  const day = getDaySignificance(dayOfWeek);
  const season = getSeasonalContext(month);
  const weekPosition = getWeekPosition(dayOfWeek);
  const monthPosition = getMonthPosition(dayOfMonth);
  const specialDay = getSpecialDay(month, dayOfMonth);

  return {
    day,
    season,
    weekPosition,
    monthPosition,
    weekPositionNote: WEEK_POSITION_NOTES[weekPosition],
    monthPositionNote: MONTH_POSITION_NOTES[monthPosition],
    specialDay,
  };
}

// ── Format for Claude ────────────────────────────────────────────

export function formatTemporalContext(ctx: TemporalContext): string {
  const lines: string[] = [];

  // Day significance
  lines.push(`[DAY] ${ctx.day.dayName} — ${ctx.day.energy}`);
  lines.push(`  Focus: ${ctx.day.focus}`);
  if (ctx.day.risk) {
    lines.push(`  Risk: ${ctx.day.risk}`);
  }
  lines.push(`  Suggestion: ${ctx.day.suggestion}`);

  // Week/month position
  lines.push(`[WEEK] ${ctx.weekPositionNote}`);
  lines.push(`[MONTH] ${ctx.monthPositionNote}`);

  // Season
  lines.push(`[SEASON] ${ctx.season.season.charAt(0).toUpperCase() + ctx.season.season.slice(1)} — ~${ctx.season.daylightHours}h daylight`);
  lines.push(`  ${ctx.season.awareness}`);

  // Special day
  if (ctx.specialDay) {
    lines.push(`[SPECIAL] ${ctx.specialDay}`);
  }

  return lines.join('\n');
}
