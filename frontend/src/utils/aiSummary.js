// Formats AI-generated summaries into complete, coherent sentences for display
export function formatAISummary(input) {
  try {
    if (!input || typeof input !== 'string') return '';

    let text = input
      .replace(/(^|\n)\s*[-*•]\s+/g, ' ') // remove bullet prefixes
      .replace(/\n+/g, ' ') // collapse newlines
      .replace(/\s{2,}/g, ' ') // normalize whitespace
      .trim();

    if (!text) return '';

    const chunks = text.match(/[^.!?]+[.!?]|[^.!?]+$/g) || [text];

    // Drop a short, non-punctuated leading title-like fragment
    if (
      chunks.length > 1 &&
      !/[.!?]$/.test(chunks[0].trim()) &&
      chunks[0].trim().split(/\s+/).length <= 12
    ) {
      chunks.shift();
    }

    const sentences = chunks.map((c) => {
      let s = c.trim();
      if (!s) return '';
      s = s.charAt(0).toUpperCase() + s.slice(1);
      if (!/[.!?]$/.test(s)) s += '.';
      return s;
    }).filter(Boolean);

    return sentences.join(' ');
  } catch (_) {
    const fallback = String(input || '').trim();
    if (!fallback) return '';
    return /[.!?]$/.test(fallback) ? fallback : `${fallback}.`;
  }
}


