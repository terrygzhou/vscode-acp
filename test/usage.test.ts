import { describe, it } from 'mocha';
import { strictEqual } from 'assert';
import { formatTokens, computeUsageSuffix } from '../src/util/usage';

/** Replicate the webview JS formatTokens variant (uses Math.round).
 * Lives in inline webview HTML — can't import directly. */
function formatTokensWebview(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
}

/** Replicate the restoreState() usage bar logic from ChatWebviewProvider.
 * Lives in inline webview HTML — can't import directly. */
interface RestoreStateResult {
  barRestored: boolean;
  usage: { used: number; size: number } | null;
}

function simulateRestoreState(
  hasActiveSession: boolean,
  sessionState: { usage?: { used: number; size: number } } | null,
): RestoreStateResult {
  const usage = (hasActiveSession && sessionState?.usage)
    ? sessionState.usage
    : null;
  return { barRestored: usage !== null, usage };
}

describe('Usage display', () => {

  describe('formatTokens (status bar)', () => {
    const cases: [number, string][] = [
      [0, '0'],
      [42, '42'],
      [999, '999'],
      [1_000, '1K'],
      [1_500, '2K'],
      [45_000, '45K'],
      [199_999, '200K'],
      [999_999, '1000K'],
      [1_000_000, '1.0M'],
      [1_500_000, '1.5M'],
      [200_000, '200K'],
      [999_000, '999K'],
    ];

    for (const [input, expected] of cases) {
      it(`formats ${input} as "${expected}"`, () => {
        strictEqual(formatTokens(input), expected);
      });
    }
  });

  describe('formatTokens (webview)', () => {
    it('rounds 1500 to "2K"', () => {
      strictEqual(formatTokensWebview(1_500), '2K');
    });
    it('rounds 1499 to "1K" (Math.round differs from toFixed)', () => {
      strictEqual(formatTokensWebview(1_499), '1K');
    });
    it('handles millions', () => {
      strictEqual(formatTokensWebview(1_500_000), '1.5M');
    });
    it('handles small numbers', () => {
      strictEqual(formatTokensWebview(42), '42');
    });
  });

  describe('usage guard (status bar suffix)', () => {
    it('shows suffix for valid usage', () => {
      strictEqual(computeUsageSuffix({ used: 45_000, size: 200_000 }), '  45K/200K');
    });

    it('returns empty string when size is 0', () => {
      strictEqual(computeUsageSuffix({ used: 45_000, size: 0 }), '');
    });

    it('returns correct suffix when used is 0 but size is valid', () => {
      strictEqual(computeUsageSuffix({ used: 0, size: 200_000 }), '  0/200K');
    });

    it('returns empty string when usage is null', () => {
      strictEqual(computeUsageSuffix(null), '');
    });

    it('returns empty string when usage is undefined', () => {
      strictEqual(computeUsageSuffix(undefined), '');
    });

    it('returns empty string when size is missing', () => {
      // Runtime guard: usage?.size is undefined → falsy → empty string
      strictEqual(computeUsageSuffix({ used: 45_000 } as any), '');
    });
  });

  describe('restoreState usage bar gating', () => {
    it('restores bar when session is active and has usage', () => {
      const result = simulateRestoreState(true, { usage: { used: 45_000, size: 200_000 } });
      strictEqual(result.barRestored, true);
      strictEqual(result.usage!.used, 45_000);
    });

    it('does NOT restore bar when no active session (avoids stale counts)', () => {
      const result = simulateRestoreState(false, { usage: { used: 45_000, size: 200_000 } });
      strictEqual(result.barRestored, false);
      strictEqual(result.usage, null);
    });

    it('does NOT restore bar when session has no usage data', () => {
      const result = simulateRestoreState(true, {});
      strictEqual(result.barRestored, false);
      strictEqual(result.usage, null);
    });

    it('does NOT restore bar when sessionState is null', () => {
      const result = simulateRestoreState(true, null);
      strictEqual(result.barRestored, false);
      strictEqual(result.usage, null);
    });

    it('does NOT restore bar when both active session and sessionState are falsy', () => {
      const result = simulateRestoreState(false, null);
      strictEqual(result.barRestored, false);
      strictEqual(result.usage, null);
    });
  });
});
