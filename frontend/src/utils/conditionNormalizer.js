// Minimal, local NLP-style normalization for patient-described conditions.
// Maps free-form text like "I have sugar disease" to canonical condition labels
// used elsewhere in the app (e.g., filtering personalized results).

const CANONICAL_CONDITIONS = {
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

// Returns a canonical condition for a given free-form string, or null if none
export function normalizeSingleCondition(freeFormInput) {
  const normalized = normalizeText(freeFormInput);
  if (!normalized) return null;

  // Direct canonical name match first
  for (const canonical of Object.keys(CANONICAL_CONDITIONS)) {
    if (normalizeText(canonical) === normalized) return canonical;
  }

  // Synonym matching
  for (const [canonical, synonyms] of Object.entries(CANONICAL_CONDITIONS)) {
    for (const synonym of synonyms) {
      if (isSynonymMatch(normalized, synonym)) {
        return canonical;
      }
    }
  }

  // Simple keyword heuristics for diabetes
  if (/\bdiabet\b/.test(normalized)) return 'Diabetes Mellitus';

  return null;
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


