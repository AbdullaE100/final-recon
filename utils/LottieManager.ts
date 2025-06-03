/**
 * LottieManager - Memory-efficient Lottie animation manager
 * Prevents memory crashes by limiting concurrent animations and managing resources
 */

class LottieManager {
  private static instance: LottieManager;
  private loadedAnimations = new Map<string, any>();
  private animationRefs = new Map<string, any>();
  private readonly maxConcurrentAnimations = 3; // Limit to prevent memory issues
  private readonly maxCacheSize = 5;

  static getInstance(): LottieManager {
    if (!LottieManager.instance) {
      LottieManager.instance = new LottieManager();
    }
    return LottieManager.instance;
  }

  /**
   * Load an animation with memory management
   */
  loadAnimation(key: string, source: any): any {
    // Check if already loaded
    if (this.loadedAnimations.has(key)) {
      return this.loadedAnimations.get(key);
    }

    // If we're at the limit, remove the oldest animation
    if (this.loadedAnimations.size >= this.maxConcurrentAnimations) {
      this.removeOldestAnimation();
    }

    // Load the new animation
    this.loadedAnimations.set(key, source);
    console.log(`[LottieManager] Loaded animation: ${key}. Total loaded: ${this.loadedAnimations.size}`);
    
    return source;
  }

  /**
   * Register an animation ref for cleanup
   */
  registerAnimationRef(key: string, ref: any): void {
    this.animationRefs.set(key, ref);
  }

  /**
   * Unload a specific animation
   */
  unloadAnimation(key: string): void {
    if (this.loadedAnimations.has(key)) {
      // Stop the animation if ref exists
      const ref = this.animationRefs.get(key);
      if (ref && ref.current) {
        try {
          ref.current.reset();
        } catch (error) {
          console.warn(`[LottieManager] Error stopping animation ${key}:`, error);
        }
      }

      this.loadedAnimations.delete(key);
      this.animationRefs.delete(key);
      console.log(`[LottieManager] Unloaded animation: ${key}. Total loaded: ${this.loadedAnimations.size}`);
    }
  }

  /**
   * Remove the oldest animation to free memory
   */
  private removeOldestAnimation(): void {
    const firstKey = this.loadedAnimations.keys().next().value;
    if (firstKey) {
      this.unloadAnimation(firstKey);
    }
  }

  /**
   * Clear all animations (emergency cleanup)
   */
  clearAllAnimations(): void {
    console.log('[LottieManager] Clearing all animations for memory cleanup');
    
    // Stop all animation refs
    this.animationRefs.forEach((ref, key) => {
      if (ref && ref.current) {
        try {
          ref.current.reset();
        } catch (error) {
          console.warn(`[LottieManager] Error stopping animation ${key}:`, error);
        }
      }
    });

    this.loadedAnimations.clear();
    this.animationRefs.clear();
  }

  /**
   * Get memory usage info
   */
  getMemoryInfo(): { loadedCount: number; maxConcurrent: number; cacheSize: number } {
    return {
      loadedCount: this.loadedAnimations.size,
      maxConcurrent: this.maxConcurrentAnimations,
      cacheSize: this.maxCacheSize
    };
  }

  /**
   * Check if we're approaching memory limits
   */
  isMemoryPressureHigh(): boolean {
    return this.loadedAnimations.size >= this.maxConcurrentAnimations - 1;
  }
}

export default LottieManager;

/**
 * Hook for using LottieManager in React components
 */
export const useLottieManager = () => {
  const manager = LottieManager.getInstance();
  
  const loadAnimation = (key: string, source: any) => {
    return manager.loadAnimation(key, source);
  };

  const unloadAnimation = (key: string) => {
    manager.unloadAnimation(key);
  };

  const registerRef = (key: string, ref: any) => {
    manager.registerAnimationRef(key, ref);
  };

  const isMemoryPressureHigh = () => {
    return manager.isMemoryPressureHigh();
  };

  return {
    loadAnimation,
    unloadAnimation,
    registerRef,
    isMemoryPressureHigh,
    memoryInfo: manager.getMemoryInfo()
  };
};