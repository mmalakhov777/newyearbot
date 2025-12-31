/**
 * OpenRouter API integration for generating New Year greetings
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Build the prompt for greeting generation
 * @param {Object} userInfo - Telegram user information
 * @returns {string} The prompt
 */
function buildPrompt(userInfo) {
  const userDescription = buildUserDescription(userInfo);

  return `Ты - участник передачи "Поле Чудес" из деревни. Напиши МАКСИМАЛЬНО КРИНЖОВОЕ новогоднее поздравление в стиле ЧАСТУШЕК для человека:

${userDescription}

ВАЖНО - формат ЧАСТУШЕК:
- Строго 2-3 четверостишия (по 4 строки каждое)
- Рифма ОБЯЗАТЕЛЬНО чёткая: ABAB или AABB
- Ритм как в частушках: та-та-ТА-та-та-та-ТА (хореический размер)
- Каждая строка примерно одинаковой длины (7-9 слогов)

Стиль и содержание:
- Максимально деревенский кринж в духе Поля Чудес
- Душные поздравления от бабушек Якубовичу
- ОБЯЗАТЕЛЬНО упомяни: огурчики/соленья/варенье/самогон/дары огорода
- Можно упомянуть барабан, сектор приз, Якубовича
- Используй устаревшие слова: "батюшки", "голубчик", "касатик", "милок"

Примеры правильного ритма и рифмы:

"Ой, ${userInfo.firstName || 'дружочек'} наш родной,     (A)
Шлём привет тебе большой!       (A)
Огурцов тебе бочонок,           (B)
И от курочек гребёнок!          (B)"

"Новый год идёт в деревню,      (A)
Мы достали всю консерву!        (A)
Пусть Якубович крутнёт,         (B)
И тебе машину шлёт!             (B)"

В конце ОБЯЗАТЕЛЬНО подпись: "Ваш Максим из деревни Нижние Пупки"

Напиши ТОЛЬКО стихотворение. Никаких комментариев, объяснений, только текст частушек и подпись.`;
}

/**
 * Generate a personalized New Year greeting with streaming
 * @param {Object} userInfo - Telegram user information
 * @param {Function} onChunk - Callback called with accumulated text on each chunk
 * @returns {Promise<string>} Final generated greeting
 */
export async function generateGreetingStream(userInfo, onChunk) {
  const prompt = buildPrompt(userInfo);

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
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.8,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith(':')) continue; // SSE comment

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              if (onChunk) {
                await onChunk(fullText);
              }
            }
          } catch (e) {
            // Ignore parse errors for non-JSON payloads
          }
        }
      }
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error generating greeting:', error);
    const fallback = getFallbackGreeting(userInfo.firstName);
    if (onChunk) await onChunk(fallback);
    return fallback;
  }
}

/**
 * Generate a personalized New Year greeting from Maxim (non-streaming)
 * @param {Object} userInfo - Telegram user information
 * @returns {Promise<string>} Generated greeting
 */
export async function generateGreeting(userInfo) {
  const prompt = buildPrompt(userInfo);

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
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
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
    return getFallbackGreeting(userInfo.firstName);
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
  const name = firstName || 'дорогой человек';
  return `Дорогой ${name}, привет тебе!
От Максима и от кур!
Шлю тебе бочонок с мёдом,
И солёный огурец!

Новый Год стучится в двери,
Как Якубович в барабан!
Счастья, радости, веселья,
И здоровья полный чан!

Ваш Максим из деревни Нижние Пупки`;
}
