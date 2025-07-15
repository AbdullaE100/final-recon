let isLocked = false;
let lockTimeout: ReturnType<typeof setTimeout> | null = null;

export const acquireLock = (duration: number = 5000): boolean => {
  if (isLocked) {
    console.warn('[ProcessingLock] Lock already acquired. Skipping new lock.');
    return false;
  }

  isLocked = true;
  console.log(`[ProcessingLock] Lock acquired for ${duration}ms.`);

  if (lockTimeout) {
    clearTimeout(lockTimeout);
  }

  lockTimeout = setTimeout(() => {
    isLocked = false;
    lockTimeout = null;
    console.log('[ProcessingLock] Lock released automatically.');
  }, duration);

  return true;
};

export const releaseLock = () => {
  if (lockTimeout) {
    clearTimeout(lockTimeout);
    lockTimeout = null;
  }
  isLocked = false;
  console.log('[ProcessingLock] Lock released manually.');
};

export const isProcessing = (): boolean => {
  return isLocked;
}; 