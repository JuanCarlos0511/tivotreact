export class IdleDetector {
  private thresholdMs: number;
  private onIdle: (idleDurationMs: number) => void;
  private timeoutId: number | null = null;
  private lastActivityTime = 0;
  private isTracking = false;

  constructor(thresholdMs = 45000, onIdle: (idleDurationMs: number) => void) {
    this.thresholdMs = thresholdMs;
    this.onIdle = onIdle;
    this.handleActivity = this.throttle(this.handleActivity.bind(this), 1000);
  }

  private throttle(fn: () => void, wait: number) {
    let time = Date.now();
    return function() {
      if ((time + wait - Date.now()) < 0) {
        fn();
        time = Date.now();
      }
    };
  }

  private handleActivity() {
    const now = Date.now();
    
    // If we were idle, notify how long
    if (this.timeoutId === null && this.lastActivityTime > 0) {
      const idleTime = now - this.lastActivityTime;
      if (idleTime >= this.thresholdMs) {
        this.onIdle(idleTime);
      }
    }
    
    this.lastActivityTime = now;
    this.resetTimer();
  }

  private resetTimer() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }
    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = null; // Mark as idle
    }, this.thresholdMs);
  }

  start() {
    if (this.isTracking) return;
    this.isTracking = true;
    this.lastActivityTime = Date.now();
    this.resetTimer();
    
    const options = { passive: true };
    window.addEventListener('keydown', this.handleActivity, options);
    window.addEventListener('pointerdown', this.handleActivity, options);
    window.addEventListener('pointermove', this.handleActivity, options);
    window.addEventListener('scroll', this.handleActivity, options);
  }

  stop() {
    if (!this.isTracking) return;
    this.isTracking = false;
    if (this.timeoutId) window.clearTimeout(this.timeoutId);
    this.timeoutId = null;
    
    window.removeEventListener('keydown', this.handleActivity);
    window.removeEventListener('pointerdown', this.handleActivity);
    window.removeEventListener('pointermove', this.handleActivity);
    window.removeEventListener('scroll', this.handleActivity);
  }

  reset() {
    if (this.isTracking) {
      this.handleActivity();
    }
  }
}
