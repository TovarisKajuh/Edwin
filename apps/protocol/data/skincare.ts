export const SKINCARE_AM = [
  {
    step: 1,
    product: 'Nizoral 2%',
    area: 'back/buttocks',
    instructions: 'Apply in shower, leave 5 minutes, rinse',
    mechanism:
      'Ketoconazole antifungal — reduces pityrosporum folliculitis and seborrheic dermatitis that can worsen during isotretinoin.',
  },
  {
    step: 2,
    product: 'CeraVe Moisturizing Cream',
    area: 'face and body',
    instructions: 'Apply to damp skin post-shower',
    mechanism:
      'Ceramide-based moisturizer restores skin barrier damaged by isotretinoin-induced dryness.',
  },
  {
    step: 3,
    product: 'Mineral SPF50',
    area: 'face',
    instructions: 'Apply as final step before leaving',
    mechanism:
      'Isotretinoin makes skin photosensitive. Mineral (zinc oxide/titanium dioxide) sunscreen is non-irritating on retinoid-treated skin.',
  },
]

export const SKINCARE_PM = [
  {
    step: 1,
    product: 'PanOxyl 10% / La Roche-Posay SA wash',
    area: 'back/buttocks',
    instructions:
      'Alternate between products. Apply in shower, leave 2-3 minutes, rinse',
    mechanism:
      'Benzoyl peroxide (PanOxyl) kills acne bacteria; salicylic acid (LRP) exfoliates pores. Alternating prevents over-irritation.',
  },
  {
    step: 2,
    product: 'Tretinoin 0.1%',
    area: 'buttocks only',
    instructions:
      'Apply thin layer to dry skin, wait 10 minutes before moisturizer',
    mechanism:
      'Topical retinoid accelerates cell turnover in acne-prone area. Do not use on areas treated with isotretinoin orally — too much retinoid.',
  },
  {
    step: 3,
    product: 'CeraVe Moisturizing Cream',
    area: 'body (not over tretinoin)',
    instructions: 'Apply after tretinoin has dried',
    mechanism: 'Barrier repair and hydration.',
  },
  {
    step: 4,
    product: 'Azelaic Acid',
    area: 'nose',
    instructions: 'Apply thin layer, let absorb',
    mechanism:
      'Anti-inflammatory and anti-pigmentation. Targets rosacea-prone nose area.',
  },
  {
    step: 5,
    product: 'CeraVe Moisturizing Cream',
    area: 'face',
    instructions: 'Final layer over azelaic acid',
    mechanism:
      'Seals in actives and prevents transepidermal water loss.',
  },
]

export const BLEACH_BATH = {
  frequency: 'Weekly (Sunday PM)',
  instructions:
    '1/4 cup 6% bleach in half tub of lukewarm water. Soak 10 minutes. Rinse thoroughly. Moisturize immediately after.',
  mechanism:
    'Dilute sodium hypochlorite reduces bacterial load on skin, particularly Staphylococcus aureus. Used in dermatology for eczema and folliculitis management alongside isotretinoin.',
}
