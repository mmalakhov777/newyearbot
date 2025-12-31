/**
 * Suno API integration for generating New Year songs
 */

const SUNO_API_URL = 'https://api.sunoapi.org';

/**
 * Generate a personalized New Year song
 * @param {Object} userInfo - User information for personalization
 * @param {Function} onStatus - Callback for status updates
 * @returns {Promise<Object|null>} Generated song data or null on failure
 */
export async function generateSong(userInfo, onStatus) {
  const songPrompt = buildSongPrompt(userInfo);

  try {
    if (onStatus) await onStatus('starting');

    // Start generation
    const generateResponse = await fetch(`${SUNO_API_URL}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`
      },
      body: JSON.stringify({
        customMode: true,
        instrumental: false,
        prompt: songPrompt.lyrics,
        style: songPrompt.style,
        title: songPrompt.title,
        model: 'V4',
        callBackUrl: 'https://example.com/suno-callback' // Required but we poll
      })
    });

    const generateData = await generateResponse.json();
    console.log('Suno generate response:', generateData);

    if (generateData.code !== 200) {
      console.error('Suno API error:', generateData.msg);
      return null;
    }

    const taskId = generateData.data.taskId;
    console.log(`Suno task started: ${taskId}`);

    if (onStatus) await onStatus('generating');

    // Poll for completion (max 3 minutes)
    const song = await pollForCompletion(taskId, onStatus);
    return song;

  } catch (error) {
    console.error('Error generating song:', error);
    return null;
  }
}

/**
 * Poll Suno API for task completion
 * @param {string} taskId - Task ID to poll
 * @param {Function} onStatus - Status callback
 * @returns {Promise<Object|null>} Song data or null
 */
async function pollForCompletion(taskId, onStatus) {
  const maxAttempts = 36; // 3 minutes (5 sec intervals)
  const pollInterval = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${SUNO_API_URL}/api/v1/generate/record-info?taskId=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SUNO_API_KEY}`
          }
        }
      );

      const data = await response.json();
      const status = data.data?.status;

      console.log(`Suno poll attempt ${attempt}: ${status}`);

      if (status === 'SUCCESS') {
        const songs = data.data?.response?.sunoData || [];
        if (songs.length > 0) {
          // Return the first song
          const song = songs[0];
          console.log('Song generated:', song.title, song.audioUrl);
          return {
            id: song.id,
            title: song.title,
            audioUrl: song.audioUrl,
            streamUrl: song.streamAudioUrl,
            imageUrl: song.imageUrl,
            duration: song.duration
          };
        }
        return null;
      }

      if (status === 'FIRST_SUCCESS' && onStatus) {
        await onStatus('almost_done');
      }

      if (status?.includes('FAILED') || status?.includes('ERROR')) {
        console.error('Suno generation failed:', status);
        return null;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      console.error(`Poll attempt ${attempt} error:`, error.message);
      // Continue polling on network errors
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  console.log('Suno polling timeout');
  return null;
}

/**
 * Build song prompt based on user info
 * @param {Object} userInfo - User information
 * @returns {Object} Song prompt with lyrics, style, and title
 */
function buildSongPrompt(userInfo) {
  const name = userInfo.firstName || 'друг';

  // Russian pop style lyrics for New Year greeting
  const lyrics = `[Verse 1]
С Новым Годом, ${name}!
Пусть сбываются мечты
Счастье, радость, вдохновенье
И любви полны цветы

[Chorus]
Новый Год стучится в двери
Волшебство уже вокруг
${name}, я тебе желаю
Быть счастливым, милый друг

[Verse 2]
Пусть удача не оставит
Каждый день твоих дорог
Максим шлёт тебе приветы
И желает только добра

[Outro]
С Новым Годом! С Новым счастьем!
От Максима с теплотой`;

  return {
    lyrics,
    style: 'russian pop, festive, happy new year, cheerful, synthesizer, 90s russian estrada',
    title: `Новогоднее поздравление для ${name}`
  };
}
