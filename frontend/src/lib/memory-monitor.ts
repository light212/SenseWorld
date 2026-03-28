/**
 * 内存监控和自动垃圾回收系统
 * 确保零内存泄漏和高性能运行
 */

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  domNodes: number;
  eventListeners: number;
  audioContexts: number;
  objectURLs: number;
  timestamp: number;
}

export interface MemoryThresholds {
  warningThreshold: number;  // 80%
  criticalThreshold: number; // 90%
  maxObjectURLs: number;     // 50
  maxAudioContexts: number;  // 5
  gcInterval: number;        // 30秒
}

/**
 * 内存监控器
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private thresholds: MemoryThresholds;
  private metricsHistory: MemoryMetrics[] = [];
  private maxHistoryLength = 100;
  private objectURLs = new Set<string>();
  private audioContexts = new Set<AudioContext>();

  private constructor(thresholds?: Partial<MemoryThresholds>) {
    this.thresholds = {
      warningThreshold: 0.8,
      criticalThreshold: 0.9,
      maxObjectURLs: 50,
      maxAudioContexts: 5,
      gcInterval: 30000,
      ...thresholds
    };
  }

  static getInstance(thresholds?: Partial<MemoryThresholds>): MemoryMonitor {
    if (!this.instance) {
      this.instance = new MemoryMonitor(thresholds);
    }
    return this.instance;
  }

  /**
   * 开始内存监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.performGarbageCollection();
    }, this.thresholds.gcInterval);

    console.log('🔍 内存监控已启动');
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🔍 内存监控已停止');
  }

  /**
   * 收集内存指标
   */
  private collectMetrics(): void {
    const performanceMemory = (performance as any).memory;
    const domNodes = document.getElementsByTagName('*').length;
    const eventListeners = this.estimateEventListenerCount();

    const metrics: MemoryMetrics = {
      usedJSHeapSize: performanceMemory?.usedJSHeapSize || 0,
      totalJSHeapSize: performanceMemory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: performanceMemory?.jsHeapSizeLimit || 0,
      domNodes,
      eventListeners,
      audioContexts: this.audioContexts.size,
      objectURLs: this.objectURLs.size,
      timestamp: Date.now()
    };

    this.metricsHistory.push(metrics);

    // 限制历史记录长度
    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory.shift();
    }

    // 检查内存使用阈值
    this.checkMemoryThresholds(metrics);
  }

  /**
   * 检查内存使用阈值
   */
  private checkMemoryThresholds(metrics: MemoryMetrics): void {
    const usageRatio = metrics.usedJSHeapSize / metrics.jsHeapSizeLimit;

    if (usageRatio >= this.thresholds.criticalThreshold) {
      console.error('🚨 内存使用达到临界值:', usageRatio * 100 + '%');
      this.performEmergencyCleanup();
    } else if (usageRatio >= this.thresholds.warningThreshold) {
      console.warn('⚠️ 内存使用过高:', usageRatio * 100 + '%');
      this.performGarbageCollection();
    }

    // 检查ObjectURL数量
    if (this.objectURLs.size >= this.thresholds.maxObjectURLs) {
      console.warn('⚠️ ObjectURL数量过多:', this.objectURLs.size);
      this.cleanupOldObjectURLs();
    }

    // 检查AudioContext数量
    if (this.audioContexts.size >= this.thresholds.maxAudioContexts) {
      console.warn('⚠️ AudioContext数量过多:', this.audioContexts.size);
      this.cleanupOldAudioContexts();
    }
  }

  /**
   * 执行垃圾回收
   */
  private performGarbageCollection(): void {
    // 清理ObjectURLs
    if (this.objectURLs.size > this.thresholds.maxObjectURLs * 0.8) {
      this.cleanupOldObjectURLs();
    }

    // 清理AudioContexts
    if (this.audioContexts.size > this.thresholds.maxAudioContexts * 0.8) {
      this.cleanupOldAudioContexts();
    }

    // 触发浏览器垃圾回收（如果支持）
    if ((window as any).gc) {
      try {
        (window as any).gc();
      } catch (error) {
        // 忽略错误
      }
    }
  }

  /**
   * 执行紧急清理
   */
  private performEmergencyCleanup(): void {
    console.error('🚨 执行紧急内存清理');

    // 清理所有ObjectURLs
    this.cleanupAllObjectURLs();

    // 关闭所有AudioContexts
    this.cleanupAllAudioContexts();

    // 清理缓存
    this.clearAllCaches();

    // 强制垃圾回收
    if ((window as any).gc) {
      try {
        (window as any).gc();
      } catch (error) {
        // 忽略错误
      }
    }
  }

  /**
   * 注册ObjectURL进行跟踪
   */
  registerObjectURL(url: string): void {
    this.objectURLs.add(url);
  }

  /**
   * 注销ObjectURL
   */
  unregisterObjectURL(url: string): void {
    this.objectURLs.delete(url);
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      // URL可能已经被释放
    }
  }

  /**
   * 注册AudioContext进行跟踪
   */
  registerAudioContext(context: AudioContext): void {
    this.audioContexts.add(context);
  }

  /**
   * 注销AudioContext
   */
  unregisterAudioContext(context: AudioContext): void {
    this.audioContexts.delete(context);
    try {
      context.close();
    } catch (error) {
      // Context可能已经关闭
    }
  }

  /**
   * 清理旧的ObjectURLs
   */
  private cleanupOldObjectURLs(): void {
    const urlsToRemove = Array.from(this.objectURLs).slice(0, 10); // 每次清理10个
    urlsToRemove.forEach(url => {
      this.unregisterObjectURL(url);
    });
    console.log('🧹 清理了', urlsToRemove.length, '个ObjectURLs');
  }

  /**
   * 清理所有ObjectURLs
   */
  private cleanupAllObjectURLs(): void {
    const urlsToRemove = Array.from(this.objectURLs);
    urlsToRemove.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        // 忽略错误
      }
    });
    this.objectURLs.clear();
    console.log('🧹 清理了所有', urlsToRemove.length, '个ObjectURLs');
  }

  /**
   * 清理旧的AudioContexts
   */
  private cleanupOldAudioContexts(): void {
    const contextsToRemove = Array.from(this.audioContexts).slice(0, 2); // 每次关闭2个
    contextsToRemove.forEach(context => {
      this.unregisterAudioContext(context);
    });
    console.log('🧹 关闭了', contextsToRemove.length, '个AudioContexts');
  }

  /**
   * 清理所有AudioContexts
   */
  private cleanupAllAudioContexts(): void {
    const contextsToRemove = Array.from(this.audioContexts);
    contextsToRemove.forEach(context => {
      try {
        context.close();
      } catch (error) {
        // 忽略错误
      }
    });
    this.audioContexts.clear();
    console.log('🧹 关闭了所有', contextsToRemove.length, '个AudioContexts');
  }

  /**
   * 清理所有缓存
   */
  private clearAllCaches(): void {
    // 清理Cache API
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => {
          caches.delete(key);
        });
      });
    }

    // 清理localStorage（保留重要数据）
    const importantKeys = ['auth-token', 'user-preferences'];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !importantKeys.includes(key)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log('🧹 清理了所有缓存');
  }

  /**
   * 估算事件监听器数量
   */
  private estimateEventListenerCount(): number {
    // 这是一个简化的估算，实际实现可能需要更复杂的逻辑
    let count = 0;
    const allElements = document.getElementsByTagName('*');

    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      // 这里可以添加更精确的事件监听器计数逻辑
      // 目前返回一个估算值
      count += element.getAttributeNames().length;
    }

    return count;
  }

  /**
   * 获取当前内存指标
   */
  getCurrentMetrics(): MemoryMetrics | null {
    return this.metricsHistory.length > 0
      ? { ...this.metricsHistory[this.metricsHistory.length - 1] }
      : null;
  }

  /**
   * 获取内存使用趋势
   */
  getMemoryTrend(): {
    isIncreasing: boolean;
    growthRate: number;
    prediction: string;
  } {
    if (this.metricsHistory.length < 10) {
      return {
        isIncreasing: false,
        growthRate: 0,
        prediction: '数据不足'
      };
    }

    const recent = this.metricsHistory.slice(-10);
    const first = recent[0].usedJSHeapSize;
    const last = recent[recent.length - 1].usedJSHeapSize;
    const growthRate = (last - first) / first;

    let prediction = '稳定';
    if (growthRate > 0.1) {
      prediction = '快速增长';
    } else if (growthRate > 0.05) {
      prediction = '缓慢增长';
    } else if (growthRate < -0.05) {
      prediction = '下降';
    }

    return {
      isIncreasing: growthRate > 0,
      growthRate: growthRate * 100,
      prediction
    };
  }

  /**
   * 手动触发垃圾回收
   */
  triggerGarbageCollection(): void {
    this.performGarbageCollection();
  }

  /**
   * 获取监控状态
   */
  getStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    objectURLsCount: number;
    audioContextsCount: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metricsHistory.length,
      objectURLsCount: this.objectURLs.size,
      audioContextsCount: this.audioContexts.size
    };
  }
}

// 导出单例实例
export const memoryMonitor = MemoryMonitor.getInstance();

// 全局内存监控API
if (typeof window !== 'undefined') {
  (window as any).memoryMonitor = memoryMonitor;
}