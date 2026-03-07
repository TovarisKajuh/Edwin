type TTSProvider = 'browser' | 'elevenlabs' | 'openai';

const provider: TTSProvider = (process.env.TTS_PROVIDER as TTSProvider) || 'browser';

export async function textToSpeech(text: string): Promise<ArrayBuffer | null> {
  if (provider === 'elevenlabs') {
    return elevenLabsTTS(text);
  }
  if (provider === 'openai') {
    return openaiTTS(text);
  }
  // Browser TTS: return null, frontend handles it with SpeechSynthesis API
  return null;
}

async function openaiTTS(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured for TTS');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: process.env.TTS_VOICE || 'onyx',
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS error: ${response.status} — ${error}`);
  }

  return response.arrayBuffer();
}

async function elevenLabsTTS(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) throw new Error('ElevenLabs API key or voice ID not configured');

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
