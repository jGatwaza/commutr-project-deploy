/**
 * CTR-83: Voice messages should not auto-send after transcription
 *
 * This test is intentionally written so that it would FAIL while the
 * current auto-send behavior exists. It encodes the desired behavior
 * (voice input should populate the chat box but NOT auto-submit) using
 * static analysis of the AgentMode and VoiceButton source.
 *
 * Limitations:
 * - Uses static analysis instead of rendering React components
 * - Does not exercise real browser SpeechRecognition APIs
 * - Cannot verify timing or multi-turn edge cases
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('CTR-83: Agent voice input auto-send behavior', () => {
  const agentModePath = join(process.cwd(), 'client/pages/AgentMode.jsx');
  const voiceButtonPath = join(process.cwd(), 'client/components/VoiceButton.jsx');

  let agentModeSource;
  let voiceButtonSource;

  beforeAll(() => {
    agentModeSource = readFileSync(agentModePath, 'utf-8');
    voiceButtonSource = readFileSync(voiceButtonPath, 'utf-8');
  });

  test('AgentMode wires VoiceButton into the chat input', () => {
    // Guard: AgentMode should render VoiceButton and connect transcript + status
    expect(agentModeSource.includes('<VoiceButton')).toBe(true);
    expect(agentModeSource.includes('onTranscript={handleVoiceTranscript}')).toBe(true);
    expect(agentModeSource.includes('onStatus={handleVoiceStatus}')).toBe(true);
    expect(agentModeSource.includes('onComplete={handleVoiceComplete}')).toBe(true);
  });

  test('BUG-FIX EXPECTATION: voice transcription should NOT auto-submit without manual Send', () => {
    // VoiceButton should not trigger onComplete directly from recognition.onend
    const autoCompletePattern = /recognition\.onend[\s\S]+onComplete/;

    // While the bug exists, onend still calls callbacksRef.current.onComplete(),
    // so this assertion will FAIL. Once fixed, onend should only stop recording
    // and leave the text in the input for manual review.
    expect(autoCompletePattern.test(voiceButtonSource)).toBe(false);

    // AgentMode should not auto-submit inside handleVoiceComplete.
    // The current implementation includes an explicit "Auto-submit" comment
    // and makes a fetch() call directly from handleVoiceComplete. After the
    // fix, that function should either be removed or limited to UI concerns.
    const autoSubmitCommentPattern = /Auto-submit after voice input/;
    const directFetchPattern = /handleVoiceComplete[\s\S]+fetch\(`/;

    expect(autoSubmitCommentPattern.test(agentModeSource)).toBe(false);
    expect(directFetchPattern.test(agentModeSource)).toBe(false);
  });
});
