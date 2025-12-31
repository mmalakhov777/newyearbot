/**
 * Telegram Bot API integration
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Get the Telegram API URL
 * @returns {string} Base API URL with token
 */
function getApiUrl() {
  return `${TELEGRAM_API_BASE}${process.env.TELEGRAM_BOT_TOKEN}`;
}

/**
 * Send a message to a Telegram chat
 * @param {number} chatId - Chat ID to send message to
 * @param {string} text - Message text
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response
 */
export async function sendMessage(chatId, text, options = {}) {
  const response = await fetch(`${getApiUrl()}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options
    })
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Telegram API error:', data);
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return data;
}

/**
 * Edit an existing message
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID to edit
 * @param {string} text - New message text
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response
 */
export async function editMessageText(chatId, messageId, text, options = {}) {
  const response = await fetch(`${getApiUrl()}/editMessageText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...options
    })
  });

  const data = await response.json();

  if (!data.ok && !data.description?.includes('message is not modified')) {
    console.error('Telegram editMessageText error:', data);
  }

  return data;
}

/**
 * Send a "typing" action to indicate the bot is processing
 * @param {number} chatId - Chat ID
 * @returns {Promise<Object>} API response
 */
export async function sendTypingAction(chatId) {
  return sendChatAction(chatId, 'typing');
}

/**
 * Send a chat action (typing, upload_audio, etc.)
 * @param {number} chatId - Chat ID
 * @param {string} action - Action type
 * @returns {Promise<Object>} API response
 */
export async function sendChatAction(chatId, action) {
  const response = await fetch(`${getApiUrl()}/sendChatAction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      action
    })
  });

  return response.json();
}

/**
 * Send an audio file to a chat
 * @param {number} chatId - Chat ID
 * @param {string} audioUrl - URL of the audio file (MP3)
 * @param {Object} options - Additional options (title, performer, caption, etc.)
 * @returns {Promise<Object>} API response
 */
export async function sendAudio(chatId, audioUrl, options = {}) {
  const response = await fetch(`${getApiUrl()}/sendAudio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      audio: audioUrl,
      ...options
    })
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Telegram sendAudio error:', data);
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return data;
}

/**
 * Send a photo to a chat (supports base64 data URL)
 * @param {number} chatId - Chat ID
 * @param {string} photo - Photo URL or base64 data URL
 * @param {Object} options - Additional options (caption, etc.)
 * @returns {Promise<Object>} API response
 */
export async function sendPhoto(chatId, photo, options = {}) {
  // If it's a base64 data URL, we need to use multipart form data
  if (photo.startsWith('data:image')) {
    // Extract base64 data
    const matches = photo.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 image format');
    }

    const [, format, base64Data] = matches;
    const buffer = Buffer.from(base64Data, 'base64');

    // Create form data
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('photo', new Blob([buffer], { type: `image/${format}` }), `image.${format}`);

    if (options.caption) {
      formData.append('caption', options.caption);
    }
    if (options.parse_mode) {
      formData.append('parse_mode', options.parse_mode);
    }

    const response = await fetch(`${getApiUrl()}/sendPhoto`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram sendPhoto error:', data);
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return data;
  }

  // Regular URL - use JSON
  const response = await fetch(`${getApiUrl()}/sendPhoto`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      photo,
      ...options
    })
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Telegram sendPhoto error:', data);
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return data;
}

/**
 * Set up webhook for the bot
 * @param {string} webhookUrl - Public HTTPS URL for webhook
 * @returns {Promise<Object>} API response
 */
export async function setWebhook(webhookUrl) {
  const response = await fetch(`${getApiUrl()}/setWebhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message']
    })
  });

  const data = await response.json();
  console.log('Webhook setup response:', data);
  return data;
}

/**
 * Delete webhook (useful for switching to polling)
 * @returns {Promise<Object>} API response
 */
export async function deleteWebhook() {
  const response = await fetch(`${getApiUrl()}/deleteWebhook`, {
    method: 'POST'
  });

  return response.json();
}

/**
 * Get webhook info
 * @returns {Promise<Object>} Webhook info
 */
export async function getWebhookInfo() {
  const response = await fetch(`${getApiUrl()}/getWebhookInfo`);
  return response.json();
}

/**
 * Extract user info from Telegram update
 * @param {Object} update - Telegram update object
 * @returns {Object|null} User info or null
 */
export function extractUserInfo(update) {
  const message = update.message;
  if (!message || !message.from) {
    return null;
  }

  const user = message.from;
  return {
    id: user.id,
    firstName: user.first_name || null,
    lastName: user.last_name || null,
    username: user.username || null,
    languageCode: user.language_code || null,
    isPremium: user.is_premium || false,
    chatId: message.chat.id
  };
}
