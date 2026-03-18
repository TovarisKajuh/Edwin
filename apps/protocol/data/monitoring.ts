export const DAILY_CHECKS = {
  time: '06:00',
  items: [
    {
      name: 'Weigh-in',
      instructions: 'Naked, after bathroom. Log 7-day rolling average.',
      explanation:
        'Daily fluctuations of 1-3kg are normal from water, sodium, and bowel contents. Only the 7-day average matters.',
    },
    {
      name: 'HRV Reading',
      instructions: '60-second reading via app or wearable.',
      explanation:
        'Heart rate variability indicates recovery status. Trending down over 3-5 days signals accumulated fatigue.',
    },
    {
      name: 'Resting Heart Rate',
      instructions: 'Record from HRV reading.',
      explanation:
        'A persistent elevation of 5+ bpm above baseline for 3-5 days signals overreaching.',
    },
    {
      name: 'Subjective Wellness',
      instructions: 'Rate 1-10: Energy, Mood, Sleep Quality, Motivation, Soreness.',
      explanation:
        'Five markers tracked daily. If energy consistently \u22644/10 for a full week, trigger recovery protocol.',
    },
  ],
}

export const BLOODWORK_PANELS: Record<
  number,
  {
    name: string
    markers: { name: string; why: string; alert: string }[]
  }
> = {
  12: {
    name: 'Full Panel #1',
    markers: [
      {
        name: 'Liver enzymes (ALT, AST, GGT, bilirubin)',
        why: 'Isotretinoin hepatotoxicity check',
        alert: 'ALT/AST > 3\u00D7 ULN = reduce/stop isotretinoin',
      },
      {
        name: 'Lipid panel (total cholesterol, LDL, HDL, triglycerides)',
        why: 'Isotretinoin dyslipidemia monitoring',
        alert: 'Triglycerides > 500mg/dL = STOP isotretinoin immediately',
      },
      {
        name: 'Fasting glucose + HbA1c',
        why: 'Metabolic health during deficit',
        alert: 'Fasting glucose > 126 mg/dL = consult physician',
      },
      {
        name: 'Total + Free Testosterone, SHBG',
        why: 'Testosterone status on enclomiphene',
        alert: 'Monitor for response to SERM',
      },
      {
        name: 'LH, FSH',
        why: 'Pituitary function check (enclomiphene target)',
        alert: 'Elevated = enclomiphene working',
      },
      {
        name: 'IGF-1',
        why: 'Growth hormone response to CJC/Ipa',
        alert: 'Elevated above baseline = peptides working',
      },
      {
        name: 'CBC (Complete Blood Count)',
        why: 'General health, anemia screening during deficit',
        alert: 'Low hemoglobin/hematocrit with heavy labor = iron concern',
      },
      {
        name: 'CK (Creatine Kinase)',
        why: 'Muscle damage marker',
        alert: 'Persistently elevated = overtraining',
      },
      {
        name: 'CRP',
        why: 'Systemic inflammation',
        alert: 'Elevated = excess stress or illness',
      },
      {
        name: 'Ferritin',
        why: 'Iron stores (often depleted with physical labor + deficit)',
        alert: '< 30 ng/mL = supplement iron',
      },
      {
        name: 'Vitamin D',
        why: 'Baseline check (likely good from outdoor work)',
        alert: '< 30 ng/mL = supplement',
      },
    ],
  },
  16: {
    name: 'Abbreviated Panel #2',
    markers: [
      {
        name: 'Liver enzymes',
        why: 'Ongoing isotretinoin monitoring',
        alert: 'Same thresholds as panel #1',
      },
      {
        name: 'Lipid panel',
        why: 'Ongoing lipid check',
        alert: 'Same thresholds',
      },
      {
        name: 'Total + Free Testosterone',
        why: 'Mid-protocol testosterone status',
        alert: 'Compare to panel #1',
      },
      {
        name: 'IGF-1',
        why: 'Continued GH response',
        alert: 'Compare to panel #1',
      },
      {
        name: 'Fasting glucose',
        why: 'Metabolic check',
        alert: 'Same thresholds',
      },
      {
        name: 'CBC',
        why: 'General health',
        alert: 'Same thresholds',
      },
    ],
  },
  21: {
    name: 'Full Panel #3 (End of Protocol)',
    markers: [
      {
        name: 'Liver enzymes (ALT, AST, GGT, bilirubin)',
        why: 'Final isotretinoin check before reverse diet',
        alert: 'Same thresholds',
      },
      {
        name: 'Lipid panel',
        why: 'Final lipid assessment',
        alert: 'Same thresholds',
      },
      {
        name: 'Fasting glucose + HbA1c',
        why: 'End-of-deficit metabolic status',
        alert: 'Same thresholds',
      },
      {
        name: 'Total + Free Testosterone, SHBG',
        why: 'End-of-protocol hormonal status',
        alert: 'Compare to panels #1 and #2',
      },
      {
        name: 'LH, FSH',
        why: 'Pituitary function',
        alert: 'Compare to panel #1',
      },
      {
        name: 'IGF-1',
        why: 'Long-term GH response',
        alert: 'Compare to panels #1 and #2',
      },
      {
        name: 'CBC',
        why: 'Final health check',
        alert: 'Same thresholds',
      },
      {
        name: 'CK',
        why: 'Recovery status',
        alert: 'Same thresholds',
      },
      {
        name: 'CRP',
        why: 'Inflammation at end of protocol',
        alert: 'Same thresholds',
      },
      {
        name: 'Ferritin',
        why: 'Iron stores after 22 weeks of deficit + labor',
        alert: 'Same thresholds',
      },
      {
        name: 'Vitamin D',
        why: 'Final check',
        alert: 'Same thresholds',
      },
    ],
  },
}

export const OVERTRAINING_FLAGS = {
  yellow: {
    name: 'Yellow Flag',
    trigger: 'One bad session, mild fatigue lasting 1-2 days',
    response:
      'Continue training but reduce RPE to 7 for all sets. Cut 1 set from each exercise. Ensure 7+ hours sleep, protein targets met, adequate hydration. Add one extra rest day.',
    note: 'This is normal fluctuation \u2014 especially on weeks with 5 labor days.',
  },
  orange: {
    name: 'Orange Flag',
    trigger:
      'Performance declining 2+ consecutive weeks, persistent sleep disruption, mood changes, elevated RHR',
    response:
      'Immediate unscheduled deload: 5-7 days at 50% volume, loads reduced to 60-70%. Simultaneously increase calories to maintenance. If symptoms persist, reduce yohimbine to 5mg and eliminate one gym session per week.',
    note: 'This addresses both training and nutritional stress simultaneously.',
  },
  red: {
    name: 'Red Flag',
    trigger:
      'Performance decline 3+ weeks, recurring illness, significant mood disturbance, libido collapse, RHR 10+ bpm elevated',
    response:
      'Full training cessation 5-7 days (light walking only). Return to maintenance calories immediately. Sleep 9+ hours. Consult physician to rule out: thyroid dysfunction, severe iron deficiency, hepatic stress from isotretinoin. When returning, restart at 50% volume and 60% loads.',
    note: 'Consider reducing deficit to 500kcal for remainder of protocol.',
  },
}
