import type { AiHintType } from '../../types/telemetry';

export class ScaffoldingTracker {
  private pendingHint: { levelId: number; hintType: AiHintType; timestamp: number } | null = null;

  recordHintRequest(levelId: number, hintType: AiHintType) {
    this.pendingHint = {
      levelId,
      hintType,
      timestamp: Date.now()
    };
  }

  evaluateNextAttempt(levelId: number, wasSuccessful: boolean): { effective: boolean; hintType: AiHintType } | null {
    if (this.pendingHint && this.pendingHint.levelId === levelId) {
      const hintType = this.pendingHint.hintType;
      this.pendingHint = null; // Consume the hint tracking
      return {
        effective: wasSuccessful,
        hintType
      };
    }
    return null;
  }

  clear() {
    this.pendingHint = null;
  }
}

export const scaffoldingTracker = new ScaffoldingTracker();
