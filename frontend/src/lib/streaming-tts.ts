/**
 * 流式TTS播放系统
 * 支持字符级实时合成和播放
 */

export interface StreamingTTSConfig {
  chunkSize?: number;           // 字符块大小
  overlapSize?: number;         // 重叠字符数
  minChunkLength?: number;      // 最小块长度
  playbackDelay?: number;       // 播放延迟(ms)
  fadeInTime?: number;          // 淡入时间(ms)
  fadeOutTime?: number;         // 淡出时间(ms)
}

export interface TTSChunk {
  text: string;
  audioData: Float32Array;
  startTime: number;
  endTime: number;
  sequence: number;
}

export interface StreamingPlaybackState {
  isPlaying: boolean;
  currentChunk: number;
  totalChunks: number;
  progress: number;
  textProgress: number;
}

/**
 * 流式TTS播放器
 */
export class StreamingTTSPlayer {
  private chunks: TTSChunk[] = [];
  private currentChunkIndex = 0;
  private isPlaying = false;
  private audioContext: AudioContext | null = null;
  private config: StreamingTTSConfig;
  private playbackStartTime = 0;
  private textProgressCallback?: (progress: number) => void;
  private stateChangeCallback?: (state: StreamingPlaybackState) => void;

  constructor(config: StreamingTTSConfig = {}) {
    this.config = {
      chunkSize: 15,           // 15个字符一块
      overlapSize: 3,          // 3个字符重叠
      minChunkLength: 5,       // 最小5个字符
      playbackDelay: 100,      // 100ms延迟
      fadeInTime: 50,          // 50ms淡入
      fadeOutTime: 100,        // 100ms淡出
      ...config
    };
  }

  /**
   * 初始化音频上下文
   */
  private async initializeAudioContext(): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 22050,
        latencyHint: 'interactive'
      });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    }
  }

  /**
   * 分割文本为块
   */
  private splitTextIntoChunks(text: string): string[] {
    const { chunkSize, overlapSize, minChunkLength } = this.config;
    const chunks: string[] = [];

    let start = 0;
    while (start < text.length) {
      let end = start + (chunkSize || 15);

      // 寻找合适的断句点
      if (end < text.length) {
        const breakPoints = ['，', '。', '！', '？', '；', ',', '.', '!', '?', ';', ' '];
        let breakPoint = -1;

        for (const point of breakPoints) {
          const index = text.lastIndexOf(point, end);
          if (index > start + (minChunkLength || 5)) {
            breakPoint = index + 1;
            break;
          }
        }

        if (breakPoint > 0) {
          end = breakPoint;
        }
      }

      const chunk = text.slice(start, end);
      if (chunk.length >= (minChunkLength || 5)) {
        chunks.push(chunk);
      }

      // 下一个块的开始位置（考虑重叠）
      start = end - (overlapSize || 3);
      if (start < 0) start = 0;
    }

    return chunks;
  }

  /**
   * 播放音频块
   */
  private async playChunk(chunk: TTSChunk, startTime: number): Promise<void> {
    if (!this.audioContext) return;

    try {
      // 创建音频缓冲区
      const buffer = this.audioContext.createBuffer(
        1, // 单声道
        chunk.audioData.length,
        22050 // 采样率
      );

      // 复制音频数据
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < chunk.audioData.length; i++) {
        channelData[i] = chunk.audioData[i];
      }

      // 创建音频源
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      // 创建增益节点用于淡入淡出
      const gainNode = this.audioContext.createGain();
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // 设置淡入淡出
      const { fadeInTime, fadeOutTime } = this.config;
      const now = this.audioContext.currentTime;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + (fadeInTime || 50) / 1000);

      const chunkDuration = chunk.audioData.length / 22050;
      const fadeOutStart = now + chunkDuration - (fadeOutTime || 100) / 1000;
      gainNode.gain.linearRampToValueAtTime(0, fadeOutStart + (fadeOutTime || 100) / 1000);

      // 计算播放开始时间
      const scheduledStartTime = Math.max(now, startTime);
      source.start(scheduledStartTime);

      // 更新播放状态
      this.notifyStateChange();

      // 等待播放完成
      return new Promise((resolve) => {
        source.onended = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error('音频块播放失败:', error);
    }
  }

  /**
   * 流式播放文本
   */
  async streamText(
    text: string,
    ttsEngine: any, // EdgeTTSEngine实例
    onTextProgress?: (progress: number) => void,
    onStateChange?: (state: StreamingPlaybackState) => void
  ): Promise<void> {
    this.textProgressCallback = onTextProgress;
    this.stateChangeCallback = onStateChange;

    await this.initializeAudioContext();

    // 分割文本
    const textChunks = this.splitTextIntoChunks(text);
    this.chunks = [];
    this.currentChunkIndex = 0;
    this.isPlaying = true;
    this.playbackStartTime = Date.now();

    // 并行合成所有块
    const synthesisPromises = textChunks.map(async (chunkText, index) => {
      const result = await ttsEngine.synthesize(chunkText, true);
      return {
        text: chunkText,
        audioData: result.audioData,
        startTime: 0,
        endTime: result.duration,
        sequence: index
      };
    });

    this.chunks = await Promise.all(synthesisPromises);

    // 计算每个块的时间安排
    let currentTime = this.audioContext!.currentTime + (this.config.playbackDelay || 100) / 1000;
    for (const chunk of this.chunks) {
      chunk.startTime = currentTime;
      currentTime += chunk.endTime - (this.config.overlapSize || 3) * 0.1; // 减去重叠时间
    }

    // 开始播放
    await this.playChunksSequentially();
  }

  /**
   * 顺序播放所有块
   */
  private async playChunksSequentially(): Promise<void> {
    for (let i = 0; i < this.chunks.length && this.isPlaying; i++) {
      this.currentChunkIndex = i;

      const chunk = this.chunks[i];
      const scheduledTime = chunk.startTime;

      // 等待到预定播放时间
      const now = this.audioContext!.currentTime;
      if (scheduledTime > now) {
        await new Promise(resolve => setTimeout(resolve, (scheduledTime - now) * 1000));
      }

      // 播放当前块
      await this.playChunk(chunk, scheduledTime);

      // 更新文本进度
      const textProgress = (i + 1) / this.chunks.length;
      this.textProgressCallback?.(textProgress);

      // 更新播放状态
      this.notifyStateChange();
    }

    this.isPlaying = false;
    this.notifyStateChange();
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(): void {
    if (!this.stateChangeCallback) return;

    const state: StreamingPlaybackState = {
      isPlaying: this.isPlaying,
      currentChunk: this.currentChunkIndex,
      totalChunks: this.chunks.length,
      progress: this.chunks.length > 0 ? this.currentChunkIndex / this.chunks.length : 0,
      textProgress: this.chunks.length > 0 ? this.currentChunkIndex / this.chunks.length : 0
    };

    this.stateChangeCallback(state);
  }

  /**
   * 暂停播放
   */
  pause(): void {
    this.isPlaying = false;
    if (this.audioContext) {
      this.audioContext.suspend();
    }
    this.notifyStateChange();
  }

  /**
   * 恢复播放
   */
  resume(): void {
    this.isPlaying = true;
    if (this.audioContext) {
      this.audioContext.resume();
      // 继续播放下一个块
      this.playChunksSequentially();
    }
    this.notifyStateChange();
  }

  /**
   * 停止播放
   */
  stop(): void {
    this.isPlaying = false;
    this.currentChunkIndex = 0;

    if (this.audioContext) {
      this.audioContext.suspend();
    }

    this.notifyStateChange();
  }

  /**
   * 跳转到指定位置
   */
  seekTo(chunkIndex: number): void {
    if (chunkIndex >= 0 && chunkIndex < this.chunks.length) {
      this.currentChunkIndex = chunkIndex;
      this.notifyStateChange();
    }
  }

  /**
   * 获取播放状态
   */
  getPlaybackState(): StreamingPlaybackState {
    return {
      isPlaying: this.isPlaying,
      currentChunk: this.currentChunkIndex,
      totalChunks: this.chunks.length,
      progress: this.chunks.length > 0 ? this.currentChunkIndex / this.chunks.length : 0,
      textProgress: this.chunks.length > 0 ? this.currentChunkIndex / this.chunks.length : 0
    };
  }

  /**
   * 获取文本预览
   */
  getTextPreview(): {
    currentText: string;
    upcomingTexts: string[];
    completedTexts: string[];
  } {
    const current = this.chunks[this.currentChunkIndex]?.text || '';
    const upcoming = this.chunks.slice(this.currentChunkIndex + 1, this.currentChunkIndex + 4).map(c => c.text);
    const completed = this.chunks.slice(0, this.currentChunkIndex).map(c => c.text);

    return {
      currentText: current,
      upcomingTexts: upcoming,
      completedTexts: completed
    };
  }

  /**
   * 销毁播放器
   */
  destroy(): void {
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.chunks = [];
    this.textProgressCallback = undefined;
    this.stateChangeCallback = undefined;
  }
}

// 导出单例实例
export const streamingTTSPlayer = new StreamingTTSPlayer();

// 高级流式TTS控制器
export class AdvancedStreamingTTS {
  private player: StreamingTTSPlayer;
  private ttsEngine: any;
  private isActive = false;

  constructor(ttsEngine: any, config?: StreamingTTSConfig) {
    this.player = new StreamingTTSPlayer(config);
    this.ttsEngine = ttsEngine;
  }

  /**
   * 开始流式播放
   */
  async startStreaming(
    text: string,
    onProgress?: (progress: number) => void,
    onStateChange?: (state: StreamingPlaybackState) => void
  ): Promise<void> {
    if (this.isActive) {
      await this.stopStreaming();
    }

    this.isActive = true;
    await this.player.streamText(text, this.ttsEngine, onProgress, onStateChange);
    this.isActive = false;
  }

  /**
   * 停止流式播放
   */
  async stopStreaming(): Promise<void> {
    this.player.stop();
    this.isActive = false;
  }

  /**
   * 暂停播放
   */
  pause(): void {
    this.player.pause();
  }

  /**
   * 恢复播放
   */
  resume(): void {
    this.player.resume();
  }

  /**
   * 获取播放状态
   */
  getStatus(): {
    isActive: boolean;
    playbackState: StreamingPlaybackState;
    textPreview: ReturnType<StreamingTTSPlayer['getTextPreview']>;
  } {
    return {
      isActive: this.isActive,
      playbackState: this.player.getPlaybackState(),
      textPreview: this.player.getTextPreview()
    };
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this.player.destroy();
    this.isActive = false;
  }
}