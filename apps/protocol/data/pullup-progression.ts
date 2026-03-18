export const PULLUP_PHASES = [
  {
    weeks: [3, 8] as [number, number],
    phase: 'Band-Assisted',
    description: '2 sets max BW reps (2-3 reps) + 3 sets band-assisted (6-8 reps) + 1 set slow negatives (3-5 reps, 5-second descent). Total: 20-25 reps per session.',
    sets: 6,
    expectedReps: '2-3 BW, 6-8 band',
    milestone: 'By week 8, expect 4-5 bodyweight reps at ~87.5kg',
  },
  {
    weeks: [9, 14] as [number, number],
    phase: 'Mixed BW + Band',
    description: '3-4 sets BW pull-ups (3-5 reps, 1-2 RIR) + 2 sets light band (6-8 reps). Add grease-the-groove on rest days: 1-2 pull-ups 2-3 times throughout the day.',
    sets: 5,
    expectedReps: '3-5 BW, 6-8 band',
    milestone: 'By week 14, expect 6-8 reps at ~83.5kg',
  },
  {
    weeks: [15, 22] as [number, number],
    phase: 'Bodyweight + Weighted',
    description: 'All BW pull-ups, 4-5 sets of 5-7 reps. When 3×8 achieved (likely weeks 18-20), begin adding 2.5-5kg via belt.',
    sets: 5,
    expectedReps: '5-7 BW or weighted',
    milestone: 'By week 22 at ~81kg, expect 10-12 bodyweight reps',
  },
]
