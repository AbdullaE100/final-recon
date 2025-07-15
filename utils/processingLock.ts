let isLocked = false;
let lockTimeout: ReturnType<typeof setTimeout> | null = null;

export const acquireLock = (duration: number = 8000): boolean => {
  if (isLocked) {
    console.warn('[ProcessingLock] Lock already acquired. Aborting new request.');
    return false;
  }

  isLocked = true;
  console.log(`[ProcessingLock] Lock acquired for up to ${duration}ms.`);

  if (lockTimeout) {
    clearTimeout(lockTimeout);
  }

  lockTimeout = setTimeout(() => {
    isLocked = false;
    lockTimeout = null;
    console.log('[ProcessingLock] Lock released automatically due to timeout.');
  }, duration);

  return true;
};

export const releaseLock = () => {
  if (lockTimeout) {
    clearTimeout(lockTimeout);
    lockTimeout = null;
  }
  if (isLocked) {
    isLocked = false;
    console.log('[ProcessingLock] Lock released manually.');
  }
};

export const isProcessing = (): boolean => {
  return isLocked;
}; 