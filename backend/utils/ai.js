const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure AI-generated text is coherent prose with complete sentences
function enforceFullSentenceProse(input) {
  try {
    if (!input || typeof input !== 'string') return '';

    let text = input
      // Convert bullet-like lines to spaces
      .replace(/(^|\n)\s*[-*•]\s+/g, ' ')
      // Collapse multiple newlines into a single space
      .replace(/\n+/g, ' ')
      // Normalize whitespace
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!text) return '';

    // Split into sentence-like chunks
    const chunks = text.match(/[^.!?]+[.!?]|[^.!?]+$/g) || [text];

    // Drop a leading title-like fragment if it is short and not punctuated
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
      // Capitalize first character if needed
      s = s.charAt(0).toUpperCase() + s.slice(1);
      // Ensure terminal punctuation
      if (!/[.!?]$/.test(s)) s += '.';
      return s;
    }).filter(Boolean);

    return sentences.join(' ');
  } catch (_) {
    // On any parsing error, return a simple trimmed string with period
    const fallback = String(input || '').trim();
    if (!fallback) return '';
    return /[.!?]$/.test(fallback) ? fallback : `${fallback}.`;
  }
}

const generateAISummary = async (text) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback to simple summary if API key not available
      return enforceFullSentenceProse(text.substring(0, 200));
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a medical assistant that creates simple, easy-to-understand summaries of medical content for patients. Keep summaries concise (2-3 sentences) and use plain language.',
        },
        {
          role: 'user',
          content: `Please provide a simple, easy-to-understand summary of the following medical content:\n\n${text}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const raw = response.choices[0].message.content.trim();
    return enforceFullSentenceProse(raw);
  } catch (error) {
    console.error('Error generating AI summary:', error);
    // Fallback to simple summary
    return enforceFullSentenceProse(text.substring(0, 200));
  }
};

module.exports = { generateAISummary };

