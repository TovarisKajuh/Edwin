export async function textToSpeech(text: string): Promise<ArrayBuffer | null> {
  // ElevenLabs first. If it fails (quota, error, missing key), fall back to browser TTS.
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    if (apiKey && voiceId) {
      return await elevenLabsTTS(text, apiKey, voiceId);
    }
  } catch (err) {
    console.warn('ElevenLabs TTS failed, falling back to browser TTS:', (err as Error).message);
  }

  // Browser TTS: return null, frontend handles it with SpeechSynthesis API
  return null;
}

async function elevenLabsTTS(text: string, apiKey: string, voiceId: string): Promise<ArrayBuffer> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} — ${error}`);
  }

  return response.arrayBuffer();
}
