/**
 * Test script for image generation
 */

import 'dotenv/config';
import { generateGreetingCard } from './imagegen.js';

const testUser = {
  firstName: 'Тест',
  lastName: 'Тестович',
  username: 'testuser',
  languageCode: 'ru'
};

console.log('Testing image generation with google/gemini-2.5-flash-image...\n');

try {
  const imageUrl = await generateGreetingCard(testUser);

  if (imageUrl) {
    console.log('✅ Image generation works!');
    console.log('\nImage URL (first 100 chars):', imageUrl.substring(0, 100) + '...');
  } else {
    console.log('❌ No image returned');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
