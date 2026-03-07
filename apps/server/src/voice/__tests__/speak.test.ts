import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Voice - Speak', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
  });

  it('should call ElevenLabs when keys are configured', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'test-key');
    vi.stubEnv('ELEVENLABS_VOICE_ID', 'test-voice-id');
    const { textToSpeech } = await import('../speak');
    const audio = await textToSpeech('Good morning, sir.');
    expect(audio).toBeInstanceOf(ArrayBuffer);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('test-voice-id'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'xi-api-key': 'test-key' }),
      }),
    );
  });

  it('should fall back to browser TTS when ElevenLabs keys are missing', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', '');
    vi.stubEnv('ELEVENLABS_VOICE_ID', '');
    const { textToSpeech } = await import('../speak');
    const audio = await textToSpeech('Good morning, sir.');
    expect(audio).toBeNull();
  });

  it('should fall back to browser TTS when ElevenLabs API fails', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'test-key');
    vi.stubEnv('ELEVENLABS_VOICE_ID', 'test-voice-id');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('quota_exceeded'),
    });
    const { textToSpeech } = await import('../speak');
    const audio = await textToSpeech('test');
    expect(audio).toBeNull();
  });
});
