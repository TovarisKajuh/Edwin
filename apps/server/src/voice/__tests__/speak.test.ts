import { describe, it, expect, vi, beforeEach } from 'vitest';
import { textToSpeech } from '../speak';

describe('Voice - Speak', () => {
  beforeEach(() => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'test-key');
    vi.stubEnv('ELEVENLABS_VOICE_ID', 'test-voice-id');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
  });

  it('should call ElevenLabs API and return audio buffer', async () => {
    const audio = await textToSpeech('Good morning, sir.');
    expect(audio).toBeInstanceOf(ArrayBuffer);
    expect(audio.byteLength).toBe(100);
  });

  it('should call ElevenLabs with correct URL and headers', async () => {
    await textToSpeech('Hello, sir.');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('test-voice-id'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'xi-api-key': 'test-key',
        }),
      }),
    );
  });

  it('should throw when API key is missing', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', '');
    await expect(textToSpeech('test')).rejects.toThrow('not configured');
  });

  it('should throw on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });
    await expect(textToSpeech('test')).rejects.toThrow('ElevenLabs API error');
  });
});
