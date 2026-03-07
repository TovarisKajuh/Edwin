import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Voice - Speak', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
  });

  it('should return null in browser TTS mode (default)', async () => {
    vi.stubEnv('TTS_PROVIDER', 'browser');
    const { textToSpeech } = await import('../speak');
    const audio = await textToSpeech('Good morning, sir.');
    expect(audio).toBeNull();
  });

  it('should call ElevenLabs when provider is elevenlabs', async () => {
    vi.stubEnv('TTS_PROVIDER', 'elevenlabs');
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

  it('should call OpenAI when provider is openai', async () => {
    vi.stubEnv('TTS_PROVIDER', 'openai');
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    const { textToSpeech } = await import('../speak');
    const audio = await textToSpeech('Good morning, sir.');
    expect(audio).toBeInstanceOf(ArrayBuffer);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('openai.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Authorization': 'Bearer test-openai-key' }),
      }),
    );
  });

  it('should throw when ElevenLabs key is missing', async () => {
    vi.stubEnv('TTS_PROVIDER', 'elevenlabs');
    vi.stubEnv('ELEVENLABS_API_KEY', '');
    vi.stubEnv('ELEVENLABS_VOICE_ID', '');
    const { textToSpeech } = await import('../speak');
    await expect(textToSpeech('test')).rejects.toThrow('not configured');
  });
});
