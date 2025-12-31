# New Year Greeting Bot

Telegram bot that generates personalized New Year greetings from Maxim using AI (OpenRouter).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `WEBHOOK_URL` - Your public HTTPS URL for webhook
- `PORT` - Server port (default: 3000)

3. Start the server:
```bash
npm start
```

4. Set up webhook:
```bash
npm run setup-webhook
```

## Deploy to Render

1. Push this repo to GitHub

2. Go to [render.com](https://render.com) and create a new **Web Service**

3. Connect your GitHub repo

4. Render will auto-detect settings from `render.yaml`, or configure manually:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

5. Add environment variables in Render dashboard:
   - `TELEGRAM_BOT_TOKEN` = your bot token
   - `OPENROUTER_API_KEY` = your OpenRouter key
   - `WEBHOOK_URL` = `https://YOUR-APP-NAME.onrender.com/webhook`

6. After deploy, set up webhook by running locally:
   ```bash
   TELEGRAM_BOT_TOKEN=your_token WEBHOOK_URL=https://your-app.onrender.com/webhook node src/setup-webhook.js
   ```

## Local Development with ngrok

For local testing, use ngrok to create a public URL:

```bash
# Install ngrok
brew install ngrok

# Start ngrok
ngrok http 3000

# Copy the https URL and update .env
WEBHOOK_URL=https://xxxx.ngrok.io/webhook

# Then run setup-webhook
npm run setup-webhook
```

## Commands

- `/start` - Welcome message
- `/greeting` - Get a personalized New Year greeting
- Any message - Also triggers a greeting

## Webhook Management

```bash
# Set webhook
npm run setup-webhook

# Check webhook status
node src/setup-webhook.js info

# Delete webhook
node src/setup-webhook.js delete
```
