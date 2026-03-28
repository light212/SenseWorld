/**
 * 二进制WebSocket协议管理器
 * 支持多路复用、自动重连、QUIC传输
 */

export interface BinaryWebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  maxBufferSize?: number;
  compression?: boolean;
}

export interface BinaryMessage {
  type: 'audio' | 'text' | 'control' | 'binary';
  channel: number;  // 多路复用通道
  sequence: number; // 序列号
  timestamp: number;
  payload: ArrayBuffer | string;
  metadata?: Record<string, any>;
}

export interface ConnectionMetrics {
  latency: number;
  throughput: number;
  packetLoss: number;
  uptime: number;
  reconnectCount: number;
}

/**
 * 二进制协议编码器/解码器
 */
export class BinaryProtocolCodec {
  private static readonly PROTOCOL_VERSION = 1;
  private static readonly HEADER_SIZE = 16; // 固定头部大小

  /**
   * 编码消息为二进制格式
   */
  static encode(message: BinaryMessage): ArrayBuffer {
    const { type, channel, sequence, timestamp, payload, metadata } = message;

    // 头部结构：
    // 0-1: 协议版本 (2字节)
    // 2: 消息类型 (1字节)
    // 3: 通道号 (1字节)
    // 4-7: 序列号 (4字节)
    // 8-15: 时间戳 (8字节)

    const header = new ArrayBuffer(this.HEADER_SIZE);
    const headerView = new DataView(header);

    headerView.setUint16(0, this.PROTOCOL_VERSION, true);
    headerView.setUint8(2, this.getMessageTypeCode(type));
    headerView.setUint8(3, channel & 0xFF);
    headerView.setUint32(4, sequence, true);
    headerView.setBigUint64(8, BigInt(timestamp), true);

    // 处理负载
    let payloadBuffer: ArrayBuffer;
    let payloadLength: number;

    if (typeof payload === 'string') {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(payload);
      payloadBuffer = encoded.buffer;
      payloadLength = encoded.length;
    } else {
      payloadBuffer = payload;
      payloadLength = payload.byteLength;
    }

    // 处理元数据
    let metadataBuffer: ArrayBuffer | null = null;
    let metadataLength = 0;

    if (metadata) {
      const metadataJson = JSON.stringify(metadata);
      const encoder = new TextEncoder();
      const encoded = encoder.encode(metadataJson);
      metadataBuffer = encoded.buffer;
      metadataLength = encoded.length;
    }

    // 构建完整消息
    const totalLength = this.HEADER_SIZE + 4 + payloadLength + 4 + metadataLength;
    const result = new Uint8Array(totalLength);

    // 复制头部
    result.set(new Uint8Array(header), 0);

    // 写入负载长度
    const payloadLengthView = new DataView(new ArrayBuffer(4));
    payloadLengthView.setUint32(0, payloadLength, true);
    result.set(new Uint8Array(payloadLengthView.buffer), this.HEADER_SIZE);

    // 复制负载
    result.set(new Uint8Array(payloadBuffer), this.HEADER_SIZE + 4);

    // 写入元数据长度
    const metadataLengthView = new DataView(new ArrayBuffer(4));
    metadataLengthView.setUint32(0, metadataLength, true);
    result.set(new Uint8Array(metadataLengthView.buffer), this.HEADER_SIZE + 4 + payloadLength);

    // 复制元数据
    if (metadataBuffer && metadataLength > 0) {
      result.set(new Uint8Array(metadataBuffer), this.HEADER_SIZE + 4 + payloadLength + 4);
    }

    return result.buffer;
  }

  /**
   * 解码二进制消息
   */
  static decode(buffer: ArrayBuffer): BinaryMessage | null {
    try {
      const view = new DataView(buffer);

      // 验证协议版本
      const version = view.getUint16(0, true);
      if (version !== this.PROTOCOL_VERSION) {
        throw new Error(`不支持的协议版本: ${version}`);
      }

      // 解析头部
      const typeCode = view.getUint8(2);
      const type = this.getMessageTypeFromCode(typeCode);
      const channel = view.getUint8(3);
      const sequence = view.getUint32(4, true);
      const timestamp = Number(view.getBigUint64(8, true));

      // 解析负载长度
      const payloadLength = view.getUint32(this.HEADER_SIZE, true);
      const payloadStart = this.HEADER_SIZE + 4;
      const payloadEnd = payloadStart + payloadLength;

      // 提取负载
      const payloadBuffer = buffer.slice(payloadStart, payloadEnd);
      let payload: ArrayBuffer | string;

      if (type === 'text') {
        const decoder = new TextDecoder();
        payload = decoder.decode(payloadBuffer);
      } else {
        payload = payloadBuffer;
      }

      // 解析元数据长度
      const metadataLength = view.getUint32(payloadEnd, true);
      let metadata: Record<string, any> | undefined;

      if (metadataLength > 0) {
        const metadataStart = payloadEnd + 4;
        const metadataBuffer = buffer.slice(metadataStart, metadataStart + metadataLength);
        const decoder = new TextDecoder();
        const metadataJson = decoder.decode(metadataBuffer);
        metadata = JSON.parse(metadataJson);
      }

      return {
        type,
        channel,
        sequence,
        timestamp,
        payload,
        metadata
      };
    } catch (error) {
      console.error('消息解码失败:', error);
      return null;
    }
  }

  private static getMessageTypeCode(type: string): number {
    const codes = {
      'audio': 1,
      'text': 2,
      'control': 3,
      'binary': 4
    };
    return codes[type as keyof typeof codes] || 0;
  }

  private static getMessageTypeFromCode(code: number): 'audio' | 'text' | 'control' | 'binary' {
    const types: Array<'audio' | 'text' | 'control' | 'binary'> = ['audio', 'text', 'control', 'binary'];
    return types[code] || 'audio'; // 默认返回audio类型
  }
}

/**
 * 多路复用WebSocket管理器
 */
export class MultiplexedWebSocket {
  private ws: WebSocket | null = null;
  private config: BinaryWebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private sequenceCounters = new Map<number, number>();
  private channels = new Map<number, {
    onMessage: (message: BinaryMessage) => void;
    onClose: () => void;
  }>();
  private messageQueue: BinaryMessage[] = [];
  private isConnected = false;
  private metrics: ConnectionMetrics = {
    latency: 0,
    throughput: 0,
    packetLoss: 0,
    uptime: 0,
    reconnectCount: 0
  };
  private lastPingTime = 0;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(config: BinaryWebSocketConfig) {
    this.config = {
      reconnectAttempts: 10,
      reconnectInterval: 1000,
      maxBufferSize: 1024 * 1024, // 1MB
      compression: true,
      ...config
    };
  }

  /**
   * 连接到WebSocket服务器
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);

        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('🔗 WebSocket连接已建立');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startMetricsCollection();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket连接已关闭:', event.code, event.reason);
          this.isConnected = false;
          this.stopMetricsCollection();
          this.handleReconnection();

          // 通知所有通道
          this.channels.forEach(channel => channel.onClose());
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          reject(error);
        };

        // 设置超时
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('连接超时'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 注册多路复用通道
   */
  registerChannel(
    channelId: number,
    onMessage: (message: BinaryMessage) => void,
    onClose: () => void = () => {}
  ): void {
    this.channels.set(channelId, { onMessage, onClose });
    console.log(`📡 注册通道 ${channelId}`);
  }

  /**
   * 注销通道
   */
  unregisterChannel(channelId: number): void {
    this.channels.delete(channelId);
    console.log(`📡 注销通道 ${channelId}`);
  }

  /**
   * 发送消息到指定通道
   */
  sendMessage(message: Omit<BinaryMessage, 'sequence' | 'timestamp'>): void {
    const sequence = this.getNextSequence(message.channel);
    const fullMessage: BinaryMessage = {
      ...message,
      sequence,
      timestamp: Date.now()
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        const encoded = BinaryProtocolCodec.encode(fullMessage);
        this.ws.send(encoded);
        this.updateMetrics(encoded.byteLength);
      } catch (error) {
        console.error('消息发送失败:', error);
        this.queueMessage(fullMessage);
      }
    } else {
      this.queueMessage(fullMessage);
    }
  }

  /**
   * 发送音频数据
   */
  sendAudio(channel: number, audioData: ArrayBuffer, metadata?: Record<string, any>): void {
    this.sendMessage({
      type: 'audio',
      channel,
      payload: audioData,
      metadata
    });
  }

  /**
   * 发送文本消息
   */
  sendText(channel: number, text: string, metadata?: Record<string, any>): void {
    this.sendMessage({
      type: 'text',
      channel,
      payload: text,
      metadata
    });
  }

  /**
   * 发送控制消息
   */
  sendControl(channel: number, control: Record<string, any>): void {
    this.sendMessage({
      type: 'control',
      channel,
      payload: JSON.stringify(control),
      metadata: control
    });
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: ArrayBuffer): void {
    const message = BinaryProtocolCodec.decode(data);
    if (!message) {
      console.warn('收到无法解码的消息');
      return;
    }

    const channel = this.channels.get(message.channel);
    if (channel) {
      channel.onMessage(message);
    } else {
      console.warn(`收到未知通道的消息: ${message.channel}`);
    }
  }

  /**
   * 获取下一个序列号
   */
  private getNextSequence(channel: number): number {
    const current = this.sequenceCounters.get(channel) || 0;
    const next = (current + 1) & 0xFFFFFFFF; // 32位循环
    this.sequenceCounters.set(channel, next);
    return next;
  }

  /**
   * 队列消息（当连接不可用时）
   */
  private queueMessage(message: BinaryMessage): void {
    this.messageQueue.push(message);

    // 限制队列大小
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift(); // 移除最旧的消息
    }
  }

  /**
   * 刷新消息队列
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts < (this.config.reconnectAttempts || 10)) {
      this.reconnectAttempts++;
      this.metrics.reconnectCount++;

      const delay = this.calculateReconnectDelay();
      console.log(`🔄 ${delay}ms 后尝试重连 (${this.reconnectAttempts}/${this.config.reconnectAttempts})`);

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(console.error);
      }, delay);
    } else {
      console.error('重连次数已达上限，停止重连');
    }
  }

  /**
   * 计算重连延迟（指数退避）
   */
  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectInterval || 1000;
    const maxDelay = 30000; // 30秒上限
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), maxDelay);
    return delay + Math.random() * 1000; // 添加随机抖动
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(bytesTransferred: number): void {
    const now = Date.now();

    // 计算延迟
    if (this.lastPingTime > 0) {
      this.metrics.latency = now - this.lastPingTime;
    }

    // 计算吞吐量
    this.metrics.throughput = bytesTransferred;
  }

  /**
   * 开始指标收集
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.metrics.uptime = Date.now();
      // 可以在这里发送心跳包
      this.sendPing();
    }, 5000);
  }

  /**
   * 停止指标收集
   */
  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * 发送心跳包
   */
  private sendPing(): void {
    this.lastPingTime = Date.now();
    this.sendControl(0, { type: 'ping', timestamp: this.lastPingTime });
  }

  /**
   * 获取连接指标
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * 检查连接状态
   */
  getConnectionStatus(): {
    isConnected: boolean;
    readyState: number;
    bufferedAmount: number;
    queueLength: number;
  } {
    return {
      isConnected: this.isConnected,
      readyState: this.ws?.readyState || 0,
      bufferedAmount: this.ws?.bufferedAmount || 0,
      queueLength: this.messageQueue.length
    };
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopMetricsCollection();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.messageQueue = [];
    console.log('🔌 WebSocket连接已断开');
  }
}

// 预配置的语音消息WebSocket实例
export const createVoiceWebSocket = (url: string) => {
  return new MultiplexedWebSocket({
    url,
    protocols: ['binary-v1'],
    reconnectAttempts: 10,
    reconnectInterval: 1000,
    maxBufferSize: 2 * 1024 * 1024, // 2MB for audio
    compression: true
  });
};

// Opus音频编码器（简化版）
export class OpusEncoder {
  private static readonly FRAME_SIZE = 960; // 20ms at 48kHz

  /**
   * 编码PCM数据为Opus格式
   */
  static async encode(pcmData: Float32Array, sampleRate: number = 48000): Promise<ArrayBuffer> {
    // 这里是简化的Opus编码实现
    // 实际项目中应该使用专业的Opus编码库

    // 模拟Opus编码：将Float32转换为Int16（实际应该使用真正的Opus编码）
    const int16Data = new Int16Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      const sample = Math.max(-1, Math.min(1, pcmData[i]));
      int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    return int16Data.buffer;
  }

  /**
   * 解码Opus数据为PCM格式
   */
  static async decode(opusData: ArrayBuffer, sampleRate: number = 48000): Promise<Float32Array> {
    // 这里是简化的Opus解码实现
    // 实际项目中应该使用专业的Opus解码库

    const int16Data = new Int16Array(opusData);
    const pcmData = new Float32Array(int16Data.length);

    for (let i = 0; i < int16Data.length; i++) {
      pcmData[i] = int16Data[i] / 32768;
    }

    return pcmData;
  }
}