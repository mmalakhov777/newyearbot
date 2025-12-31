/**
 * Script to set up Telegram webhook
 * Run with: npm run setup-webhook
 */

import 'dotenv/config';
import { setWebhook, getWebhookInfo, deleteWebhook } from './telegram.js';

async function main() {
  const command = process.argv[2] || 'set';
  const webhookUrl = process.env.WEBHOOK_URL;

  console.log('Telegram Webhook Setup');
  console.log('======================\n');

  switch (command) {
    case 'set':
      if (!webhookUrl || webhookUrl.includes('your-domain')) {
        console.error('Error: Please set WEBHOOK_URL in your .env file');
        console.error('Example: WEBHOOK_URL=https://your-server.com/webhook');
        console.error('\nYou can use ngrok for local development:');
        console.error('  1. Install ngrok: brew install ngrok');
        console.error('  2. Run: ngrok http 3000');
        console.error('  3. Copy the https URL and add /webhook');
        process.exit(1);
      }

      console.log(`Setting webhook to: ${webhookUrl}`);
      const setResult = await setWebhook(webhookUrl);

      if (setResult.ok) {
        console.log('Webhook set successfully!');
      } else {
        console.error('Failed to set webhook:', setResult.description);
      }
      break;

    case 'info':
      console.log('Getting webhook info...');
      const info = await getWebhookInfo();
      console.log('\nWebhook Info:');
      console.log(JSON.stringify(info, null, 2));
      break;

    case 'delete':
      console.log('Deleting webhook...');
      const deleteResult = await deleteWebhook();
      if (deleteResult.ok) {
        console.log('Webhook deleted successfully!');
      } else {
        console.error('Failed to delete webhook:', deleteResult.description);
      }
      break;

    default:
      console.log('Usage: npm run setup-webhook [set|info|delete]');
      console.log('  set    - Set the webhook URL (default)');
      console.log('  info   - Get current webhook info');
      console.log('  delete - Delete the webhook');
  }
}

main().catch(console.error);
