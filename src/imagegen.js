/**
 * Image generation using OpenRouter API (Gemini)
 * Generates cringy New Year greeting cards in "Pole Chudes" style
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Build the image generation prompt
 * @param {Object} userInfo - Telegram user information
 * @returns {string} The prompt
 */
function buildImagePrompt(userInfo) {
  const name = userInfo.firstName || 'друг';

  return `Create a MAXIMUM CRINGE New Year greeting card in the style of Russian TV show "Pole Chudes" (Field of Miracles):

The card should include:
- Cheesy, kitschy Soviet/Russian aesthetic
- Bright garish colors (gold, red, green)
- Badly photoshopped elements
- A jar of pickles or pickled vegetables somewhere
- Sparkles, snowflakes, champagne glasses
- A banner saying "С Новым Годом, ${name}!"
- Maybe a badly drawn Santa (Ded Moroz) or Snegurochka
- Tacky gold frames and ornaments
- The overall vibe of a homemade greeting card from a village grandma

Make it as kitschy and cringe as possible, like something a contestant on Pole Chudes would bring as a gift to Yakubovich.

Style: cheesy greeting card, kitsch, tacky, over-the-top decorations, Russian New Year aesthetic`;
}

/**
 * Generate a cringy greeting card image
 * @param {Object} userInfo - Telegram user information
 * @returns {Promise<string|null>} Base64 image data URL or null on failure
 */
export async function generateGreetingCard(userInfo) {
  const prompt = buildImagePrompt(userInfo);

  try {
    console.log('Generating greeting card image...');

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://newyear-bot.local',
        'X-Title': 'New Year Greeting Bot'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview-image-generation',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter image API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Image generation response received');

    // Extract image from response
    const message = data.choices?.[0]?.message;
    if (message?.images && message.images.length > 0) {
      const imageUrl = message.images[0].image_url?.url;
      if (imageUrl) {
        console.log('Image generated successfully');
        return imageUrl;
      }
    }

    console.log('No image in response');
    return null;

  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}
