/**
 * New Year Greeting Telegram Bot
 * Generates personalized New Year greetings from Maxim using AI
 */

import 'dotenv/config';
import express from 'express';
import { sendMessage, sendTypingAction, editMessageText, sendAudio, sendPhoto, sendChatAction, extractUserInfo } from './telegram.js';
import { generateGreetingStream } from './openrouter.js';
import { generateGreetingCard } from './imagegen.js';
import { generateSong } from './suno.js';

// Minimum time between message edits (Telegram rate limit protection)
const EDIT_THROTTLE_MS = 500;

// Admin chat ID for analytics notifications
const ADMIN_CHAT_ID = 321097981;

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'New Year Greeting Bot',
    message: 'Send /start to the bot to get your personalized greeting!'
  });
});

// Webhook endpoint for Telegram
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('Received update:', JSON.stringify(update, null, 2));

    // Immediately respond to Telegram to prevent timeouts
    res.sendStatus(200);

    // Process the update asynchronously
    await handleUpdate(update);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.sendStatus(200); // Always respond 200 to prevent Telegram retries
  }
});

/**
 * Handle incoming Telegram update
 * @param {Object} update - Telegram update object
 */
async function handleUpdate(update) {
  const userInfo = extractUserInfo(update);

  if (!userInfo) {
    console.log('No user info in update, skipping');
    return;
  }

  const message = update.message;
  const text = message?.text || '';

  console.log(`Message from ${userInfo.firstName || 'Unknown'} (@${userInfo.username || 'no username'}): ${text}`);

  // Handle /start command - immediately generate greeting
  if (text === '/start') {
    await handleGreeting(userInfo);
    return;
  }

  // Handle /greeting command or any other message
  if (text === '/greeting' || text) {
    await handleGreeting(userInfo);
    return;
  }
}

/**
 * Handle /start command
 * @param {Object} userInfo - User information
 */
async function handleStart(userInfo) {
  const welcomeMessage = `Привет${userInfo.firstName ? ', ' + userInfo.firstName : ''}!

Я бот Максима, и я создан специально для того, чтобы поздравить тебя с Новым Годом!

Нажми /greeting или просто напиши что-нибудь, чтобы получить своё персональное поздравление от Максима.`;

  await sendMessage(userInfo.chatId, welcomeMessage);
}

/**
 * Handle greeting request with streaming response
 * @param {Object} userInfo - User information
 */
async function handleGreeting(userInfo) {
  const startTime = Date.now();
  const results = {
    text: { success: false, preview: '' },
    image: { success: false },
    song: { success: false, title: '' }
  };

  try {
    // Show typing indicator
    await sendTypingAction(userInfo.chatId);

    console.log('Generating greeting for:', userInfo);

    // Send initial message that we'll update
    const initialMsg = await sendMessage(userInfo.chatId, '✨ Генерирую поздравление...');
    const messageId = initialMsg.result.message_id;

    let lastEditTime = 0;
    let pendingText = '';
    let editTimeout = null;

    // Streaming callback - throttled message updates
    const onChunk = async (text) => {
      pendingText = text;
      const now = Date.now();

      // Clear any pending edit
      if (editTimeout) {
        clearTimeout(editTimeout);
      }

      // If enough time has passed, edit immediately
      if (now - lastEditTime >= EDIT_THROTTLE_MS) {
        lastEditTime = now;
        await editMessageText(userInfo.chatId, messageId, text + ' ▌');
      } else {
        // Schedule an edit for later
        editTimeout = setTimeout(async () => {
          lastEditTime = Date.now();
          await editMessageText(userInfo.chatId, messageId, pendingText + ' ▌');
        }, EDIT_THROTTLE_MS - (now - lastEditTime));
      }
    };

    // Generate with streaming
    const finalGreeting = await generateGreetingStream(userInfo, onChunk);

    // Clear any pending timeout
    if (editTimeout) {
      clearTimeout(editTimeout);
    }

    // Final edit without cursor
    await editMessageText(userInfo.chatId, messageId, finalGreeting);

    results.text.success = true;
    results.text.preview = finalGreeting.substring(0, 100) + '...';

    console.log('Greeting sent successfully');

    // Now generate and send a cringy greeting card
    results.image.success = await handleImageGeneration(userInfo);

    // Then generate and send a personalized song
    const songResult = await handleSongGeneration(userInfo);
    results.song.success = songResult.success;
    results.song.title = songResult.title || '';

  } catch (error) {
    console.error('Error handling greeting:', error);
    await sendMessage(
      userInfo.chatId,
      'Извини, произошла ошибка. Попробуй ещё раз через минутку!'
    );
  }

  // Send analytics to admin
  await sendAnalytics(userInfo, results, startTime);
}

/**
 * Handle image generation and sending
 * @param {Object} userInfo - User information
 * @returns {Promise<boolean>} Whether image was sent successfully
 */
async function handleImageGeneration(userInfo) {
  try {
    // Send status message
    const statusMsg = await sendMessage(
      userInfo.chatId,
      '🎨 Рисую кринжовую открытку в стиле Поля Чудес...'
    );
    const statusMessageId = statusMsg.result.message_id;

    // Show upload photo action
    await sendChatAction(userInfo.chatId, 'upload_photo');

    // Generate the image
    const imageUrl = await generateGreetingCard(userInfo);

    if (imageUrl) {
      // Delete status message
      await deleteMessage(userInfo.chatId, statusMessageId);

      // Send the image
      await sendPhoto(userInfo.chatId, imageUrl, {
        caption: '🎄 Открытка от Максима ❤️'
      });

      console.log('Greeting card sent successfully');
      return true;
    } else {
      // Image generation failed
      await editMessageText(
        userInfo.chatId,
        statusMessageId,
        '😔 Не удалось нарисовать открытку, но стихи уже у тебя!'
      );
      return false;
    }

  } catch (error) {
    console.error('Error generating image:', error);
    // Don't send error message, just continue to song
    return false;
  }
}

/**
 * Handle song generation and sending
 * @param {Object} userInfo - User information
 * @returns {Promise<{success: boolean, title: string}>} Result
 */
async function handleSongGeneration(userInfo) {
  let statusMessageId = null;

  try {
    // Send status message
    const statusMsg = await sendMessage(
      userInfo.chatId,
      '🎵 А теперь готовлю для тебя персональную песню...\n\nЭто займёт пару минут, подожди!'
    );
    statusMessageId = statusMsg.result.message_id;

    // Status callback
    const onStatus = async (status) => {
      if (!statusMessageId) return;

      const statusTexts = {
        starting: '🎵 Начинаю создание песни...',
        generating: '🎤 Генерирую музыку и вокал...\n\nЭто займёт 1-2 минуты.',
        almost_done: '🎧 Почти готово! Финальная обработка...'
      };

      const text = statusTexts[status];
      if (text) {
        await editMessageText(userInfo.chatId, statusMessageId, text);
      }
    };

    // Show upload audio action periodically
    const actionInterval = setInterval(() => {
      sendChatAction(userInfo.chatId, 'upload_voice');
    }, 4000);

    // Generate the song
    const song = await generateSong(userInfo, onStatus);

    clearInterval(actionInterval);

    if (song && song.audioUrl) {
      // Update status
      await editMessageText(
        userInfo.chatId,
        statusMessageId,
        '🎵 Песня готова! Отправляю...'
      );

      // Send the audio file
      await sendAudio(userInfo.chatId, song.audioUrl, {
        title: song.title,
        performer: 'Максим (AI)',
        caption: `🎄 ${song.title}\n\nС Новым Годом! 🎉`
      });

      // Delete status message
      await deleteMessage(userInfo.chatId, statusMessageId);

      console.log('Song sent successfully:', song.title);
      return { success: true, title: song.title };
    } else {
      // Song generation failed
      await editMessageText(
        userInfo.chatId,
        statusMessageId,
        '😔 К сожалению, не удалось создать песню. Но текстовое поздравление уже у тебя!'
      );
      return { success: false, title: '' };
    }

  } catch (error) {
    console.error('Error generating song:', error);
    if (statusMessageId) {
      await editMessageText(
        userInfo.chatId,
        statusMessageId,
        '😔 Не удалось создать песню, но поздравление уже отправлено!'
      );
    }
    return { success: false, title: '' };
  }
}

/**
 * Send analytics notification to admin
 * @param {Object} userInfo - User information
 * @param {Object} results - Results of greeting generation
 * @param {number} startTime - Start timestamp
 */
async function sendAnalytics(userInfo, results, startTime) {
  try {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const textStatus = results.text.success ? '✅' : '❌';
    const imageStatus = results.image.success ? '✅' : '❌';
    const songStatus = results.song.success ? '✅' : '❌';

    const message = `📊 Новое поздравление отправлено!

👤 Кому: ${userInfo.firstName || 'Unknown'} ${userInfo.lastName || ''}
🆔 Username: @${userInfo.username || 'нет'}
🔢 Chat ID: ${userInfo.chatId}

📝 Текст: ${textStatus}
🎨 Картинка: ${imageStatus}
🎵 Песня: ${songStatus}${results.song.title ? ` (${results.song.title})` : ''}

⏱ Время: ${duration} сек`;

    await sendMessage(ADMIN_CHAT_ID, message);
  } catch (error) {
    console.error('Error sending analytics:', error);
  }
}

/**
 * Delete a message
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 */
async function deleteMessage(chatId, messageId) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId })
      }
    );
    return response.json();
  } catch (e) {
    // Ignore delete errors
  }
}

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Webhook endpoint: POST /webhook`);
  console.log('');
  console.log('To set up webhook, run: npm run setup-webhook');
});
