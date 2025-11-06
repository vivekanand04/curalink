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

// Utility to determine if text content exceeds 4 lines
// and create truncated display with "view full paper" link
export function createTruncatedDescription(text, url, className = '') {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // For simplicity, we'll assume content needs truncation if it's longer than ~400 characters
  // In a real implementation, you might want to use a more sophisticated approach
  // to measure actual rendered height, but this provides a good approximation
  const needsTruncation = text.length > 400;

  if (!needsTruncation) {
    return (
      <div className={`card-description-truncated ${className}`}>
        {text}
      </div>
    );
  }

  const handleViewFull = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`card-description-truncated has-more ${className}`}
      onClick={handleViewFull}
    >
      {text}
    </div>
  );
}


