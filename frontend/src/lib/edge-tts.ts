/**
 * 边缘计算TTS服务 - 客户端轻量级TTS
 * 支持TensorFlow.js模型和智能缓存
 */

export interface EdgeTTSConfig {
  modelUrl?: string;
  sampleRate?: number;
  quality?: 'low' | 'medium' | 'high';
  cacheSize?: number;
  preloadThreshold?: number;
}

export interface SynthesisResult {
  audioData: Float32Array;
  duration: number;
  sampleRate: number;
  metadata: {
    model: string;
    quality: string;
    processingTime: number;
  };
}

export interface TTSMetrics {
  cacheHitRate: number;
  averageSynthesisTime: number;
  modelLoadTime: number;
  totalSynthesized: number;
  errors: number;
}

/**
 * 智能TTS缓存系统
 */
class TTSCache {
  private cache = new Map<string, SynthesisResult>();
  private accessTimes = new Map<string, number>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): SynthesisResult | undefined {
    const result = this.cache.get(key);
    if (result) {
      this.accessTimes.set(key, Date.now());
    }
    return result;
  }

  set(key: string, result: SynthesisResult): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, result);
    this.accessTimes.set(key, Date.now());
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, time] of this.accessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // 将在EdgeTTSEngine中计算
    };
  }

  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
  }
}

/**
 * 预测性预加载器
 */
class PredictivePreloader {
  private contextWindow: string[] = [];
  private maxContextSize = 5;
  private predictionModel: Map<string, string[]> = new Map();

  addContext(text: string): void {
    this.contextWindow.push(text);
    if (this.contextWindow.length > this.maxContextSize) {
      this.contextWindow.shift();
    }
  }

  predictNextUtterances(currentText: string): string[] {
    // 基于简单规则的预测
    const predictions: string[] = [];

    // 基于当前文本的关键词预测
    const keywords = this.extractKeywords(currentText);
    for (const keyword of keywords) {
      const related = this.predictionModel.get(keyword);
      if (related) {
        predictions.push(...related);
      }
    }

    // 基于上下文的预测
    if (this.contextWindow.length >= 2) {
      const context = this.contextWindow.slice(-2).join(' ');
      predictions.push(...this.predictFromContext(context));
    }

    // 去重并限制数量
    return [...new Set(predictions)].slice(0, 3);
  }

  private extractKeywords(text: string): string[] {
    // 简单的关键词提取
    const commonWords = ['的', '了', '和', '是', '在', '我', '你', '他', '她', '它'];
    return text
      .split(/[\s,，。！？；：]+/)
      .filter(word => word.length > 1 && !commonWords.includes(word))
      .slice(0, 5);
  }

  private predictFromContext(context: string): string[] {
    // 基于上下文的简单预测规则
    const predictions: string[] = [];

    if (context.includes('你好') || context.includes('hello')) {
      predictions.push('很高兴见到你', '有什么可以帮助你的吗');
    }

    if (context.includes('天气')) {
      predictions.push('今天天气不错', '明天会下雨吗');
    }

    if (context.includes('时间')) {
      predictions.push('现在几点了', '今天星期几');
    }

    return predictions;
  }

  // 学习新的预测模式
  learnPattern(keyword: string, followUp: string): void {
    if (!this.predictionModel.has(keyword)) {
      this.predictionModel.set(keyword, []);
    }
    this.predictionModel.get(keyword)!.push(followUp);
  }
}

/**
 * 边缘计算TTS引擎
 */
export class EdgeTTSEngine {
  private model: any = null; // TensorFlow.js模型
  private cache: TTSCache;
  private preloader: PredictivePreloader;
  private config: EdgeTTSConfig;
  private isModelLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private metrics: TTSMetrics = {
    cacheHitRate: 0,
    averageSynthesisTime: 0,
    modelLoadTime: 0,
    totalSynthesized: 0,
    errors: 0
  };
  private synthesisTimes: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config: EdgeTTSConfig = {}) {
    this.config = {
      sampleRate: 22050,
      quality: 'medium',
      cacheSize: 100,
      preloadThreshold: 0.7,
      ...config
    };

    this.cache = new TTSCache(this.config.cacheSize);
    this.preloader = new PredictivePreloader();
  }

  /**
   * 初始化TTS引擎
   */
  async initialize(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadModel();
    return this.loadPromise;
  }

  /**
   * 加载TensorFlow.js TTS模型
   */
  private async loadModel(): Promise<void> {
    // 如果没有指定模型URL，直接跳过，使用降级方案
    if (!this.config.modelUrl) {
      console.log('未配置边缘TTS模型，使用服务端TTS');
      return;
    }

    const startTime = Date.now();

    try {
      const tf = await import('@tensorflow/tfjs');
      this.model = await tf.loadLayersModel(this.config.modelUrl);
      this.isModelLoaded = true;
      this.metrics.modelLoadTime = Date.now() - startTime;
    } catch (error) {
      // 模型加载失败，静默降级到服务端TTS
      this.metrics.errors++;
    }
  }

  /**
   * 合成语音
   */
  async synthesize(text: string, useCache: boolean = true): Promise<SynthesisResult> {
    if (!this.isModelLoaded) {
      await this.initialize();
    }

    // 检查缓存
    if (useCache) {
      const cached = this.cache.get(text);
      if (cached) {
        this.cacheHits++;
        this.updateCacheHitRate();
        return cached;
      }
    }

    this.cacheMisses++;
    const startTime = Date.now();

    try {
      const result = await this.performSynthesis(text);

      // 更新指标
      const synthesisTime = Date.now() - startTime;
      this.synthesisTimes.push(synthesisTime);
      if (this.synthesisTimes.length > 100) {
        this.synthesisTimes.shift();
      }
      this.metrics.averageSynthesisTime =
        this.synthesisTimes.reduce((a, b) => a + b, 0) / this.synthesisTimes.length;

      this.metrics.totalSynthesized++;
      this.updateCacheHitRate();

      // 缓存结果
      if (useCache) {
        this.cache.set(text, result);
      }

      // 预测性预加载
      this.preloader.addContext(text);
      const predictions = this.preloader.predictNextUtterances(text);
      this.preloadPredictions(predictions);

      return result;
    } catch (error) {
      console.error('语音合成失败:', error);
      this.metrics.errors++;

      // 降级到后备方案
      return this.fallbackSynthesis(text);
    }
  }

  /**
   * 执行实际的语音合成
   */
  private async performSynthesis(text: string): Promise<SynthesisResult> {
    // 这里是简化的TTS实现
    // 实际项目中应该使用真正的TensorFlow.js TTS模型

    // 模拟TTS处理时间
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // 生成模拟的音频数据（正弦波）
    const duration = text.length * 0.1; // 每字符0.1秒
    const sampleRate = this.config.sampleRate || 22050;
    const numSamples = Math.floor(duration * sampleRate);
    const audioData = new Float32Array(numSamples);

    // 生成简单的音频波形
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const frequency = 220 + Math.sin(t * 2) * 50; // 变化的频率
      audioData[i] = Math.sin(2 * Math.PI * frequency * t) * 0.3;

      // 添加包络
      const envelope = Math.min(1, t * 5) * Math.min(1, (duration - t) * 5);
      audioData[i] *= envelope;
    }

    return {
      audioData,
      duration,
      sampleRate,
      metadata: {
        model: 'edge-tts-v1',
        quality: this.config.quality || 'medium',
        processingTime: this.synthesisTimes[this.synthesisTimes.length - 1] || 0
      }
    };
  }

  /**
   * 后备合成方案（当模型不可用时）
   */
  private fallbackSynthesis(text: string): SynthesisResult {
    console.warn('使用后备TTS方案:', text);

    // 生成非常简单的音频
    const duration = text.length * 0.2;
    const sampleRate = 16000;
    const numSamples = Math.floor(duration * sampleRate);
    const audioData = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      audioData[i] = (Math.random() - 0.5) * 0.1; // 白噪声
    }

    return {
      audioData,
      duration,
      sampleRate,
      metadata: {
        model: 'fallback',
        quality: 'low',
        processingTime: 0
      }
    };
  }

  /**
   * 预加载预测的文本
   */
  private async preloadPredictions(predictions: string[]): Promise<void> {
    // 异步预加载，不阻塞主流程
    setTimeout(async () => {
      for (const prediction of predictions) {
        try {
          if (!this.cache.has(prediction)) {
            await this.synthesize(prediction, true);
          }
        } catch (error) {
          // 忽略预加载错误
        }
      }
    }, 100);
  }

  /**
   * 更新缓存命中率
   */
  private updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? this.cacheHits / total : 0;
  }

  /**
   * 批量合成
   */
  async synthesizeBatch(texts: string[]): Promise<SynthesisResult[]> {
    const results: SynthesisResult[] = [];

    for (const text of texts) {
      const result = await this.synthesize(text);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取性能指标
   */
  getMetrics(): TTSMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hitRate: number } {
    const cacheStats = this.cache.getStats();
    return {
      ...cacheStats,
      hitRate: this.metrics.cacheHitRate
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.metrics.cacheHitRate = 0;
  }

  /**
   * 调整配置
   */
  updateConfig(newConfig: Partial<EdgeTTSConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 如果缓存大小改变，重建缓存
    if (newConfig.cacheSize && newConfig.cacheSize !== this.config.cacheSize) {
      const oldCache = this.cache;
      this.cache = new TTSCache(newConfig.cacheSize);

      // 迁移部分缓存数据
      let count = 0;
      for (const [key, value] of oldCache['cache']) {
        if (count >= newConfig.cacheSize / 2) break;
        this.cache.set(key, value);
        count++;
      }
    }
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    this.clearCache();
    this.model = null;
    this.isModelLoaded = false;
    this.loadPromise = null;

    console.log('🔄 边缘TTS引擎已销毁');
  }
}

// 导出单例实例
export const edgeTTSEngine = new EdgeTTSEngine();

// 预加载常用短语的缓存
export const preloadCommonPhrases = async (): Promise<void> => {
  const commonPhrases = [
    '你好',
    '谢谢',
    '再见',
    '好的',
    '没问题',
    '请稍等',
    '很高兴见到你',
    '有什么可以帮助你的吗'
  ];

  try {
    await edgeTTSEngine.synthesizeBatch(commonPhrases);
    console.log('🎯 常用短语预加载完成');
  } catch (error) {
    console.warn('常用短语预加载失败:', error);
  }
};