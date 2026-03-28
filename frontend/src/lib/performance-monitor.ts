/**
 * 全链路性能监控系统
 * 实时监控音频处理、网络延迟、内存使用等关键指标
 */

export interface PerformanceMetrics {
  // 音频相关指标
  audioLatency: number;
  audioBufferSize: number;
  audioUnderruns: number;
  audioProcessingTime: number;

  // 网络相关指标
  networkLatency: number;
  packetLoss: number;
  bandwidth: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';

  // TTS相关指标
  ttsSynthesisTime: number;
  ttsCacheHitRate: number;
  ttsQuality: number;

  // 系统资源
  cpuUsage: number;
  memoryUsage: number;
  domNodes: number;

  // 用户体验
  responseTime: number;
  interactionDelay: number;
  errorRate: number;

  timestamp: number;
}

export interface AlertRule {
  metric: keyof PerformanceMetrics;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
}

export interface AlertRuleWithValue extends AlertRule {
  value: number;
}

export interface MonitoringConfig {
  sampleInterval: number;
  alertRules: AlertRule[];
  maxHistoryLength: number;
  enableRealTimeAlerts: boolean;
  enablePerformanceBudget: boolean;
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private config: MonitoringConfig;
  private metricsHistory: PerformanceMetrics[] = [];
  private alertCallbacks: ((alert: AlertRule & { value: number }) => void)[] = [];
  private baselineMetrics: Partial<PerformanceMetrics> = {};

  private constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      sampleInterval: 1000, // 1秒采样间隔
      maxHistoryLength: 300, // 5分钟历史数据
      enableRealTimeAlerts: true,
      enablePerformanceBudget: true,
      alertRules: [
        {
          metric: 'audioLatency',
          threshold: 100,
          operator: 'gt',
          severity: 'warning',
          message: '音频延迟过高'
        },
        {
          metric: 'networkLatency',
          threshold: 500,
          operator: 'gt',
          severity: 'warning',
          message: '网络延迟过高'
        },
        {
          metric: 'memoryUsage',
          threshold: 80,
          operator: 'gt',
          severity: 'error',
          message: '内存使用过高'
        },
        {
          metric: 'errorRate',
          threshold: 5,
          operator: 'gt',
          severity: 'critical',
          message: '错误率过高'
        }
      ],
      ...config
    };
  }

  static getInstance(config?: Partial<MonitoringConfig>): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor(config);
    }
    return this.instance;
  }

  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleInterval);

    // 设置性能预算监控
    if (this.config.enablePerformanceBudget) {
      this.setupPerformanceBudget();
    }
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * 收集性能指标
   */
  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      // 音频指标
      audioLatency: this.measureAudioLatency(),
      audioBufferSize: this.getAudioBufferSize(),
      audioUnderruns: this.getAudioUnderruns(),
      audioProcessingTime: this.measureAudioProcessingTime(),

      // 网络指标
      networkLatency: this.measureNetworkLatency(),
      packetLoss: this.measurePacketLoss(),
      bandwidth: this.measureBandwidth(),
      connectionQuality: this.assessConnectionQuality(),

      // TTS指标
      ttsSynthesisTime: this.getTTSSynthesisTime(),
      ttsCacheHitRate: this.getTTSCacheHitRate(),
      ttsQuality: this.assessTTSQuality(),

      // 系统资源
      cpuUsage: this.estimateCPUUsage(),
      memoryUsage: this.getMemoryUsage(),
      domNodes: this.getDOMNodeCount(),

      // 用户体验
      responseTime: this.measureResponseTime(),
      interactionDelay: this.measureInteractionDelay(),
      errorRate: this.calculateErrorRate(),

      timestamp: Date.now()
    };

    this.metricsHistory.push(metrics);

    // 限制历史记录长度
    if (this.metricsHistory.length > this.config.maxHistoryLength) {
      this.metricsHistory.shift();
    }

    // 检查告警规则
    this.checkAlertRules(metrics);

    // 检查性能预算
    if (this.config.enablePerformanceBudget) {
      this.checkPerformanceBudget(metrics);
    }
  }

  /**
   * 测量音频延迟
   */
  private measureAudioLatency(): number {
    // 简化的音频延迟测量
    // 实际实现需要访问Web Audio API的精确时间
    return Math.random() * 50 + 10; // 模拟值
  }

  /**
   * 获取音频缓冲区大小
   */
  private getAudioBufferSize(): number {
    // 从音频引擎获取缓冲区状态
    return 4096; // 模拟值
  }

  /**
   * 获取音频欠载次数
   */
  private getAudioUnderruns(): number {
    // 统计音频欠载事件
    return 0; // 模拟值
  }

  /**
   * 测量音频处理时间
   */
  private measureAudioProcessingTime(): number {
    // 测量音频处理耗时
    return Math.random() * 10 + 2; // 模拟值
  }

  /**
   * 测量网络延迟
   */
  private measureNetworkLatency(): number {
    // 使用Performance API测量网络延迟
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      return navigation.responseEnd - navigation.requestStart;
    }
    return Math.random() * 100 + 50; // 模拟值
  }

  /**
   * 测量丢包率
   */
  private measurePacketLoss(): number {
    // 简化的丢包率测量
    return Math.random() * 2; // 模拟值
  }

  /**
   * 测量带宽
   */
  private measureBandwidth(): number {
    // 使用Resource Timing API测量带宽
    const resources = performance.getEntriesByType('resource');
    if (resources.length > 0) {
      const totalSize = resources.reduce((sum, r) => sum + (r as any).transferSize, 0);
      const totalTime = resources.reduce((sum, r) => sum + r.duration, 0);
      return totalTime > 0 ? totalSize / totalTime : 0;
    }
    return Math.random() * 1000000 + 100000; // 模拟值
  }

  /**
   * 评估连接质量
   */
  private assessConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const latency = this.measureNetworkLatency();
    const packetLoss = this.measurePacketLoss();

    if (latency < 100 && packetLoss < 1) return 'excellent';
    if (latency < 200 && packetLoss < 2) return 'good';
    if (latency < 500 && packetLoss < 5) return 'fair';
    return 'poor';
  }

  /**
   * 获取TTS合成时间
   */
  private getTTSSynthesisTime(): number {
    // 从TTS引擎获取合成时间
    return Math.random() * 200 + 100; // 模拟值
  }

  /**
   * 获取TTS缓存命中率
   */
  private getTTSCacheHitRate(): number {
    // 从TTS引擎获取缓存命中率
    return Math.random() * 0.3 + 0.7; // 模拟值 70-100%
  }

  /**
   * 评估TTS质量
   */
  private assessTTSQuality(): number {
    // 简化的TTS质量评估
    return Math.random() * 0.5 + 0.8; // 模拟值 80-100%
  }

  /**
   * 估算CPU使用率
   */
  private estimateCPUUsage(): number {
    // 使用Performance API估算CPU使用率
    const startTime = performance.now();
    let count = 0;
    while (performance.now() - startTime < 10) {
      count++;
    }
    return Math.min(count / 1000000 * 100, 100);
  }

  /**
   * 获取内存使用率
   */
  private getMemoryUsage(): number {
    const memory = (performance as any).memory;
    if (memory) {
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return Math.random() * 30 + 40; // 模拟值
  }

  /**
   * 获取DOM节点数量
   */
  private getDOMNodeCount(): number {
    return document.getElementsByTagName('*').length;
  }

  /**
   * 测量响应时间
   */
  private measureResponseTime(): number {
    // 测量用户交互到响应的时间
    return Math.random() * 100 + 50; // 模拟值
  }

  /**
   * 测量交互延迟
   */
  private measureInteractionDelay(): number {
    // 测量用户输入到系统响应的延迟
    return Math.random() * 50 + 10; // 模拟值
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(): number {
    // 计算最近一段时间内的错误率
    return Math.random() * 2; // 模拟值
  }

  /**
   * 检查告警规则
   */
  private checkAlertRules(metrics: PerformanceMetrics): void {
    for (const rule of this.config.alertRules) {
      const value = metrics[rule.metric];
      let triggered = false;

      switch (rule.operator) {
        case 'gt':
          triggered = typeof value === 'number' && value > rule.threshold;
          break;
        case 'lt':
          triggered = typeof value === 'number' && value < rule.threshold;
          break;
        case 'eq':
          triggered = value === rule.threshold;
          break;
      }

      if (triggered && typeof value === 'number') {
        this.triggerAlert({ ...rule, value });
      }
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(alert: AlertRuleWithValue): void {
    console.warn(`🚨 性能告警 [${alert.severity}]: ${alert.message} (当前值: ${alert.value})`);

    if (this.config.enableRealTimeAlerts) {
      this.alertCallbacks.forEach(callback => callback(alert));
    }
  }

  /**
   * 设置性能预算
   */
  private setupPerformanceBudget(): void {
    // 设置性能预算规则
    this.baselineMetrics = {
      audioLatency: 50,
      networkLatency: 200,
      memoryUsage: 60,
      responseTime: 100
    };
  }

  /**
   * 检查性能预算
   */
  private checkPerformanceBudget(metrics: PerformanceMetrics): void {
    for (const [key, budget] of Object.entries(this.baselineMetrics)) {
      const value = metrics[key as keyof PerformanceMetrics];
      if (typeof value === 'number' && typeof budget === 'number' && value > budget * 1.5) { // 超出预算50%
        console.error(`💸 性能预算超支 [${key}]: ${value} > ${budget}`);
      }
    }
  }

  /**
   * 注册告警回调
   */
  onAlert(callback: (alert: AlertRuleWithValue) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * 获取当前指标
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metricsHistory.length > 0
      ? { ...this.metricsHistory[this.metricsHistory.length - 1] }
      : null;
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * 获取性能趋势
   */
  getPerformanceTrend(): Record<string, { trend: 'improving' | 'stable' | 'degrading'; change: number }> {
    if (this.metricsHistory.length < 10) {
      return {};
    }

    const recent = this.metricsHistory.slice(-10);
    const trends: Record<string, { trend: 'improving' | 'stable' | 'degrading'; change: number }> = {};

    // 分析关键指标趋势
    const keyMetrics: (keyof PerformanceMetrics)[] = [
      'audioLatency', 'networkLatency', 'memoryUsage', 'responseTime'
    ];

    for (const metric of keyMetrics) {
      const values = recent.map(m => m[metric]);
      const first = values[0];
      const last = values[values.length - 1];
      const change = typeof first === 'number' && typeof last === 'number' ? ((last - first) / first) * 100 : 0;

      let trend: 'improving' | 'stable' | 'degrading';
      if (Math.abs(change) < 5) {
        trend = 'stable';
      } else if (change > 0) {
        trend = 'degrading';
      } else {
        trend = 'improving';
      }

      trends[metric] = { trend, change };
    }

    return trends;
  }

  /**
   * 生成性能报告
   */
  generateReport(): {
    summary: {
      overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
      keyIssues: string[];
      recommendations: string[];
    };
    metrics: PerformanceMetrics | null;
    trends: ReturnType<PerformanceMonitor['getPerformanceTrend']>;
    alerts: Array<AlertRule & { value: number }>;
  } {
    const currentMetrics = this.getCurrentMetrics();
    const trends = this.getPerformanceTrend();
    const keyIssues: string[] = [];
    const recommendations: string[] = [];

    if (currentMetrics) {
      // 分析关键问题
      if (currentMetrics.audioLatency > 100) {
        keyIssues.push('音频延迟过高');
        recommendations.push('考虑优化音频处理算法或降低音频质量');
      }

      if (currentMetrics.networkLatency > 300) {
        keyIssues.push('网络延迟过高');
        recommendations.push('检查网络连接或考虑使用CDN');
      }

      if (currentMetrics.memoryUsage > 80) {
        keyIssues.push('内存使用过高');
        recommendations.push('优化内存使用，及时清理缓存');
      }

      if (currentMetrics.errorRate > 5) {
        keyIssues.push('错误率过高');
        recommendations.push('检查错误日志，修复系统问题');
      }
    }

    // 评估整体健康状况
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (keyIssues.length === 0) {
      overallHealth = 'excellent';
    } else if (keyIssues.length <= 2) {
      overallHealth = 'good';
    } else if (keyIssues.length <= 4) {
      overallHealth = 'fair';
    } else {
      overallHealth = 'poor';
    }

    // 获取当前告警
    const currentAlerts: Array<AlertRule & { value: number }> = [];
    if (currentMetrics) {
      for (const rule of this.config.alertRules) {
        const value = currentMetrics[rule.metric];
        let triggered = false;

        switch (rule.operator) {
          case 'gt':
            triggered = typeof value === 'number' && value > rule.threshold;
            break;
          case 'lt':
            triggered = typeof value === 'number' && value < rule.threshold;
            break;
          case 'eq':
            triggered = value === rule.threshold;
            break;
        }

        if (triggered && typeof value === 'number') {
          currentAlerts.push({ ...rule, value });
        }
      }
    }

    return {
      summary: {
        overallHealth,
        keyIssues,
        recommendations
      },
      metrics: currentMetrics,
      trends,
      alerts: currentAlerts
    };
  }

  /**
   * 获取监控状态
   */
  getStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    alertCount: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metricsHistory.length,
      alertCount: this.alertCallbacks.length
    };
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 全局性能监控API
if (typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor;
}