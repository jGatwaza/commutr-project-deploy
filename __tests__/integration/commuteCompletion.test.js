/**
 * CTR-82: Video watch counter shows 0 on commute completion
 *
 * This test is intentionally written to FAIL while the bug exists.
 * It encodes the desired behavior (we should NOT clear commute state
 * before rendering the "Commute Complete" summary) and inspects the
 * ImmersivePlayer/CommuteContext source code to detect the bug.
 *
 * Limitations:
 * - Uses static analysis instead of rendering React components
 * - Does not assert real-time (<5s) UI updates
 * - Does not simulate multiple consecutive videos
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('CTR-82: Commute completion video counter', () => {
  const immersivePath = join(process.cwd(), 'client/pages/ImmersivePlayer.jsx');
  const commuteContextPath = join(process.cwd(), 'client/context/CommuteContext.jsx');

  let immersiveSource;
  let commuteContextSource;

  beforeAll(() => {
    immersiveSource = readFileSync(immersivePath, 'utf-8');
    commuteContextSource = readFileSync(commuteContextPath, 'utf-8');
  });

  test('completion summary derives "Videos Watched" from commute context', () => {
    // Guard: the summary should render a "Videos Watched" tile
    expect(immersiveSource.includes('Videos Watched')).toBe(true);

    // Guard: the stat value should be based on watchedVideoIds from CommuteContext
    expect(immersiveSource.includes('contextWatchedIds.length')).toBe(true);
    expect(commuteContextSource.includes('const [watchedVideoIds, setWatchedVideoIds]')).toBe(true);
  });

  test('BUG-FIX EXPECTATION: do not clear commute context before showing completion summary', () => {
    // For the bug to be fixed, we must avoid calling endCommute() immediately
    // after toggling showCompletion. That pattern clears watchedVideoIds and
    // topics before the summary screen reads them, which produces "0 videos".
    const unsafePattern = /setShowCompletion\(true\);\s*endCommute\(\)/;

    // While the bug exists, this assertion FAILS because the unsafe pattern
    // is present in ImmersivePlayer.jsx. Once fixed, the pattern disappears
    // and this test will pass.
    expect(unsafePattern.test(immersiveSource)).toBe(false);
  });
});
