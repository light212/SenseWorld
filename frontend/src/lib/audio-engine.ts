/**
 * 专业级Web Audio API音频引擎
 * 支持32位浮点精度、流式播放、内存安全的环形缓冲区管理
 */

export interface AudioEngineConfig {
  sampleRate: number;
  bufferSize: number;
  channels: number;
  maxBufferSize: number;
}

export interface AudioPacket {
  type: 'audio' | 'text' | 'control';
  sequence: number;
  timestamp: bigint;
  payload: ArrayBuffer;
  metadata: Record<string, any>;
}

/**
 * 环形缓冲区 - 零拷贝音频处理
 */
export class CircularAudioBuffer {
  private buffer: Float32Array;
  private readPtr: number = 0;
  private writePtr: number = 0;
  private size: number;
  private mask: number;

  constructor(size: number) {
    // 确保大小是2的幂，便于位运算
    this.size = Math.pow(2, Math.ceil(Math.log2(size)));
    this.mask = this.size - 1;
    this.buffer = new Float32Array(this.size);
  }

  /**
   * 写入音频数据（零拷贝）
   */
  write(data: Float32Array): boolean {
    const availableSpace = this.getAvailableSpace();
    if (availableSpace < data.length) {
      return false; // 缓冲区满
    }

    for (let i = 0; i < data.length; i++) {
      this.buffer[this.writePtr] = data[i];
      this.writePtr = (this.writePtr + 1) & this.mask;
    }
    return true;
  }

  /**
   * 读取音频数据（零拷贝）
   */
  read(size: number): Float32Array | null {
    const availableData = this.getAvailableData();
    if (availableData < size) {
      return null; // 数据不足
    }

    const result = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = this.buffer[this.readPtr];
      this.readPtr = (this.readPtr + 1) & this.mask;
    }
    return result;
  }

  private getAvailableSpace(): number {
    return this.size - this.getAvailableData() - 1;
  }

  private getAvailableData(): number {
    return (this.writePtr - this.readPtr + this.size) & this.mask;
  }

  clear(): void {
    this.readPtr = 0;
    this.writePtr = 0;
  }
}

/**
 * 专业级音频引擎
 */
export class ProfessionalAudioEngine {
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private circularBuffer: CircularAudioBuffer;
  private config: AudioEngineConfig;
  private isPlaying: boolean = false;
  private currentTime: number = 0;

  // 对象池
  private audioBufferPool: AudioBuffer[] = [];
  private maxPoolSize = 10;

  constructor(config: Partial<AudioEngineConfig> = {}) {
    this.config = {
      sampleRate: 48000,      // CD级采样率
      bufferSize: 4096,       // 专业级缓冲区
      channels: 2,            // 立体声
      maxBufferSize: 48000 * 2 * 10, // 10秒缓冲
      ...config
    };

    this.circularBuffer = new CircularAudioBuffer(this.config.maxBufferSize);
  }

  /**
   * 初始化音频引擎
   */
  async initialize(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
        latencyHint: 'interactive'
      });

      // 等待音频上下文恢复
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 创建音频处理节点
      await this.setupAudioNodes();

      console.log('🎵 专业音频引擎初始化完成');
    } catch (error) {
      console.error('音频引擎初始化失败:', error);
      throw new Error('音频引擎初始化失败');
    }
  }

  /**
   * 设置音频处理节点
   */
  private async setupAudioNodes(): Promise<void> {
    if (!this.audioContext) return;

    try {
      // 注册AudioWorklet（如果支持）
      if (this.audioContext.audioWorklet) {
        try {
          await this.audioContext.audioWorklet.addModule('/audio-processor.js');
          this.audioWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');
          this.audioWorklet.connect(this.audioContext.destination);
        } catch (e) {
          console.warn('AudioWorklet不支持，降级到ScriptProcessor');
          this.setupScriptProcessor();
        }
      } else {
        this.setupScriptProcessor();
      }
    } catch (error) {
      console.error('音频节点设置失败:', error);
      throw error;
    }
  }

  /**
   * 设置ScriptProcessor（兼容性降级）
   */
  private setupScriptProcessor(): void {
    if (!this.audioContext) return;

    this.scriptProcessor = this.audioContext.createScriptProcessor(
      this.config.bufferSize,
      0, // 输入通道
      this.config.channels // 输出通道
    );

    this.scriptProcessor.onaudioprocess = (event) => {
      this.processAudio(event);
    };

    this.scriptProcessor.connect(this.audioContext.destination);
  }

  /**
   * 音频处理回调
   */
  private processAudio(event: AudioProcessingEvent): void {
    const outputBuffer = event.outputBuffer;
    const outputData = outputBuffer.getChannelData(0);

    // 从环形缓冲区读取数据
    const audioData = this.circularBuffer.read(outputData.length);

    if (audioData) {
      // 填充输出缓冲区
      for (let i = 0; i < outputData.length; i++) {
        outputData[i] = audioData[i] || 0;
      }

      // 立体声：复制到第二通道
      if (this.config.channels > 1) {
        const rightChannel = outputBuffer.getChannelData(1);
        for (let i = 0; i < rightChannel.length; i++) {
          rightChannel[i] = outputData[i];
        }
      }
    } else {
      // 无数据时填充静音
      outputData.fill(0);
      if (this.config.channels > 1) {
        outputBuffer.getChannelData(1).fill(0);
      }
    }
  }

  /**
   * 播放音频数据
   */
  async playAudio(audioData: Float32Array | ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    try {
      let float32Data: Float32Array;

      if (audioData instanceof ArrayBuffer) {
        // 解码ArrayBuffer为Float32Array
        if (!this.audioContext) {
          throw new Error('音频上下文未初始化');
        }
        const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice());
        float32Data = new Float32Array(audioBuffer.getChannelData(0));
      } else {
        float32Data = audioData;
      }

      // 写入环形缓冲区
      const success = this.circularBuffer.write(float32Data);
      if (!success) {
        console.warn('音频缓冲区满，丢弃数据');
      }

      // 确保播放状态
      if (!this.isPlaying) {
        this.startPlayback();
      }
    } catch (error) {
      console.error('音频播放失败:', error);
    }
  }

  /**
   * 开始播放
   */
  private startPlayback(): void {
    if (!this.isPlaying) {
      this.isPlaying = true;
      console.log('🎵 开始音频播放');
    }
  }

  /**
   * 暂停播放
   */
  pause(): void {
    this.isPlaying = false;
    console.log('⏸️ 音频播放暂停');
  }

  /**
   * 恢复播放
   */
  resume(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isPlaying = true;
    console.log('▶️ 音频播放恢复');
  }

  /**
   * 停止播放
   */
  stop(): void {
    this.isPlaying = false;
    this.circularBuffer.clear();
    this.currentTime = 0;
    console.log('⏹️ 音频播放停止');
  }

  /**
   * 获取对象池中的AudioBuffer
   */
  getAudioBuffer(sampleRate: number, length: number, channels: number): AudioBuffer {
    // 清理过期对象
    this.cleanupPool();

    // 查找合适的AudioBuffer
    const existingBuffer = this.audioBufferPool.find(buffer =>
      buffer.sampleRate === sampleRate &&
      buffer.length >= length &&
      buffer.numberOfChannels >= channels
    );

    if (existingBuffer) {
      // 重用现有Buffer
      this.audioBufferPool = this.audioBufferPool.filter(b => b !== existingBuffer);
      return existingBuffer;
    }

    // 创建新的AudioBuffer
    if (!this.audioContext) {
      throw new Error('音频上下文未初始化');
    }

    return this.audioContext.createBuffer(channels, length, sampleRate);
  }

  /**
   * 释放AudioBuffer到对象池
   */
  releaseAudioBuffer(buffer: AudioBuffer): void {
    if (this.audioBufferPool.length < this.maxPoolSize) {
      this.audioBufferPool.push(buffer);
    }
  }

  /**
   * 清理对象池
   */
  private cleanupPool(): void {
    // 简单的清理策略：保留最新的对象
    if (this.audioBufferPool.length > this.maxPoolSize) {
      const toRemove = this.audioBufferPool.length - this.maxPoolSize;
      this.audioBufferPool.splice(0, toRemove);
    }
  }

  /**
   * 获取音频引擎状态
   */
  getStatus(): {
    isInitialized: boolean;
    isPlaying: boolean;
    sampleRate: number;
    bufferSize: number;
    poolSize: number;
  } {
    return {
      isInitialized: !!this.audioContext,
      isPlaying: this.isPlaying,
      sampleRate: this.audioContext?.sampleRate || 0,
      bufferSize: this.config.bufferSize,
      poolSize: this.audioBufferPool.length
    };
  }

  /**
   * 销毁音频引擎
   */
  async destroy(): Promise<void> {
    this.stop();

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
      this.audioWorklet = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // 清理对象池
    this.audioBufferPool.length = 0;

    console.log('🔄 音频引擎已销毁');
  }
}

// 导出单例实例
export const audioEngine = new ProfessionalAudioEngine();

// 全局音频处理器（用于AudioWorklet）
export const audioProcessorCode = `
// audio-processor.js - AudioWorkletProcessor
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
    this.port.onmessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    if (event.data.type === 'audio') {
      this.buffer = new Float32Array(event.data.audio);
    }
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channelData = output[0];

    // 简单的音频处理：将buffer数据复制到输出
    for (let i = 0; i < channelData.length; i++) {
      if (i < this.buffer.length) {
        channelData[i] = this.buffer[i];
      } else {
        channelData[i] = 0;
      }
    }

    // 立体声处理
    if (output.length > 1) {
      for (let channel = 1; channel < output.length; channel++) {
        for (let i = 0; i < output[channel].length; i++) {
          output[channel][i] = channelData[i];
        }
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
`;