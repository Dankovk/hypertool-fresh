export function nextFrame(callback: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 16);
  }
}

export function waitForCondition(condition: () => boolean, maxAttempts: number, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function tick() {
      attempts += 1;

      try {
        if (condition()) {
          resolve();
          return;
        }
      } catch (error) {
        // ignore errors from condition evaluation and keep waiting
      }

      if (attempts >= maxAttempts) {
        reject(new Error(`[hyper-frame] Timed out waiting for ${label}`));
        return;
      }

      nextFrame(tick);
    }

    tick();
  });
}
