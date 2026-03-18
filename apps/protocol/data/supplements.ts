import type { Compound } from './types'

export const SUPPLEMENTS: Compound[] = [
  // ─── Medications ──────────────────────────────────────────────
  {
    name: 'Isotretinoin',
    category: 'medication',
    doses: [{ weeks: [3, 22], dose: '40mg', frequency: 'daily' }],
    timing: 'with_meal_1',
    withFood: 'requires_fat',
    weekdaysOnly: false,
    safetyNotes: [
      'ALT/AST > 3x upper limit of normal = reduce dose or stop',
      'Triglycerides > 500mg/dL = stop IMMEDIATELY (medical emergency)',
      'Joint dryness compounds with heavy training on a deficit — omega-3 and BPC-157 provide partial protection',
    ],
    mechanism:
      "Isotretinoin (Accutane) is a retinoid that shrinks sebaceous glands and reduces oil production by up to 90%. At 40mg/day, it dramatically clears cystic and nodular acne over 4-6 months. It's fat-soluble — without 40-50g of dietary fat in the same meal, oral bioavailability drops by 40-50%.",
    whyInProtocol:
      'Active acne treatment. Two months into the course. The high-fat breakfast is structured specifically to maximize isotretinoin absorption.',
  },
  {
    name: 'Enclomiphene',
    category: 'medication',
    doses: [{ weeks: [3, 22], dose: '12.5mg sublingual', frequency: 'Mon-Fri' }],
    timing: 'with_meal_1',
    withFood: true,
    weekdaysOnly: true,
    safetyNotes: [
      'Hold under tongue 60 seconds for sublingual absorption',
      'Weekdays only to prevent receptor downregulation',
    ],
    mechanism:
      'Selective estrogen receptor modulator (SERM) that blocks estrogen feedback at the pituitary, increasing LH and FSH secretion, which stimulates natural testosterone production. Sublingual delivery bypasses first-pass liver metabolism for better bioavailability.',
    whyInProtocol:
      'Supports testosterone levels during aggressive caloric deficit. A 1,000kcal deficit with physical labor can suppress testosterone — enclomiphene counters this without exogenous hormones.',
  },

  // ─── Peptides ─────────────────────────────────────────────────
  {
    name: 'CJC-1295 no DAC',
    category: 'peptide',
    doses: [
      { weeks: [3, 3], dose: '100mcg SubQ (days 1-3), then 200mcg SubQ', frequency: 'Mon-Fri' },
      { weeks: [4, 22], dose: '200mcg SubQ', frequency: 'Mon-Fri' },
    ],
    timing: 'pre_bed',
    withFood: false,
    weekdaysOnly: true,
    titration: [{ week: 3, dose: 100 }],
    safetyNotes: [
      'Must be >=60 minutes after last food — insulin suppresses GH release',
      'Weekends off for receptor sensitivity recovery',
      'Half dose (100mcg) for first 3 days of week 3 to assess tolerance',
    ],
    mechanism:
      'Growth hormone releasing hormone (GHRH) analog. Binds to GHRH receptors on the pituitary, triggering a pulse of growth hormone release. Combined with ipamorelin, it produces a synergistic GH pulse during deep sleep that mobilizes fatty acids from adipose tissue for overnight fat oxidation.',
    whyInProtocol:
      'Enhanced overnight fat mobilization. The GH pulse during sleep mobilizes fatty acids that are then burned during fasted morning cardio with yohimbine — a three-way synergistic fat-burning stack.',
  },
  {
    name: 'Ipamorelin',
    category: 'peptide',
    doses: [
      { weeks: [3, 3], dose: '100mcg SubQ (days 1-3), then 200mcg SubQ', frequency: 'Mon-Fri' },
      { weeks: [4, 22], dose: '200mcg SubQ', frequency: 'Mon-Fri' },
    ],
    timing: 'pre_bed',
    withFood: false,
    weekdaysOnly: true,
    titration: [{ week: 3, dose: 100 }],
    safetyNotes: [
      'Same syringe as CJC-1295',
      'Same timing rules — >=60 min after food, weekdays only',
      'Half dose first 3 days',
    ],
    mechanism:
      "Growth hormone secretagogue (GHS) that acts on ghrelin receptors to trigger GH release. Unlike GHRP-6, it doesn't significantly increase hunger or cortisol. Combined with CJC-1295, it amplifies the GH pulse beyond what either produces alone.",
    whyInProtocol:
      'Partners with CJC-1295 for maximum GH pulse during sleep. The overnight fat mobilization feeds directly into the fasted cardio fat-burning window.',
  },
  {
    name: 'BPC-157',
    category: 'peptide',
    doses: [{ weeks: [3, 22], dose: '250mcg SubQ', frequency: 'twice daily' }],
    timing: 'post_cardio + late_afternoon',
    withFood: false,
    weekdaysOnly: false,
    safetyNotes: [
      'Inject SubQ in abdomen, rotate sites',
      'Twice daily ~8-12 hours apart',
      'Every day including weekends',
    ],
    mechanism:
      'Body Protection Compound-157, a pentadecapeptide derived from human gastric juice. Accelerates tendon, ligament, muscle, and gut healing through upregulation of growth factor expression, angiogenesis, and nitric oxide-mediated pathways. 8-12 hour dosing interval maintains tissue levels.',
    whyInProtocol:
      "Connective tissue protection during rapid strength ramp-up. Returning to heavy training after 6 months off stresses tendons and ligaments that haven't adapted yet. BPC-157 accelerates this adaptation and reduces injury risk.",
  },
  {
    name: 'TB-500',
    category: 'peptide',
    doses: [
      { weeks: [3, 6], dose: '2.5mg SubQ', frequency: 'Mon+Thu' },
      { weeks: [7, 22], dose: '2.5mg SubQ', frequency: 'Mon only' },
    ],
    timing: 'late_afternoon',
    withFood: false,
    weekdaysOnly: true,
    loadingPhase: { weeks: [3, 6], frequency: 'Mon+Thu' },
    safetyNotes: [
      'Loading: 2x/week (Mon+Thu) weeks 3-6',
      'Maintenance: 1x/week (Mon only) weeks 7-22',
    ],
    mechanism:
      'Thymosin Beta-4 fragment that promotes cell migration, blood vessel formation, and tissue repair. Loading phase saturates tissue reservoirs, then maintenance sustains repair capacity. Particularly effective for tendon and ligament healing.',
    whyInProtocol:
      'Connective tissue repair during the critical ramp-up phase when training loads increase rapidly. Works synergistically with BPC-157.',
  },
  {
    name: 'GHK-Cu',
    category: 'peptide',
    doses: [{ weeks: [3, 22], dose: '1.5mg SubQ', frequency: 'Mon-Fri' }],
    timing: 'late_afternoon',
    withFood: false,
    weekdaysOnly: true,
    safetyNotes: [
      'Different injection site from BPC-157 when taken at same time',
    ],
    mechanism:
      'Copper peptide that activates tissue remodeling, collagen synthesis, and anti-inflammatory pathways. Supports skin healing during isotretinoin treatment and enhances recovery between training sessions.',
    whyInProtocol:
      'Skin healing support alongside isotretinoin, plus general tissue recovery during the deficit.',
  },

  // ─── Supplements ──────────────────────────────────────────────
  {
    name: 'Yohimbine HCL',
    category: 'supplement',
    doses: [
      { weeks: [3, 4], dose: '5mg' },
      { weeks: [5, 6], dose: '10mg' },
      { weeks: [7, 8], dose: '15mg' },
      { weeks: [9, 22], dose: '20mg (safety-capped by bodyweight)' },
    ],
    timing: 'fasted_am',
    withFood: false,
    weekdaysOnly: false,
    safetyNotes: [
      'FASTED ONLY — insulin negates the mechanism entirely',
      'WORK DAY CAP: 5mg ABSOLUTE — elevated HR + heights + heat = danger',
      'Never exceed 0.2mg/kg bodyweight',
      'Titrate slowly: 5mg weeks 3-4, 10mg weeks 5-6, 15mg weeks 7-8, 20mg (capped by safety) week 9+',
    ],
    mechanism:
      'Alpha-2 adrenergic receptor antagonist. Stubborn fat (lower abdomen, lower back) has high alpha-2 receptor density that normally inhibits lipolysis. Yohimbine blocks these receptors, allowing catecholamines to activate fat release from these areas. Only works in a fasted, low-insulin state — eating negates the effect entirely.',
    whyInProtocol:
      'Targets the most stubborn fat stores that resist normal dieting. Combined with overnight GH-mobilized fatty acids and fasted cardio, this creates a triple-threat fat-burning window.',
  },
  {
    name: 'TUDCA',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '500mg', frequency: 'daily' }],
    timing: 'fasted_am',
    withFood: false,
    weekdaysOnly: false,
    safetyNotes: ['Empty stomach for bile acid signaling'],
    mechanism:
      'Tauroursodeoxycholic acid — a bile acid that protects hepatocytes from damage by reducing endoplasmic reticulum stress and preventing mitochondrial dysfunction. It counteracts the hepatotoxic effects of isotretinoin.',
    whyInProtocol:
      'Liver protection. Isotretinoin is processed by the liver and can elevate ALT/AST. TUDCA taken on an empty stomach provides direct hepatoprotective support.',
  },
  {
    name: 'NAC',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '600mg', frequency: 'twice daily' }],
    timing: 'with_meal_1 + with_meal_5',
    withFood: true,
    weekdaysOnly: false,
    safetyNotes: [],
    mechanism:
      "N-Acetyl Cysteine — precursor to glutathione, the body's master antioxidant. Supports Phase II liver detoxification, reduces oxidative stress from heavy training, and provides additional hepatoprotection alongside TUDCA.",
    whyInProtocol:
      'Second layer of liver protection during isotretinoin treatment, plus antioxidant support during high-volume training on a deficit.',
  },
  {
    name: 'Creatine',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '5g', frequency: 'daily' }],
    timing: 'with_meal_1',
    withFood: true,
    weekdaysOnly: false,
    safetyNotes: [
      "Adds 1.5-2.5kg stable water weight — don't panic at the scale",
      'Mix in water, take with food',
    ],
    mechanism:
      'Increases phosphocreatine stores in muscle, allowing faster ATP regeneration during high-intensity efforts. Also draws water into muscle cells (1.5-2.5kg stable weight gain), supporting hydration and potentially enhancing muscle protein synthesis.',
    whyInProtocol:
      'Strength and power output maintenance during caloric deficit. The intramuscular water adds 1.5-2.5kg to scale weight that won\'t drop — factor this into weekly weigh-ins.',
  },
  {
    name: 'Berberine',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '500mg', frequency: '3x daily with carb meals' }],
    timing: 'with_meal_1 + with_meal_3 + with_meal_4',
    withFood: true,
    weekdaysOnly: false,
    safetyNotes: ['Only with carb-containing meals — skip if a meal is very low carb'],
    mechanism:
      'Activates AMPK (AMP-activated protein kinase), improving glucose uptake into muscle cells and reducing blood sugar spikes from carbohydrate-heavy meals. Also has mild effects on lipid metabolism.',
    whyInProtocol:
      'Blood sugar management during a structured carbohydrate intake. Better glucose partitioning means more carbs go to muscle glycogen instead of fat storage.',
  },
  {
    name: 'HMB',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '1g', frequency: '3x daily' }],
    timing: 'with_meal_1 + with_meal_3 + with_meal_4',
    withFood: true,
    weekdaysOnly: false,
    safetyNotes: [],
    mechanism:
      'Beta-Hydroxy Beta-Methylbutyrate — a leucine metabolite that reduces muscle protein breakdown (proteolysis) through the ubiquitin-proteasome pathway. Most effective during caloric deficits when muscle breakdown signals are elevated.',
    whyInProtocol:
      'Anti-catabolic protection. During a 1,000kcal deficit with heavy training, muscle protein breakdown is elevated. HMB reduces this breakdown signal.',
  },
  {
    name: 'Zinc',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '50mg', frequency: 'every other day' }],
    timing: 'with_meal_1',
    withFood: true,
    weekdaysOnly: false,
    safetyNotes: ['Every other day ONLY — excess zinc depletes copper'],
    mechanism:
      'Essential mineral for testosterone production, immune function, and wound healing. Involved in over 300 enzymatic reactions. Excess zinc depletes copper, so every-other-day dosing prevents copper depletion while maintaining zinc sufficiency.',
    whyInProtocol:
      'Testosterone support and immune function during a deficit. Every-other-day to avoid copper depletion.',
  },
  {
    name: 'Omega-3',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '4g fish oil', frequency: 'daily' }],
    timing: 'with_meal_1',
    withFood: true,
    weekdaysOnly: false,
    safetyNotes: [],
    mechanism:
      'EPA and DHA reduce systemic inflammation, improve lipid profiles, and support joint lubrication. At 4g/day, omega-3s partially counteract isotretinoin-induced dyslipidemia (elevated triglycerides) and provide joint protection during heavy training.',
    whyInProtocol:
      'Triple purpose: isotretinoin lipid management, joint protection during heavy lifting, and anti-inflammatory support during a deficit.',
  },
  {
    name: 'Magnesium Glycinate',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '400mg', frequency: 'daily' }],
    timing: 'pre_bed',
    withFood: false,
    weekdaysOnly: false,
    safetyNotes: [],
    mechanism:
      'Highly bioavailable magnesium form bonded to glycine. Supports sleep quality, muscle relaxation, and reduces cortisol. A 2025 RCT found it significantly reduced insomnia severity within 14 days. The glycine bond provides additional calming effects.',
    whyInProtocol:
      'Sleep quality is the highest-leverage recovery variable. Participants sleeping 5.5 hours lost 55% less fat and 60% more lean mass than those sleeping 8.5 hours. Magnesium directly supports deep sleep.',
  },
  {
    name: 'Glycine',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '3g', frequency: 'daily' }],
    timing: 'pre_bed',
    withFood: false,
    weekdaysOnly: false,
    safetyNotes: [],
    mechanism:
      'Amino acid that lowers core body temperature — a key trigger for sleep onset. Acts on NMDA receptors to promote deeper slow-wave sleep. Synergizes with magnesium for sleep quality.',
    whyInProtocol:
      'Sleep optimization stack with magnesium. Lower core temp = faster sleep onset = more time in deep sleep = better recovery and fat loss partitioning.',
  },

  // ─── Electrolytes ─────────────────────────────────────────────
  {
    name: 'Sodium',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '1-2g supplemental (2-3g on work days)', frequency: 'daily' }],
    timing: 'with meals',
    withFood: true,
    weekdaysOnly: false,
    safetyNotes: [],
    mechanism:
      'Primary extracellular electrolyte. Sweat losses during physical labor can reach 2,000-7,000mg per day. On a restricted diet, dietary sodium falls short.',
    whyInProtocol:
      "Prevents hyponatremia during deficit + physical labor + heavy sweating. Don't fear sodium — with heavy sweating, low sodium is the real risk.",
  },
  {
    name: 'Potassium',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '200-400mg from lite salt', frequency: 'daily' }],
    timing: 'with meals',
    withFood: true,
    weekdaysOnly: false,
    safetyNotes: [],
    mechanism:
      'Primary intracellular electrolyte for muscle contraction and heart function. Target 3,500-5,000mg total daily from food + supplements.',
    whyInProtocol:
      'Prevents muscle cramps and supports heart function during heavy sweating and physical labor.',
  },
  {
    name: 'Magnesium Citrate',
    category: 'supplement',
    doses: [{ weeks: [3, 22], dose: '200mg', frequency: 'traveling days only' }],
    timing: 'with_meal_3',
    withFood: true,
    weekdaysOnly: false,
    safetyNotes: [],
    mechanism:
      'Additional magnesium for heavy labor days when sweat losses increase magnesium depletion beyond what the nightly 400mg glycinate covers.',
    whyInProtocol:
      'Extra magnesium on heavy physical labor days only. The bedtime glycinate covers normal days.',
  },
]
