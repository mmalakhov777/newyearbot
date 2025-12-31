/**
 * OpenRouter API integration for generating New Year greetings
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Generate a personalized New Year greeting from Maxim
 * @param {Object} userInfo - Telegram user information
 * @returns {Promise<string>} Generated greeting
 */
export async function generateGreeting(userInfo) {
  const { firstName, lastName, username, languageCode } = userInfo;

  const userDescription = buildUserDescription(userInfo);

  const prompt = `Ты - Максим, весёлый и душевный человек. Напиши искреннее и тёплое поздравление с Новым Годом для человека с этой информацией:

${userDescription}

Поздравление должно быть:
- На русском языке
- Персонализированным (используй имя если есть)
- Тёплым и искренним
- Не слишком длинным (2-4 предложения)
- Заканчиваться пожеланиями на новый год
- Подписано "С любовью, Максим"

Напиши только само поздравление, без дополнительных комментариев.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://newyear-bot.local',
        'X-Title': 'New Year Greeting Bot'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response from OpenRouter');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating greeting:', error);
    return getFallbackGreeting(firstName);
  }
}

/**
 * Build a description of the user for the prompt
 * @param {Object} userInfo - Telegram user information
 * @returns {string} User description
 */
function buildUserDescription(userInfo) {
  const parts = [];

  if (userInfo.firstName) {
    parts.push(`Имя: ${userInfo.firstName}`);
  }
  if (userInfo.lastName) {
    parts.push(`Фамилия: ${userInfo.lastName}`);
  }
  if (userInfo.username) {
    parts.push(`Username: @${userInfo.username}`);
  }
  if (userInfo.languageCode) {
    parts.push(`Язык: ${userInfo.languageCode}`);
  }
  if (userInfo.isPremium) {
    parts.push(`Premium пользователь Telegram`);
  }

  return parts.length > 0 ? parts.join('\n') : 'Информация о пользователе недоступна';
}

/**
 * Fallback greeting if AI generation fails
 * @param {string} firstName - User's first name
 * @returns {string} Fallback greeting
 */
function getFallbackGreeting(firstName) {
  const name = firstName || 'друг';
  return `Дорогой ${name}!

Поздравляю тебя с Новым Годом! Пусть этот год принесёт тебе много радости, счастья и исполнения всех желаний. Пусть каждый день будет наполнен теплом и любовью!

С любовью, Максим`;
}
