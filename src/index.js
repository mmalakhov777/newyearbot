/**
 * New Year Greeting Telegram Bot
 * Generates personalized New Year greetings from Maxim using AI
 */

import 'dotenv/config';
import express from 'express';
import { sendMessage, sendTypingAction, editMessageText, extractUserInfo } from './telegram.js';
import { generateGreetingStream } from './openrouter.js';

// Minimum time between message edits (Telegram rate limit protection)
const EDIT_THROTTLE_MS = 500;

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

  // Handle /start command
  if (text === '/start') {
    await handleStart(userInfo);
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

    console.log('Greeting sent successfully');
  } catch (error) {
    console.error('Error handling greeting:', error);
    await sendMessage(
      userInfo.chatId,
      'Извини, произошла ошибка. Попробуй ещё раз через минутку!'
    );
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
