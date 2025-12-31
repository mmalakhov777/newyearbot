/**
 * Test script for text generation
 */

import 'dotenv/config';
import { generateGreetingStream } from './openrouter.js';

const testUser = {
  firstName: 'Сергей',
  lastName: 'Иванов',
  username: 'sergey_ivanov',
  languageCode: 'ru'
};

console.log(`Testing with name: ${testUser.firstName} ${testUser.lastName}\n`);

try {
  const greeting = await generateGreetingStream(testUser, (chunk) => {
    process.stdout.write('.');
  });

  console.log('\n\n--- Generated Greeting ---\n');
  console.log(greeting);
  console.log('\n--- End ---');

  if (greeting && greeting.length > 0) {
    console.log('\n✅ Text generation works!');
  } else {
    console.log('\n❌ Empty response received');
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
}
