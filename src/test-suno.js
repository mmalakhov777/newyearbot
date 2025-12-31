/**
 * Test script for Suno API
 * Run with: node src/test-suno.js
 */

import 'dotenv/config';

const SUNO_API_KEY = process.env.SUNO_API_KEY || '5c2ed21891e6e8434ff11bceeacfa42e';
const SUNO_API_URL = 'https://api.sunoapi.org';

async function testGenerateMusic() {
  console.log('Testing Suno API Music Generation...\n');

  // Test with simple non-custom mode first (as recommended for first-time users)
  const requestBody = {
    customMode: false,
    instrumental: false,
    prompt: 'Поздравление с Новым Годом для друга Максима, весёлая русская попса',
    model: 'V4',
    callBackUrl: 'https://example.com/callback' // Required but we'll poll instead
  };

  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  try {
    // Step 1: Start generation
    console.log('\n1. Starting music generation...');
    const generateResponse = await fetch(`${SUNO_API_URL}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const generateData = await generateResponse.json();
    console.log('Generate response:', JSON.stringify(generateData, null, 2));

    if (generateData.code !== 200) {
      console.error('Failed to start generation:', generateData.msg);
      return;
    }

    const taskId = generateData.data.taskId;
    console.log(`\nTask ID: ${taskId}`);

    // Step 2: Poll for status
    console.log('\n2. Polling for status (this may take 2-3 minutes)...\n');

    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
      attempts++;

      const statusResponse = await fetch(
        `${SUNO_API_URL}/api/v1/generate/record-info?taskId=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`
          }
        }
      );

      const statusData = await statusResponse.json();
      const status = statusData.data?.status;

      console.log(`Attempt ${attempts}: Status = ${status}`);

      if (status === 'SUCCESS') {
        console.log('\n=== GENERATION COMPLETE ===\n');
        console.log('Full response:', JSON.stringify(statusData, null, 2));

        const songs = statusData.data?.response?.sunoData || [];
        console.log(`\nGenerated ${songs.length} song(s):`);

        songs.forEach((song, i) => {
          console.log(`\nSong ${i + 1}:`);
          console.log(`  Title: ${song.title}`);
          console.log(`  Duration: ${song.duration}s`);
          console.log(`  Audio URL: ${song.audioUrl}`);
          console.log(`  Stream URL: ${song.streamAudioUrl}`);
          console.log(`  Image URL: ${song.imageUrl}`);
        });

        return statusData;
      }

      if (status?.includes('FAILED') || status?.includes('ERROR')) {
        console.error('\nGeneration failed:', statusData);
        return;
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('Timeout waiting for generation to complete');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run test
testGenerateMusic();
