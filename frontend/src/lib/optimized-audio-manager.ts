/**
 * 优化的音频管理器 - 解决内存泄漏和性能问题
 */

class OptimizedAudioManager {
  private static instance: OptimizedAudioManager;
  private urlCache = new Map<string, string>();
  private audioContext: AudioContext | null = null;

  static getInstance(): OptimizedAudioManager {
    if (!this.instance) {
      this.instance = new OptimizedAudioManager();
    }
    return this.instance;
  }

  // 优化的URL创建和缓存
  createAudioURL(blob: Blob, messageId: string): string {
    // 清理旧的URL
    this.cleanupOldURLs();

    const url = URL.createObjectURL(blob);
    this.urlCache.set(messageId, url);
    return url;
  }

  // 定期清理过期URL
  private cleanupOldURLs(): void {
    // 保留最近10个URL，清理其他的
    const entries = Array.from(this.urlCache.entries());
    if (entries.length > 10) {
      const toRemove = entries.slice(0, entries.length - 10);
      toRemove.forEach(([id, url]) => {
        URL.revokeObjectURL(url);
        this.urlCache.delete(id);
      });
    }
  }

  // 使用Web Audio API进行更流畅的播放
  async playAudioStream(audioChunks: Uint8Array[]): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    for (const chunk of audioChunks) {
      const audioBuffer = await this.audioContext.decodeAudioData(chunk.buffer as ArrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
      // 等待播放完成
      await new Promise(resolve => {
        source.onended = resolve;
      });
    }
  }

  // 清理资源
  cleanup(): void {
    this.urlCache.forEach(url => URL.revokeObjectURL(url));
    this.urlCache.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioManager = OptimizedAudioManager.getInstance();