// Minimal, local NLP-style normalization for patient-described conditions.
// Maps free-form text like "I have sugar disease" to canonical condition labels
// used elsewhere in the app (e.g., filtering personalized results).

const CANONICAL_CONDITIONS = {
  // Specific cancers first so we can prefer them over generic "Cancer"
  'Brain Cancer': [
    'brain cancer',
    'glioma',
    'glioblastoma',
    'gbm',
  ],
  'Lung Cancer': [
    'lung cancer',
    'nsclc',
    'non small cell lung cancer',
    'small cell lung cancer',
    'sclc',
  ],
  'Breast Cancer': [
    'breast cancer',
  ],
  'Prostate Cancer': [
    'prostate cancer',
  ],
  'Colon Cancer': [
    'colon cancer',
    'colorectal cancer',
  ],
  'Skin Cancer': [
    'skin cancer',
    'melanoma',
  ],
  'Liver Cancer': [
    'liver cancer',
    'hepatocellular carcinoma',
    'hcc',
  ],
  'Pancreatic Cancer': [
    'pancreatic cancer',
  ],
  'Stomach Cancer': [
    'stomach cancer',
    'gastric cancer',
  ],
  'Ovarian Cancer': [
    'ovarian cancer',
  ],
  'Cervical Cancer': [
    'cervical cancer',
  ],
  'Kidney Cancer': [
    'kidney cancer',
    'renal cell carcinoma',
    'rcc',
  ],
  'Bladder Cancer': [
    'bladder cancer',
  ],
  'Thyroid Cancer': [
    'thyroid cancer',
  ],
  'Head and Neck Cancer': [
    'head and neck cancer',
  ],
  'Diabetes Mellitus': [
    'diabetes',
    'diabetic',
    'sugar disease',
    'high blood sugar',
    'blood sugar is high',
    'type 1 diabetes',
    'type 2 diabetes',
  ],
  'Hypertension': [
    'high blood pressure',
    'hypertension',
    'hypertens', // stem match
    'bp high',
  ],
  'Asthma': [
    'asthma',
    'asthmatic',
    'wheezing with shortness of breath',
    'wheezing',
  ],
  'Coronary Artery Disease': [
    'coronary artery disease',
    'cad',
    'angina',
    'coronary',
    'ischemic heart disease',
    'heart attack',
    'myocardial infarction',
    'mi',
  ],
  'Heart Failure': [
    'heart failure',
    'congestive heart failure',
    'chf',
  ],
  'Cancer': [
    'cancer',
    'tumor',
    'tumour',
    'carcinoma',
    'malignancy',
  ],
  'Chronic Obstructive Pulmonary Disease': [
    'copd',
    'chronic obstructive pulmonary disease',
    'emphysema',
    'chronic bronchitis',
  ],
  'Migraine': [
    'migraine',
    'migraine headaches',
  ],
  'Depression': [
    'depression',
    'depressive',
    'major depressive disorder',
    'mdd',
  ],
  'Anxiety Disorder': [
    'anxiety',
    'generalized anxiety',
    'gad',
  ],
  'Arthritis': [
    'arthritis',
    'osteoarthritis',
    'rheumatoid arthritis',
    'ra',
  ],
};

function normalizeText(input) {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSynonymMatch(normalizedText, synonym) {
  const s = synonym.toLowerCase();
  // Exact phrase check where useful
  if (normalizedText.includes(s)) return true;
  // Stem-style fallbacks for a few common cases
  if (s === 'hypertens' && /hypertens/.test(normalizedText)) return true;
  return false;
}

// Map organ/location keywords to specific cancer labels
const ORGAN_TO_SPECIFIC_CANCER = [
  { keywords: ['brain', 'cerebral', 'glioma', 'glioblastoma', 'gbm'], label: 'Brain Cancer' },
  { keywords: ['lung', 'lungs', 'pulmonary', 'nsclc', 'sclc'], label: 'Lung Cancer' },
  { keywords: ['breast'], label: 'Breast Cancer' },
  { keywords: ['prostate'], label: 'Prostate Cancer' },
  { keywords: ['colon', 'colorectal'], label: 'Colon Cancer' },
  { keywords: ['skin', 'melanoma'], label: 'Skin Cancer' },
  { keywords: ['liver', 'hepatic', 'hepatocellular', 'hcc'], label: 'Liver Cancer' },
  { keywords: ['pancreas', 'pancreatic'], label: 'Pancreatic Cancer' },
  { keywords: ['stomach', 'gastric'], label: 'Stomach Cancer' },
  { keywords: ['ovary', 'ovarian'], label: 'Ovarian Cancer' },
  { keywords: ['cervix', 'cervical'], label: 'Cervical Cancer' },
  { keywords: ['kidney', 'renal', 'rcc'], label: 'Kidney Cancer' },
  { keywords: ['bladder'], label: 'Bladder Cancer' },
  { keywords: ['thyroid'], label: 'Thyroid Cancer' },
  { keywords: ['head and neck', 'head & neck'], label: 'Head and Neck Cancer' },
];

function detectOrganSpecificCancers(normalizedText) {
  const found = new Set();
  for (const entry of ORGAN_TO_SPECIFIC_CANCER) {
    for (const kw of entry.keywords) {
      if (normalizedText.includes(kw)) {
        found.add(entry.label);
        break;
      }
    }
  }
  return Array.from(found);
}

// Returns a canonical condition for a given free-form string, or null if none
export function normalizeSingleCondition(freeFormInput) {
  const all = extractConditionsFromText(freeFormInput);
  return all.length > 0 ? all[0] : null;
}

// Extracts one or more canonical conditions present in a free-form sentence.
// If none are found, returns an empty array.
export function extractConditionsFromText(freeFormInput) {
  const normalized = normalizeText(freeFormInput);
  if (!normalized) return [];

  const found = new Set();

  // Check synonyms as substrings
  for (const [canonical, synonyms] of Object.entries(CANONICAL_CONDITIONS)) {
    for (const synonym of synonyms) {
      if (isSynonymMatch(normalized, synonym)) {
        found.add(canonical);
        break;
      }
    }
  }

  // Heuristic stems
  if (/\bdiabet\b/.test(normalized)) found.add('Diabetes Mellitus');

  // If text indicates a cancer concept, prefer organ-specific cancers when present
  const hasCancerConcept = /(\bcancer\b|\btumou?r\b|\bcarcinoma\b|\bmalignancy\b)/.test(normalized);
  if (hasCancerConcept) {
    const specifics = detectOrganSpecificCancers(normalized);
    for (const s of specifics) found.add(s);
    // If specifics found, drop generic 'Cancer' to keep specificity
    if (specifics.length > 0 && found.has('Cancer')) {
      found.delete('Cancer');
    }
  }

  return Array.from(found);
}

// Accepts either a single condition-like string or sentence and returns
// at least one condition label: either canonicalized list or a fallback
// to the original trimmed text.
export function normalizeOrFallback(freeFormInput) {
  const extracted = extractConditionsFromText(freeFormInput);
  if (extracted.length > 0) return extracted;
  const trimmed = (freeFormInput || '').trim();
  return trimmed ? [trimmed] : [];
}

export default {
  normalizeSingleCondition,
  extractConditionsFromText,
  normalizeOrFallback,
};


