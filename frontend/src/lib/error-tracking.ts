/**
 * 错误追踪和日志系统
 * 提供完整的错误监控、追踪和报告功能
 */

export interface ErrorEvent {
  id: string;
  timestamp: number;
  type: 'error' | 'warning' | 'info' | 'debug';
  category: 'audio' | 'network' | 'ui' | 'tts' | 'memory' | 'unknown';
  message: string;
  stack?: string;
  context: Record<string, any>;
  userId?: string;
  sessionId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByCategory: Record<string, number>;
  errorsByHour: number[];
  averageResponseTime: number;
  lastErrorTime?: number;
}

export interface ErrorTrackingConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
  maxErrorsStored: number;
  samplingRate: number;
  includeStackTraces: boolean;
  includeContext: boolean;
}

/**
 * 错误追踪器
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private config: ErrorTrackingConfig;
  private errorHistory: ErrorEvent[] = [];
  private errorCounts = new Map<string, number>();
  private isInitialized = false;
  private sessionId: string;
  private _isLogging = false; // 防止递归
  private originalConsole: { error?: (...args: any[]) => void; warn?: (...args: any[]) => void; info?: (...args: any[]) => void } = {};

  private constructor(config?: Partial<ErrorTrackingConfig>) {
    this.config = {
      enableConsoleLogging: true,
      enableRemoteLogging: false,
      maxErrorsStored: 1000,
      samplingRate: 1.0, // 100%采样率
      includeStackTraces: true,
      includeContext: true,
      ...config
    };

    this.sessionId = crypto.randomUUID();
  }

  static getInstance(config?: Partial<ErrorTrackingConfig>): ErrorTracker {
    if (!this.instance) {
      this.instance = new ErrorTracker(config);
    }
    return this.instance;
  }

  /**
   * 初始化错误追踪
   */
  initialize(): void {
    if (this.isInitialized) return;

    // 捕获未处理的错误
    window.addEventListener('error', this.handleGlobalError.bind(this) as any);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // 注意：不拦截 console 方法，避免递归
    this.isInitialized = true;
  }

  /**
   * 手动记录错误
   */
  logError(
    message: string,
    category: ErrorEvent['category'] = 'unknown',
    severity: ErrorEvent['severity'] = 'medium',
    context: Record<string, any> = {},
    error?: Error
  ): void {
    // 采样检查
    if (Math.random() > this.config.samplingRate) {
      return;
    }

    const errorEvent: ErrorEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'error',
      category,
      message,
      stack: error?.stack || this.getStackTrace(),
      context: this.config.includeContext ? context : {},
      sessionId: this.sessionId,
      severity
    };

    this.recordError(errorEvent);
  }

  /**
   * 记录警告
   */
  logWarning(
    message: string,
    category: ErrorEvent['category'] = 'unknown',
    context: Record<string, any> = {}
  ): void {
    const errorEvent: ErrorEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'warning',
      category,
      message,
      context: this.config.includeContext ? context : {},
      sessionId: this.sessionId,
      severity: 'low'
    };

    this.recordError(errorEvent);
  }

  /**
   * 记录信息
   */
  logInfo(
    message: string,
    category: ErrorEvent['category'] = 'unknown',
    context: Record<string, any> = {}
  ): void {
    const errorEvent: ErrorEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'info',
      category,
      message,
      context: this.config.includeContext ? context : {},
      sessionId: this.sessionId,
      severity: 'low'
    };

    this.recordError(errorEvent);
  }

  /**
   * 记录错误事件
   */
  private recordError(errorEvent: ErrorEvent): void {
    // 添加到历史记录
    this.errorHistory.push(errorEvent);

    // 限制历史记录长度
    if (this.errorHistory.length > this.config.maxErrorsStored) {
      this.errorHistory.shift();
    }

    // 更新错误计数
    const key = `${errorEvent.category}:${errorEvent.message}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // 控制台输出
    if (this.config.enableConsoleLogging) {
      this.logToConsole(errorEvent);
    }

    // 远程日志
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendToRemote(errorEvent);
    }
  }

  /**
   * 控制台输出
   */
  private logToConsole(errorEvent: ErrorEvent): void {
    this._isLogging = true;
    try {
      const timestamp = new Date(errorEvent.timestamp).toISOString();
      const prefix = `[${timestamp}] [${errorEvent.category.toUpperCase()}]`;

      // 使用原始 console 方法，避免递归
      const _error = this.originalConsole.error || console.error.bind(console);
      const _warn = this.originalConsole.warn || console.warn.bind(console);
      const _info = this.originalConsole.info || console.info.bind(console);

      switch (errorEvent.type) {
        case 'error':
          _error(`${prefix} ${errorEvent.message}`, errorEvent.context);
          break;
        case 'warning':
          _warn(`${prefix} ${errorEvent.message}`, errorEvent.context);
          break;
        case 'info':
          _info(`${prefix} ${errorEvent.message}`, errorEvent.context);
          break;
        default:
          _info(`${prefix} ${errorEvent.message}`, errorEvent.context);
      }
    } finally {
      this._isLogging = false;
    }
  }

  /**
   * 发送到远程日志服务
   */
  private async sendToRemote(errorEvent: ErrorEvent): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorEvent)
      });
    } catch (error) {
      // 远程日志发送失败，静默处理
      console.warn('远程日志发送失败:', error);
    }
  }

  /**
   * 处理全局错误
   */
  private handleGlobalError(event: ErrorEvent & { filename?: string; lineno?: number; colno?: number; error?: Error }): void {
    this.logError(
      event.message || '未捕获的错误',
      'unknown',
      'high',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      },
      event.error
    );
  }

  /**
   * 处理未处理的Promise拒绝
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    this.logError(
      `未处理的Promise拒绝: ${event.reason}`,
      'unknown',
      'high',
      {
        reason: event.reason
      }
    );
  }

  /**
   * 包装控制台方法
   */
  private wrapConsoleMethods(): void {
    // 保存原始方法引用，供 logToConsole 使用，避免递归
    this.originalConsole.error = console.error.bind(console);
    this.originalConsole.warn = console.warn.bind(console);
    this.originalConsole.info = console.info.bind(console);

    const self = this;

    console.error = (...args: any[]) => {
      self.originalConsole.error!(...args);
      if (!self._isLogging) self.logError(args.join(' '), 'ui', 'medium', { source: 'console' });
    };

    console.warn = (...args: any[]) => {
      self.originalConsole.warn!(...args);
      if (!self._isLogging) self.logWarning(args.join(' '), 'ui', { source: 'console' });
    };

    console.info = (...args: any[]) => {
      self.originalConsole.info!(...args);
      if (!self._isLogging) self.logInfo(args.join(' '), 'ui', { source: 'console' });
    };
  }

  /**
   * 获取堆栈跟踪
   */
  private getStackTrace(): string | undefined {
    try {
      const error = new Error();
      return error.stack;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取错误指标
   */
  getErrorMetrics(): ErrorMetrics {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // 统计最近一小时的错误
    const recentErrors = this.errorHistory.filter(e => e.timestamp > oneHourAgo);
    const errorsByHour = new Array(24).fill(0);

    recentErrors.forEach(error => {
      const hour = Math.floor((now - error.timestamp) / 3600000);
      if (hour < 24) {
        errorsByHour[23 - hour]++;
      }
    });

    // 按类型统计
    const errorsByType: Record<string, number> = {};
    const errorsByCategory: Record<string, number> = {};

    this.errorHistory.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsByCategory,
      errorsByHour,
      averageResponseTime: 0, // 需要从性能监控器获取
      lastErrorTime: this.errorHistory.length > 0 ? this.errorHistory[this.errorHistory.length - 1].timestamp : undefined
    };
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(limit: number = 100): ErrorEvent[] {
    return this.errorHistory.slice(-limit);
  }

  /**
   * 按类别获取错误
   */
  getErrorsByCategory(category: ErrorEvent['category']): ErrorEvent[] {
    return this.errorHistory.filter(error => error.category === category);
  }

  /**
   * 按严重程度获取错误
   */
  getErrorsBySeverity(severity: ErrorEvent['severity']): ErrorEvent[] {
    return this.errorHistory.filter(error => error.severity === severity);
  }

  /**
   * 生成错误报告
   */
  generateErrorReport(): {
    summary: {
      totalErrors: number;
      criticalErrors: number;
      errorRate: number;
      topErrorCategories: Array<{ category: string; count: number }>;
    };
    recentErrors: ErrorEvent[];
    metrics: ErrorMetrics;
    recommendations: string[];
  } {
    const metrics = this.getErrorMetrics();
    const criticalErrors = this.getErrorsBySeverity('critical');
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const errorsInLastHour = this.errorHistory.filter(e => e.timestamp > oneHourAgo).length;

    // 分析错误类别
    const categoryCounts: Record<string, number> = {};
    this.errorHistory.forEach(error => {
      categoryCounts[error.category] = (categoryCounts[error.category] || 0) + 1;
    });

    const topErrorCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 生成建议
    const recommendations: string[] = [];

    if (criticalErrors.length > 0) {
      recommendations.push('存在严重错误，需要立即处理');
    }

    if (errorsInLastHour > 10) {
      recommendations.push('错误率过高，建议检查系统状态');
    }

    const audioErrors = categoryCounts.audio || 0;
    if (audioErrors > 5) {
      recommendations.push('音频相关错误较多，建议检查音频设备');
    }

    const networkErrors = categoryCounts.network || 0;
    if (networkErrors > 5) {
      recommendations.push('网络相关错误较多，建议检查网络连接');
    }

    return {
      summary: {
        totalErrors: metrics.totalErrors,
        criticalErrors: criticalErrors.length,
        errorRate: errorsInLastHour,
        topErrorCategories
      },
      recentErrors: this.getErrorHistory(20),
      metrics,
      recommendations
    };
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
    console.log('🧹 错误历史已清除');
  }

  /**
   * 获取追踪状态
   */
  getStatus(): {
    isInitialized: boolean;
    errorCount: number;
    sessionId: string;
    config: Partial<ErrorTrackingConfig>;
  } {
    return {
      isInitialized: this.isInitialized,
      errorCount: this.errorHistory.length,
      sessionId: this.sessionId,
      config: {
        enableConsoleLogging: this.config.enableConsoleLogging,
        enableRemoteLogging: this.config.enableRemoteLogging,
        maxErrorsStored: this.config.maxErrorsStored
      }
    };
  }

  /**
   * 销毁错误追踪器
   */
  destroy(): void {
    // 移除事件监听器
    window.removeEventListener('error', this.handleGlobalError.bind(this) as any);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // 清理数据
    this.errorHistory = [];
    this.errorCounts.clear();
    this.isInitialized = false;

    console.log('🔄 错误追踪系统已销毁');
  }
}

// 导出单例实例
export const errorTracker = ErrorTracker.getInstance();

// 全局错误追踪API
if (typeof window !== 'undefined') {
  (window as any).errorTracker = errorTracker;
}

// 便捷的全局错误处理函数
export const logError = errorTracker.logError.bind(errorTracker);
export const logWarning = errorTracker.logWarning.bind(errorTracker);
export const logInfo = errorTracker.logInfo.bind(errorTracker);