/**
 * Omni Realtime Client - WebSocket client for real-time multimodal conversation
 *
 * State machine:
 *   idle → connecting → connected → disconnecting → idle
 *                              ↓ (unexpected close)
 *                          reconnecting → connected
 */

export type OmniEventType =
  | 'connected'
  | 'omni_connected'
  | 'omni_event'
  | 'omni_closed'
  | 'omni_error'
  | 'error'
  | 'pong';

export interface OmniEvent {
  type: OmniEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface OmniClientConfig {
  wsUrl: string;
  token: string;
  onEvent?: (event: OmniEvent) => void;
  onAudio?: (audioData: ArrayBuffer) => void;
  onText?: (text: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

type ClientState = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'reconnecting';

export class OmniClient {
  private ws: WebSocket | null = null;
  private config: OmniClientConfig;
  private state: ClientState = 'idle';

  // Audio recording
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private isRecording = false;

  // Camera
  private videoStream: MediaStream | null = null;
  private videoIntervalId: ReturnType<typeof setInterval> | null = null;
  private audioSentOnce = false;
  private userIsSpeaking = false;

  // Reconnection
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(config: OmniClientConfig) {
    this.config = config;
  }

  /**
   * Connect to the Omni WebSocket server
   */
  async connect(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'reconnecting') return;
    this.state = 'connecting';

    return new Promise((resolve, reject) => {
      const url = `${this.config.wsUrl}?token=${this.config.token}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.state = 'connected';
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: OmniEvent = JSON.parse(event.data);
          this.handleEvent(data);
        } catch (e) {
          console.error('[OmniClient] Failed to parse message:', e);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[OmniClient] WebSocket error:', event);
        this.config.onError?.(new Error('WebSocket error'));
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        console.log(`[OmniClient] Disconnected (state=${this.state})`);
        const prevState = this.state;

        if (prevState === 'disconnecting') {
          // 主动挂断，彻底清理
          this.state = 'idle';
          this.reconnectAttempts = 0;
          this.config.onClose?.();
          return;
        }

        // 意外断线，尝试重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.state = 'reconnecting';
          this.reconnectAttempts++;
          const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
          console.log(`[OmniClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.reconnectTimeoutId = setTimeout(async () => {
            try {
              await this.connect();
              await this.startRecording();
            } catch (e) {
              console.error('[OmniClient] Reconnect failed:', e);
              this.state = 'idle';
              this.reconnectAttempts = 0;
              this.config.onClose?.();
            }
          }, delay);
        } else {
          this.state = 'idle';
          this.reconnectAttempts = 0;
          this.config.onClose?.();
        }
      };
    });
  }

  /**
   * Handle incoming events from server
   */
  private handleEvent(event: OmniEvent) {
    this.config.onEvent?.(event);

    switch (event.type) {
      case 'omni_event':
        this.handleOmniEvent(event.payload);
        // 根据 VAD 事件更新说话状态
        if ((event.payload as Record<string, unknown>).type === 'input_audio_buffer.speech_started') {
          this.userIsSpeaking = true;
        } else if ((event.payload as Record<string, unknown>).type === 'input_audio_buffer.speech_stopped') {
          this.userIsSpeaking = false;
        }
        break;
      case 'omni_error':
      case 'error':
        this.config.onError?.(new Error(event.payload.message as string));
        break;
    }
  }

  /**
   * Handle Omni-specific events (audio, text responses)
   * DashScope Realtime API format: {type: "response.audio.delta", delta: "<base64_pcm>"}
   */
  private handleOmniEvent(payload: Record<string, unknown>) {
    const eventType = payload.type as string | undefined;

    if (this.state !== 'connected') return; // 非连接状态不处理音频/文字

    // Realtime API: audio delta
    if (eventType === 'response.audio.delta') {
      const delta = payload.delta as string | undefined;
      if (delta) {
        const audioData = this.base64ToArrayBuffer(delta);
        this.config.onAudio?.(audioData);
      }
      return;
    }

    // Realtime API: text delta
    if (eventType === 'response.text.delta' || eventType === 'response.audio_transcript.delta') {
      const delta = payload.delta as string | undefined;
      if (delta) this.config.onText?.(delta);
      return;
    }

    // Fallback: legacy output format
    const output = payload.output as Record<string, unknown> | undefined;
    if (output) {
      if (output.text) this.config.onText?.(output.text as string);
      if (output.audio) {
        const audioData = this.base64ToArrayBuffer(output.audio as string);
        this.config.onAudio?.(audioData);
      }
    }
  }

  /**
   * Start recording audio from microphone
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      // Load audio worklet for processing
      await this.audioContext.audioWorklet.addModule(
        this.createAudioWorkletUrl()
      );

      // Create source from microphone
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create worklet node
      this.audioWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');

      // Handle audio data from worklet
      this.audioWorklet.port.onmessage = (event) => {
        if (event.data.type === 'audio') {
          this.sendAudio(event.data.audio);
        }
      };

      // Connect: mic -> worklet
      source.connect(this.audioWorklet);

      this.isRecording = true;
      console.log('[OmniClient] Recording started');
    } catch (e) {
      console.error('[OmniClient] Failed to start recording:', e);
      throw e;
    }
  }

  /**
   * Stop recording audio
   */
  stopRecording(): void {
    if (!this.isRecording) {
      // 即使 isRecording 为 false，也强制停止所有 audio tracks
      this.mediaStream?.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
      return;
    }

    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
      this.audioWorklet = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isRecording = false;
    console.log('[OmniClient] Recording stopped');
  }

  /**
   * Send audio chunk to server
   */
  private sendAudio(audioData: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Convert Float32Array to Int16Array (PCM 16-bit)
    const pcm16 = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Convert to base64
    const base64 = this.arrayBufferToBase64(pcm16.buffer);

    this.ws.send(JSON.stringify({
      type: 'audio_chunk',
      payload: { audio: base64 },
    }));
    this.audioSentOnce = true;
  }

  /**
   * Send text message
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'text',
      payload: { text },
    }));
  }

  /**
   * Send image frame (for video/camera input)
   */
  sendImage(imageData: ArrayBuffer, mimeType: string = 'image/jpeg'): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const base64 = this.arrayBufferToBase64(imageData);
    this.ws.send(JSON.stringify({
      type: 'image_frame',
      payload: { image: base64, mimeType },
    }));
  }

  /**
   * Start camera capture and send frames to server
   */
  async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    videoElement.srcObject = this.videoStream;
    this.videoIntervalId = setInterval(() => this._captureAndSendFrame(videoElement), 500); // 2fps
  }

  /**
   * Capture a frame from the video element and send it to server
   */
  private _captureAndSendFrame(videoElement: HTMLVideoElement): void {
    if (!this.audioSentOnce) return;
    if (!this.userIsSpeaking) return; // 只在用户说话时发送视频帧
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    canvas.getContext('2d')!.drawImage(videoElement, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.split(',')[1];
    this.ws.send(JSON.stringify({ type: 'image_frame', payload: { image: base64 } }));
  }

  /**
   * Stop camera capture and release resources
   */
  stopCamera(): void {
    if (this.videoIntervalId) {
      clearInterval(this.videoIntervalId);
      this.videoIntervalId = null;
    }
    this.videoStream?.getTracks().forEach(t => t.stop());
    this.videoStream = null;
    this.audioSentOnce = false;
    this.userIsSpeaking = false;
  }

  /**
   * Disconnect from server (intentional, no reconnect)
   */
  disconnect(): void {
    if (this.state === 'idle' || this.state === 'disconnecting') return;

    console.log('[OmniClient] Disconnecting intentionally');
    this.state = 'disconnecting';

    // Cancel any pending reconnect
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.stopCamera();
    this.stopRecording();

    if (this.ws) {
      // state 保持 'disconnecting'，等 onclose 触发后再改为 'idle'
      this.ws.close();
      // 不设 ws = null，让 onclose 正常触发并检查到 state === 'disconnecting'
    } else {
      this.state = 'idle';
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.state === 'connected';
  }

  // ============ Utility methods ============

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private createAudioWorkletUrl(): string {
    const code = `
      class AudioProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buffer = [];
          this.bufferSize = 4096; // ~256ms at 16kHz
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (input && input[0]) {
            // Accumulate samples
            this.buffer.push(...input[0]);

            // Send when buffer is full
            if (this.buffer.length >= this.bufferSize) {
              this.port.postMessage({
                type: 'audio',
                audio: new Float32Array(this.buffer.splice(0, this.bufferSize)),
              });
            }
          }
          return true;
        }
      }

      registerProcessor('audio-processor', AudioProcessor);
    `;

    const blob = new Blob([code], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }
}

/**
 * Play audio data through speakers
 */
export async function playAudio(
  audioData: ArrayBuffer,
  sampleRate: number = 16000
): Promise<void> {
  const audioContext = new AudioContext({ sampleRate });

  try {
    // Decode or create buffer from PCM
    const audioBuffer = audioContext.createBuffer(1, audioData.byteLength / 2, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    const int16Array = new Int16Array(audioData);

    for (let i = 0; i < int16Array.length; i++) {
      channelData[i] = int16Array[i] / 32768;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();

    await new Promise<void>((resolve) => {
      source.onended = () => resolve();
    });
  } finally {
    await audioContext.close();
  }
}
