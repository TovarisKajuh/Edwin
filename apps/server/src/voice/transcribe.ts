/**
 * Speech-to-text transcription using ElevenLabs Scribe API.
 * Uses Jan's existing ElevenLabs API key — no new keys needed.
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const ext = mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('webm') ? 'webm'
    : mimeType.includes('ogg') ? 'ogg'
    : 'wav';

  const formData = new FormData();
  formData.append('model_id', 'scribe_v1');
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), `recording.${ext}`);

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs STT error: ${response.status} — ${error}`);
  }

  const data = await response.json() as { text: string };
  console.log('[STT] Transcribed:', data.text?.slice(0, 80));
  return data.text || '';
}
