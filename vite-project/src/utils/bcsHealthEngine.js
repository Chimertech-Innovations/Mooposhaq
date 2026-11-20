/**
 * Mooposhaq AI Vision (BCS + Mastitis + Disease Detection) -> Precision Feed Engine
 * Bridges external BCS scoring, Mastitis detection, and Cattle Disease detection models
 * directly with Mooposhaq NASEM 2021 / ICAR feed recommendations.
 */

export const DISEASE_PROTOCOLS = {
  healthy: {
    code: 'healthy',
    name: 'Healthy (No Disease Detected)',
    shortLabel: 'Healthy',
    category: 'normal',
    severity: 'none',
    color: '#16a34a',
    bgLight: '#dcfce7',
    borderLight: '#86efac',
    canImproveWithFeed: false,
    nelMultiplier: 1.0,
    cpMultiplier: 1.0,
    mineralMixMultiplier: 1.0,
    waterMultiplier: 1.0,
    minNdfPct: 28.0,
    maxConcDmPct: 40.0,
    preferSoftMash: false,
    summary: 'No clinical or subclinical disease detected. Follow Mooposhaq balanced ration for production and target BCS.',
    feedAdjustments: [],
    recommendedFeedsToIncrease: [],
    feedsToLimit: [],
    supplements: [],
    feedingManagement: []
  },
  subclinical_mastitis: {
    code: 'subclinical_mastitis',
    name: 'Subclinical Mastitis (Elevated SCC / Udder Immunity)',
    shortLabel: 'Subclinical Mastitis',
    category: 'mastitis',
    severity: 'moderate',
    color: '#d97706',
    bgLight: '#fef3c7',
    borderLight: '#fcd34d',
    canImproveWithFeed: true,
    nelMultiplier: 1.03,
    cpMultiplier: 1.05,
    mineralMixMultiplier: 1.40,
    waterMultiplier: 1.08,
    minNdfPct: 31.0,
    maxConcDmPct: 35.0,
    preferSoftMash: false,
    summary: 'Teat keratin plug formation and mammary neutrophil defense require elevated Zinc, Selenium, Vitamin E, and Beta-Carotene from fresh green fodder, while keeping Concentrate DM <= 35% to prevent acidosis-induced SCC spikes.',
    feedAdjustments: [
      'Increase fresh green fodder (CO-4 Hybrid Napier / Lucerne / Cowpea / Berseem) by +15% for natural Beta-Carotene (pro-Vitamin A) to repair mammary epithelium.',
      'Cap concentrate DM at <= 35% of total DMI and maintain dietary NDF >= 31% to prevent subacute ruminal acidosis (SARA) and endotoxin translocation to the udder.',
      'Boost ISI Type-II Chelated Mineral Mixture by +40% (80–110 g/day) for Zinc, Copper, and Selenium udder immunity.'
    ],
    recommendedFeedsToIncrease: [
      'Hybrid Napier (CO-4 / Super Napier)',
      'Lucerne (Alfalfa) / Cowpea / Berseem Green Fodder',
      'Groundnut Cake / Cottonseed Cake (moderate bypass protein)'
    ],
    feedsToLimit: [
      'Excess finely ground Maize / Wheat grain (>35% DMI causes acidosis & raises somatic cell count)',
      'Damp or moldy oilseed cakes / silage (mycotoxins suppress udder leukocyte immunity)'
    ],
    supplements: [
      { name: 'Trisodium Citrate', dosage: '30 g/day for 7–10 days', purpose: 'Restores normal milk pH (~6.5) and buffers udder tissue inflammation' },
      { name: 'Chelated Zinc + Vitamin E + Selenium', dosage: 'Zn 400 mg + Vit E 1000 IU + Se 3 mg/day', purpose: 'Strengthens teat canal keratin barrier and lowers Somatic Cell Count (SCC)' },
      { name: 'ISI Type-II Chelated Mineral Mixture', dosage: '+40% above baseline (80–110 g/day)', purpose: 'Antioxidant trace mineral reinforcement (Cu, Zn, Mn, Se)' }
    ],
    feedingManagement: [
      'Offer fresh green fodder immediately after milking so the cow stays standing for 45–60 minutes while the teat canal closes.'
    ]
  },
  clinical_mastitis: {
    code: 'clinical_mastitis',
    name: 'Clinical Mastitis (Acute Udder Swelling / Clots in Milk)',
    shortLabel: 'Clinical Mastitis',
    category: 'mastitis',
    severity: 'high',
    color: '#dc2626',
    bgLight: '#fee2e2',
    borderLight: '#fca5a5',
    canImproveWithFeed: true,
    nelMultiplier: 1.05,
    cpMultiplier: 1.08,
    mineralMixMultiplier: 1.50,
    waterMultiplier: 1.15,
    minNdfPct: 33.0,
    maxConcDmPct: 30.0,
    preferSoftMash: false,
    summary: 'Acute mammary inflammation requires high ruminal fiber buffering (NDF >= 33%), reduced fermentable grain starch (<= 30% concentrate DM), +50% chelated minerals (Zn, Se, Cu), Vitamin E/A, and +15% clean drinking water.',
    feedAdjustments: [
      'Reduce heavy starchy grain concentrates to <= 30% of DMI during acute inflammation to prevent ruminal acidosis and systemic endotoxemia.',
      'Feed high-quality green legume/grass fodder (20–25 kg/day) + digestible dry roughage (NDF >= 33%) to keep rumen pH > 6.2.',
      'Increase Mineral Mixture by +50% (100–120 g/day) and clean drinking water by +15%.'
    ],
    recommendedFeedsToIncrease: [
      'Lucerne / Cowpea / Tender Hybrid Napier Green Fodder',
      'Wheat Bran (cooling, fibrous concentrate source)',
      'Clean shaded drinking water (+15% volume)'
    ],
    feedsToLimit: [
      'High-starch grains (Maize, Sorghum, Broken Rice) — cap at 30% DMI',
      'Acidic or poorly fermented silage'
    ],
    supplements: [
      { name: 'Trisodium Citrate + Vitamin E/Se Powder', dosage: '30–40 g Trisodium Citrate + 1500 IU Vit E/day', purpose: 'Reduces udder edema, normalizes milk citrate buffer, and speeds epithelial repair' },
      { name: 'Chelated Trace Mineral Mixture', dosage: '100–120 g/day (+50% therapeutic dose)', purpose: 'Replenishes Zinc, Selenium, and Copper depleted during acute infection' },
      { name: 'Live Yeast (Saccharomyces cerevisiae) + Sodium Bicarbonate', dosage: '15 g Yeast + 60 g NaHCO3/day', purpose: 'Stabilizes rumen microflora during veterinary antibiotic treatment' }
    ],
    feedingManagement: [
      'Feed fresh green fodder right after milking to keep the cow standing for at least 1 hour.',
      'Split concentrate into 3–4 small meals instead of 2 heavy meals.'
    ]
  },
  lumpy_skin_disease: {
    code: 'lumpy_skin_disease',
    name: 'Lumpy Skin Disease (LSD) — Viral Skin Nodules & Fever Recovery',
    shortLabel: 'Lumpy Skin Disease (LSD)',
    category: 'infectious_skin',
    severity: 'high',
    color: '#be123c',
    bgLight: '#ffe4e6',
    borderLight: '#fda4af',
    canImproveWithFeed: true,
    nelMultiplier: 1.12,
    cpMultiplier: 1.15,
    mineralMixMultiplier: 1.45,
    waterMultiplier: 1.20,
    minNdfPct: 30.0,
    maxConcDmPct: 38.0,
    preferSoftMash: true,
    summary: 'LSD causes fever, painful oral/muzzle lesions, and deep dermal nodules. Recovery requires soft wet-mash concentrate sweetened with Cane Molasses/Jaggery, finely chaffed tender green fodder, +15% digestible protein for skin healing, and +45% Zinc/Copper/Vitamin A/E/C.',
    feedAdjustments: [
      'Convert dry pelleted/grain concentrate into a warm Soft Wet Mash mixed with 0.5–0.8 kg Cane Molasses or Jaggery water so the cow eats comfortably despite oral/muzzle lesions.',
      'Increase Crude Protein allowance by +15% using easily digestible oilseed cakes (Groundnut Cake, Soybean Meal) and Wheat Bran to accelerate dermal tissue and wound regeneration.',
      'Chaff tender green fodder (Lucerne, Cowpea, young Napier) finely (2–3 cm) and avoid harsh woody stalks that irritate mouth lesions.',
      'Boost Mineral Mixture by +45% (rich in Zinc, Copper, Vitamin A & E) and provide electrolyte-enriched water (+20%).'
    ],
    recommendedFeedsToIncrease: [
      'Finely Chaffed Tender Green Fodder (Lucerne, Cowpea, Berseem, Young Napier)',
      'Cane Molasses (0.5–0.8 kg/day) + Wheat Bran + Groundnut/Soybean Cake as soft wet mash',
      'Electrolyte & Jaggery-enriched drinking water'
    ],
    feedsToLimit: [
      'Unchaffed coarse dry paddy/wheat straw or woody sorghum stalks (causes oral pain & feed refusal)',
      'Dry dusty mash or hard pellets without soaking'
    ],
    supplements: [
      { name: 'Zinc + Copper + Vitamin A, D3, E, C Boost', dosage: '90–110 g Chelated Mineral Mix + 5 g Vit C/day', purpose: 'Accelerates skin nodule healing, collagen synthesis, and antiviral mucosal immunity' },
      { name: 'Cane Molasses / Jaggery Energy Drench', dosage: '500–750 g/day mixed in wet bran mash', purpose: 'Combats fever-induced negative energy balance and stimulates appetite' },
      { name: 'Rumen Probiotic Yeast + B-Complex Vitamins', dosage: '15 g Yeast + 20 ml Liquid B-Complex/day', purpose: 'Restores rumen motility and appetite after high fever' }
    ],
    feedingManagement: [
      'Soak concentrate mixture in warm water with molasses/jaggery for 20–30 minutes before feeding.',
      'Offer small, frequent meals 4–5 times daily in shaded troughs.'
    ]
  },
  fmd_recovery: {
    code: 'fmd_recovery',
    name: 'Foot & Mouth Disease (FMD) — Oral Blister & Hoof Ulcer Recovery',
    shortLabel: 'FMD Recovery',
    category: 'infectious_skin',
    severity: 'high',
    color: '#9f1239',
    bgLight: '#ffe4e6',
    borderLight: '#fda4af',
    canImproveWithFeed: true,
    nelMultiplier: 1.12,
    cpMultiplier: 1.14,
    mineralMixMultiplier: 1.40,
    waterMultiplier: 1.20,
    minNdfPct: 30.0,
    maxConcDmPct: 38.0,
    preferSoftMash: true,
    summary: 'FMD causes severe tongue/gum blisters and interdigital hoof ulcers. Mooposhaq prescribes a zero-scratch soft gruel/wet mash (Wheat Bran + Rice Gruel + Cane Molasses + Oilseed Cake), finely chopped lush green leaves, and +40% Zinc/Biotin/Vitamin A.',
    feedAdjustments: [
      'Prepare a soothing semi-solid Gruel & Wet Mash using Wheat Bran, Rice Bran/Gruel, Groundnut Cake, and 0.6–0.9 kg Cane Molasses.',
      'Avoid coarse dry straw completely until oral blisters heal; feed only tender, finely chopped green leafy fodder (Lucerne, Berseem, Cowpea leaves).',
      'Zero walking distance (stall-feed water & mash) due to painful hoof ulcers, and increase energy & protein density (+12% NEL, +14% CP) to reverse rapid BCS loss.'
    ],
    recommendedFeedsToIncrease: [
      'Soaked Wheat Bran + Groundnut/Soybean Cake + Cane Molasses Gruel',
      'Tender Leafy Green Fodder (Lucerne, Cowpea, Moringa leaves)',
      'Cool clean water at stall level'
    ],
    feedsToLimit: [
      'Hard dry roughage (Paddy Straw, Wheat Straw, Dry Maize Stover) during active mouth ulcers',
      'Coarse crushed grains with sharp husks'
    ],
    supplements: [
      { name: 'Zinc + Biotin + Vitamin A & E Epithelial Pack', dosage: '100 g Chelated Mineral Mix + 20 mg Biotin/day', purpose: 'Regenerates tongue/gum mucosa and hardens hoof horn after FMD lesions' },
      { name: 'Cane Molasses / Jaggery + Electrolytes', dosage: '600–900 g/day in gruel', purpose: 'Instant glucogenic energy when chewing is painful' }
    ],
    feedingManagement: [
      'Keep the cow on soft dry bedding with water and soft mash within immediate reach.'
    ]
  },
  tick_fever_recovery: {
    code: 'tick_fever_recovery',
    name: 'Tick Fever Recovery (Theileriosis / Babesiosis / Anaplasmosis)',
    shortLabel: 'Tick Fever Recovery',
    category: 'infectious_skin',
    severity: 'high',
    color: '#b91c1c',
    bgLight: '#fee2e2',
    borderLight: '#fca5a5',
    canImproveWithFeed: true,
    nelMultiplier: 1.10,
    cpMultiplier: 1.16,
    mineralMixMultiplier: 1.45,
    waterMultiplier: 1.18,
    minNdfPct: 30.0,
    maxConcDmPct: 38.0,
    preferSoftMash: true,
    summary: 'Tick-borne hemoprotozoan fevers destroy red blood cells (anemia) and stress the liver. Recovery requires +16% high-biological-value protein for RBC synthesis, Iron/Copper/Cobalt/Folate/B12 enrichment, and Cane Molasses for liver glycogen support.',
    feedAdjustments: [
      'Increase Crude Protein by +16% using high-digestibility protein sources (Soybean Meal, Groundnut Cake, Lucerne/Cowpea) to supply amino acids for hemoglobin & RBC regeneration.',
      'Include 0.5–0.8 kg/day Cane Molasses or Jaggery to replenish liver glycogen during post-fever recovery.',
      'Boost Mineral Mixture by +45% (bioavailable Iron, Copper, Cobalt, and Phosphorus) to cure hemolytic anemia.'
    ],
    recommendedFeedsToIncrease: [
      'Iron & Folate-rich Green Legumes (Lucerne, Cowpea, Berseem, Moringa)',
      'High-protein Oilseed Cakes (Soybean Meal, Groundnut Cake) + Wheat Bran',
      'Cane Molasses (0.5–0.8 kg/day)'
    ],
    feedsToLimit: [
      'Poorly stored cakes that overburden a recovering liver',
      'Low-digestibility dry straw as sole roughage'
    ],
    supplements: [
      { name: 'Hematinic Mineral Mix (Fe + Cu + Co + B12 + Folic Acid)', dosage: '100 g Mineral Mix + 30 ml Hematinic/Liver Tonic daily', purpose: 'Accelerates red blood cell (RBC) and hemoglobin recovery' },
      { name: 'Hepatoprotective Choline + B-Complex', dosage: '15 g Rumen-Protected Choline/day', purpose: 'Supports liver recovery from jaundice' }
    ],
    feedingManagement: [
      'Feed palatable wet concentrate mash with molasses twice daily in a cool shaded stall.'
    ]
  },
  ketosis: {
    code: 'ketosis',
    name: 'Ketosis / Negative Energy Balance (Acetonemia)',
    shortLabel: 'Ketosis',
    category: 'metabolic',
    severity: 'high',
    color: '#7c3aed',
    bgLight: '#f3e8ff',
    borderLight: '#d8b4fe',
    canImproveWithFeed: true,
    nelMultiplier: 1.15,
    cpMultiplier: 1.05,
    mineralMixMultiplier: 1.25,
    waterMultiplier: 1.10,
    minNdfPct: 29.0,
    maxConcDmPct: 40.0,
    preferSoftMash: false,
    summary: 'Ketosis occurs when milk energy drain exceeds glucogenic intake. Mooposhaq increases Net Energy (NEL) by +15% using glucogenic concentrates (Maize grain, Cane Molasses up to 0.8–1.0 kg/day) and digestible green forage.',
    feedAdjustments: [
      'Increase Net Energy (NEL) supply by +15% through propionic-acid-producing glucogenic feeds (Crushed Maize Grain, Wheat Bran) within the safe 40% Concentrate DM limit.',
      'Add 0.75–1.0 kg/day Cane Molasses or Jaggery to supply rapid glucose precursors.',
      'Replace low-energy dry paddy straw with high-digestibility green fodder (Maize Fodder, Hybrid Napier).'
    ],
    recommendedFeedsToIncrease: [
      'Maize Grain / Energy Concentrate Mix',
      'Cane Molasses (0.75–1.0 kg/day)',
      'Green Maize Fodder / Hybrid Napier'
    ],
    feedsToLimit: [
      'Poor-quality dry straw that fills the rumen without providing energy'
    ],
    supplements: [
      { name: 'Propylene Glycol / Glycerol Oral Drench', dosage: '250–300 ml/day for 5 days', purpose: 'Direct hepatic glucose precursor that lowers blood ketone bodies' },
      { name: 'Rumen-Protected Choline + Niacin (Vit B3)', dosage: '15 g Choline + 6 g Niacin/day', purpose: 'Exports fat from the liver and prevents fatty liver syndrome' }
    ],
    feedingManagement: [
      'Feed concentrate in 3–4 meals/day mixed with green fodder.'
    ]
  },
  rumen_acidosis: {
    code: 'rumen_acidosis',
    name: 'Rumen Acidosis / SARA (Low Rumen pH & Milk Fat Drop)',
    shortLabel: 'Rumen Acidosis (SARA)',
    category: 'metabolic',
    severity: 'high',
    color: '#ea580c',
    bgLight: '#ffedd5',
    borderLight: '#fdba74',
    canImproveWithFeed: true,
    nelMultiplier: 0.98,
    cpMultiplier: 1.0,
    mineralMixMultiplier: 1.20,
    waterMultiplier: 1.12,
    minNdfPct: 35.0,
    maxConcDmPct: 30.0,
    preferSoftMash: false,
    summary: 'Subacute Ruminal Acidosis (SARA) is caused by excess fermentable starch and low effective fiber. Mooposhaq enforces NDF >= 35%, caps Concentrate DM at <= 30%, increases long-stem dry and green roughage, and adds Sodium Bicarbonate buffer.',
    feedAdjustments: [
      'Immediately reduce grain/concentrate proportion to <= 30% of total DMI.',
      'Increase diet NDF to >= 35% by adding 3–5 kg long-chopped (3–4 cm) dry roughage (Wheat/Paddy Straw, Hay) and 20–25 kg Green Fodder to stimulate cud-chewing and saliva buffering.',
      'Replace starchy grain with fibrous concentrate like Wheat Bran.'
    ],
    recommendedFeedsToIncrease: [
      'Long-chopped Dry Fodder (Wheat Straw, Sorghum Stover, Grass Hay: 3–5 kg/day)',
      'High-NDF Green Fodder (Hybrid Napier, Sorghum)',
      'Wheat Bran'
    ],
    feedsToLimit: [
      'Finely ground Maize, Wheat, Broken Rice (>30% DMI strictly prohibited)',
      'Cane Molasses (>0.5 kg/day during active acidosis)'
    ],
    supplements: [
      { name: 'Sodium Bicarbonate (Meetha Soda) + Magnesium Oxide', dosage: '100–120 g NaHCO3 + 30 g MgO/day', purpose: 'Directly neutralizes excess ruminal acid and restores rumen pH > 6.2' },
      { name: 'Live Yeast Culture (Saccharomyces cerevisiae)', dosage: '15–20 g/day', purpose: 'Stimulates lactate-utilizing bacteria in the rumen' }
    ],
    feedingManagement: [
      'Always feed 1–1.5 kg of dry fodder/hay in the morning BEFORE offering any concentrate.'
    ]
  },
  milk_fever: {
    code: 'milk_fever',
    name: 'Milk Fever / Hypocalcemia (Calcium Deficit)',
    shortLabel: 'Milk Fever (Hypocalcemia)',
    category: 'metabolic',
    severity: 'high',
    color: '#0284c7',
    bgLight: '#e0f2fe',
    borderLight: '#7dd3fc',
    canImproveWithFeed: true,
    nelMultiplier: 1.05,
    cpMultiplier: 1.05,
    mineralMixMultiplier: 1.60,
    waterMultiplier: 1.10,
    minNdfPct: 32.0,
    maxConcDmPct: 36.0,
    preferSoftMash: false,
    summary: 'Hypocalcemia occurs when milk Calcium drain exceeds mobilization. Mooposhaq boosts dietary Calcium by +40%, increases ISI Type-II Mineral Mixture to 120–150 g/day, and prioritizes calcium-rich legume green fodders (Lucerne, Berseem, Cowpea).',
    feedAdjustments: [
      'Increase Calcium supply by +40% through high-calcium legume green fodders (Lucerne, Berseem, Cowpea) and 120–150 g/day ISI Type-II Mineral Mixture.',
      'Include oilseed cakes (Sesame/Groundnut Cake) and Vitamin D3 + Magnesium for calcium absorption.'
    ],
    recommendedFeedsToIncrease: [
      'Calcium-rich Legume Fodders (Lucerne, Berseem, Cowpea)',
      'ISI Type-II Mineral Mixture (120–150 g/day)'
    ],
    feedsToLimit: [
      'High-oxalate fodders without mineral supplementation'
    ],
    supplements: [
      { name: 'Oral Ionic Calcium Gel + Vitamin D3', dosage: '300 g Oral Ca Gel (43–50 g elemental Ca)', purpose: 'Rapidly restores blood ionized calcium' },
      { name: 'ISI Type-II Mineral Mixture + Magnesium', dosage: '120–150 g/day', purpose: 'Supplies 24–30 g bioavailable Calcium + Magnesium' }
    ],
    feedingManagement: [
      'Ensure Magnesium is included in the mineral mix to support Parathyroid Hormone sensitivity.'
    ]
  },
  lameness: {
    code: 'lameness',
    name: 'Lameness / Hoof Lesion / Foot Rot',
    shortLabel: 'Lameness / Foot Rot',
    category: 'structural',
    severity: 'moderate',
    color: '#ca8a04',
    bgLight: '#fef9c3',
    borderLight: '#fde047',
    canImproveWithFeed: true,
    nelMultiplier: 1.0,
    cpMultiplier: 1.02,
    mineralMixMultiplier: 1.40,
    waterMultiplier: 1.05,
    minNdfPct: 34.0,
    maxConcDmPct: 32.0,
    preferSoftMash: false,
    summary: 'Laminitis and claw lesions are linked to ruminal acidosis and Zinc/Biotin deficiency. Mooposhaq enforces NDF >= 34%, limits Concentrate DM to <= 32%, and boosts Zinc, Copper, and Biotin.',
    feedAdjustments: [
      'Limit rapidly fermentable grain concentrate to <= 32% of DMI and maintain dietary NDF >= 34% to prevent acidosis-induced laminitis.',
      'Increase Mineral Mixture by +40% (80–110 g/day) with chelated Zinc, Copper, and Manganese for hoof horn keratin.'
    ],
    recommendedFeedsToIncrease: [
      'Balanced Green + Dry Roughage (NDF >= 34%)',
      'Wheat Bran & Oilseed Meal'
    ],
    feedsToLimit: [
      'High-starch grain overload (>32% concentrate DM)'
    ],
    supplements: [
      { name: 'D-Biotin + Chelated Zinc & Copper', dosage: '20 mg Biotin + 400 mg Organic Zinc/day', purpose: 'Hardens hoof horn keratin and accelerates lesion healing' }
    ],
    feedingManagement: [
      'Stall-feed fresh fodder and water close to the cow to eliminate walking stress.'
    ]
  },
  bloat_indigestion: {
    code: 'bloat_indigestion',
    name: 'Rumen Bloat / Tympany / Indigestion',
    shortLabel: 'Bloat / Indigestion',
    category: 'digestive',
    severity: 'moderate',
    color: '#0d9488',
    bgLight: '#ccfbf1',
    borderLight: '#5eead4',
    canImproveWithFeed: true,
    nelMultiplier: 0.96,
    cpMultiplier: 0.98,
    mineralMixMultiplier: 1.15,
    waterMultiplier: 1.05,
    minNdfPct: 36.0,
    maxConcDmPct: 28.0,
    preferSoftMash: false,
    summary: 'Frothy bloat and indigestion result from rapid fermentation without an adequate coarse fiber mat. Mooposhaq increases coarse dry roughage (NDF >= 36%), limits concentrate to <= 28% DMI, and prescribes anti-frothing oil + yeast.',
    feedAdjustments: [
      'Feed 2–3 kg of coarse dry fodder (Wheat/Paddy Straw or Hay) BEFORE offering lush legume green fodder.',
      'Reduce concentrate to <= 28% DMI and wilt dew-wet green legume fodder before chaffing.'
    ],
    recommendedFeedsToIncrease: [
      'Coarse Dry Roughage (Wheat Straw, Sorghum Stover, Grass Hay)',
      'Non-legume Grass Fodders (Hybrid Napier, Maize)'
    ],
    feedsToLimit: [
      'Dew-wet immature Lucerne / Berseem fed on an empty stomach'
    ],
    supplements: [
      { name: 'Edible Vegetable Oil / Mustard Oil Emulsion', dosage: '100–150 ml oral drench (acute frothy bloat)', purpose: 'Breaks surface tension of frothy gas bubbles in the rumen' },
      { name: 'Live Yeast + Herbal Digestive Tonic', dosage: '15 g Yeast + 40 g Digestive Powder/day', purpose: 'Restores ruminal motility and eructation' }
    ],
    feedingManagement: [
      'Always pre-feed dry straw in the morning before lush green legumes.'
    ]
  }
};

export const MASTITIS_OPTIONS = [
  { val: 'healthy', label: 'No Mastitis (Healthy Udder)' },
  { val: 'subclinical_mastitis', label: 'Subclinical Mastitis (High SCC)' },
  { val: 'clinical_mastitis', label: 'Clinical Mastitis (Swelling / Clots)' },
];

export const DISEASE_OPTIONS = [
  { val: 'healthy', label: 'No Other Disease' },
  { val: 'lumpy_skin_disease', label: 'Lumpy Skin Disease (LSD)' },
  { val: 'fmd_recovery', label: 'Foot & Mouth (FMD) Recovery' },
  { val: 'tick_fever_recovery', label: 'Tick Fever Recovery (Anemia)' },
  { val: 'ketosis', label: 'Ketosis (Negative Energy)' },
  { val: 'rumen_acidosis', label: 'Rumen Acidosis (SARA)' },
  { val: 'milk_fever', label: 'Milk Fever (Hypocalcemia)' },
  { val: 'lameness', label: 'Lameness / Foot Rot' },
  { val: 'bloat_indigestion', label: 'Bloat / Indigestion' },
];

export function getStageTargetBcs(category = 'milkingCow', stage = 'Mid lactation') {
  const catL = String(category || 'milkingCow').toLowerCase();
  const stgL = String(stage || '').toLowerCase();
  if (catL.includes('dry') || (catL.includes('preg') && (stgL.includes('late') || stgL.includes('8') || stgL.includes('9')))) {
    return { targetBcs: 3.5, minOk: 3.25, maxOk: 3.75 };
  }
  if (catL.includes('preg')) return { targetBcs: 3.35, minOk: 3.0, maxOk: 3.65 };
  if (catL.includes('heifer') || catL.includes('bull')) return { targetBcs: 3.25, minOk: 3.0, maxOk: 3.5 };
  if (stgL.includes('early')) return { targetBcs: 3.0, minOk: 2.75, maxOk: 3.35 };
  if (stgL.includes('late')) return { targetBcs: 3.4, minOk: 3.2, maxOk: 3.65 };
  return { targetBcs: 3.25, minOk: 3.0, maxOk: 3.5 };
}

export function calculateClientBcsEvaluation(currentBcs, bw = 450, category = 'milkingCow', stage = 'Mid lactation') {
  const bcsVal = Math.max(1.0, Math.min(5.0, Number(currentBcs) || 3.0));
  const bwVal = Math.max(150, Number(bw) || 450);
  const { targetBcs, minOk, maxOk } = getStageTargetBcs(category, stage);
  const bcsDelta = Number((targetBcs - bcsVal).toFixed(2));
  const kgPerBcs = Number((0.135 * bwVal).toFixed(1));
  const totalReserveChangeKg = Number((bcsDelta * kgPerBcs).toFixed(1));

  if (bcsVal < minOk) {
    const effDelta = Math.min(1.0, Math.max(0.15, bcsDelta));
    const recDays = bcsDelta <= 0.65 ? 60 : Math.min(100, Math.round(60 * (bcsDelta / 0.6)));
    const dailyGainKg = Math.min(0.55, Number(((effDelta * kgPerBcs) / recDays).toFixed(3)));
    const extraNel = Number((dailyGainKg * 5.6).toFixed(2));
    const extraMe = Number((extraNel / 0.66).toFixed(2));
    const extraCp = Number((dailyGainKg * 260).toFixed(1));
    const extraConcKg = Number((extraMe / 2.45).toFixed(2));
    const extraCakeKg = Number((extraCp / 380).toFixed(2));

    return {
      currentBcs: bcsVal,
      targetBcs,
      minAcceptableBcs: minOk,
      maxAcceptableBcs: maxOk,
      bcsDelta,
      needsImprovement: true,
      direction: 'gain',
      severity: bcsVal <= 2.0 ? 'critical_thin' : bcsVal <= 2.5 ? 'thin' : 'moderately_thin',
      statusLabel: bcsVal <= 2.0
        ? `Severely Under-Conditioned (BCS ${bcsVal.toFixed(2)} vs Target ${targetBcs.toFixed(2)})`
        : `Under-Conditioned / Thin (BCS ${bcsVal.toFixed(2)} vs Target ${targetBcs.toFixed(2)})`,
      headline: `Increase daily energy by +${extraMe.toFixed(1)} Mcal ME (+${extraNel.toFixed(2)} Mcal NEL) and protein by +${extraCp.toFixed(0)} g CP/day to gain +${bcsDelta.toFixed(2)} BCS (+${totalReserveChangeKg.toFixed(1)} kg body tissue) over ~${recDays} days.`,
      estimatedConditioningDays: recDays,
      targetTissueChangeKg: totalReserveChangeKg,
      dailyTissueChangeKg: dailyGainKg,
      extraNelMcalPerDay: extraNel,
      extraMeMcalPerDay: extraMe,
      extraCpGPerDay: extraCp,
      extraDmiKgPerDay: Number((extraMe / 2.65).toFixed(2)),
      practicalFeedDelta: {
        energyConcentrateDeltaKg: extraConcKg,
        proteinCakeDeltaKg: extraCakeKg,
        bypassFatG: bcsVal <= 2.5 ? 100 : 50,
        molassesKg: 0.6
      },
      actionSteps: [
        `Add +${extraConcKg.toFixed(1)} kg/day energy-rich concentrate (Crushed Maize / Balanced Pellet / Rice Bran) split across morning & evening meals.`,
        `Include +${extraCakeKg.toFixed(1)} kg/day oilseed protein cake (Groundnut Cake / Soybean Meal / Cottonseed Cake) to rebuild muscle and body reserves.`,
        'Supplement 0.5–0.75 kg/day Cane Molasses or 100–150 g/day Bypass Fat to increase energy density safely within the 40% Concentrate DMI threshold.',
        `Provide ${bcsVal <= 2.25 ? 100 : 75} g/day ISI Type-II Mineral Mixture.`
      ]
    };
  } else if (bcsVal > maxOk) {
    const excess = Number((bcsVal - targetBcs).toFixed(2));
    const extraNel = Number((-Math.min(1.8, excess * 1.6)).toFixed(2));
    const extraMe = Number((extraNel / 0.66).toFixed(2));
    const extraConcKg = Number((extraMe / 2.45).toFixed(2));
    return {
      currentBcs: bcsVal,
      targetBcs,
      minAcceptableBcs: minOk,
      maxAcceptableBcs: maxOk,
      bcsDelta,
      needsImprovement: true,
      direction: 'reduce',
      severity: 'over_conditioned',
      statusLabel: `Over-Conditioned / Heavy (BCS ${bcsVal.toFixed(2)} vs Target ${targetBcs.toFixed(2)} — Ketosis Risk)`,
      headline: `Reduce starch energy surplus by ${extraMe.toFixed(1)} Mcal ME/day (${extraConcKg.toFixed(1)} kg grain concentrate) and replace with high-NDF green/dry roughage to safely trim ${bcsDelta.toFixed(2)} BCS.`,
      estimatedConditioningDays: 60,
      targetTissueChangeKg: totalReserveChangeKg,
      dailyTissueChangeKg: Number((totalReserveChangeKg / 60).toFixed(3)),
      extraNelMcalPerDay: extraNel,
      extraMeMcalPerDay: extraMe,
      extraCpGPerDay: 0,
      extraDmiKgPerDay: 0,
      practicalFeedDelta: {
        energyConcentrateDeltaKg: extraConcKg,
        proteinCakeDeltaKg: 0,
        bypassFatG: 0,
        molassesKg: 0
      },
      actionSteps: [
        `Reduce starchy grain concentrate by ${Math.abs(extraConcKg).toFixed(1)} kg/day and replace with high-fiber green fodder (Hybrid Napier / Sorghum) and dry roughage (NDF >= 35%).`,
        'Maintain full Crude Protein and Mineral Mixture supply — never starve an over-conditioned cow rapidly, as sudden fat mobilization triggers Ketosis.',
        'Supplement 15 g/day Rumen-Protected Choline + 6 g/day Niacin to protect liver function.'
      ]
    };
  }

  return {
    currentBcs: bcsVal,
    targetBcs,
    minAcceptableBcs: minOk,
    maxAcceptableBcs: maxOk,
    bcsDelta,
    needsImprovement: false,
    direction: 'maintain',
    severity: 'optimal',
    statusLabel: `Optimal Body Condition (BCS ${bcsVal.toFixed(2)} within ${minOk.toFixed(2)}–${maxOk.toFixed(2)} target)`,
    headline: `Current BCS (${bcsVal.toFixed(2)}) is optimal for ${stage}. Follow standard Mooposhaq balanced ration.`,
    estimatedConditioningDays: 0,
    targetTissueChangeKg: 0,
    dailyTissueChangeKg: 0,
    extraNelMcalPerDay: 0,
    extraMeMcalPerDay: 0,
    extraCpGPerDay: 0,
    extraDmiKgPerDay: 0,
    practicalFeedDelta: {
      energyConcentrateDeltaKg: 0,
      proteinCakeDeltaKg: 0,
      bypassFatG: 0,
      molassesKg: 0
    },
    actionSteps: [
      'Maintain current roughage-to-concentrate balance (60:40 to 65:35 on DM basis).'
    ]
  };
}
