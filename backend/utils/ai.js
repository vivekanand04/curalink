const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateAISummary = async (text) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback to simple summary if API key not available
      return text.substring(0, 200) + '...';
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

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating AI summary:', error);
    // Fallback to simple summary
    return text.substring(0, 200) + '...';
  }
};

module.exports = { generateAISummary };

