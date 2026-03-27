/**
 * 音频缓存 - 使用 IndexedDB 存储流式 TTS 音频
 */

const DB_NAME = 'senseworld-audio-cache';
const STORE_NAME = 'audio';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'messageId' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export interface CachedAudio {
  messageId: string;
  audioChunks: string[]; // base64 chunks
  createdAt: number;
}

/**
 * 保存音频到缓存
 */
export async function saveAudio(messageId: string, audioChunks: string[]): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data: CachedAudio = {
      messageId,
      audioChunks,
      createdAt: Date.now(),
    };
    
    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 保存用户语音 Blob 到缓存
 */
export async function saveUserAudioBlob(messageId: string, blob: Blob): Promise<void> {
  // 把 Blob 转成 base64
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  
  await saveAudio(messageId, [base64]);
}

/**
 * 获取缓存的音频
 */
export async function getAudio(messageId: string): Promise<CachedAudio | null> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(messageId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * 删除过期音频（超过7天）
 */
export async function cleanupOldAudio(): Promise<void> {
  const database = await openDB();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    
    const range = IDBKeyRange.upperBound(sevenDaysAgo);
    const request = index.openCursor(range);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

/**
 * 将 base64 WAV 音频合并并创建播放 URL
 * WAV 格式：每个文件有 44 字节头部，需要只保留第一个头部，合并所有数据部分
 */
export function createAudioUrl(audioChunks: string[]): string {
  if (!audioChunks || audioChunks.length === 0) {
    throw new Error('No audio chunks provided');
  }
  
  // 解码所有 base64 chunks
  const decodedChunks: Uint8Array[] = [];
  for (const chunk of audioChunks) {
    try {
      const binary = atob(chunk);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      decodedChunks.push(bytes);
    } catch (e) {
      console.warn('Invalid base64 chunk, skipping');
    }
  }
  
  if (decodedChunks.length === 0) {
    throw new Error('No valid audio chunks');
  }
  
  // 如果只有一个 chunk，直接返回
  if (decodedChunks.length === 1) {
    const blob = new Blob([decodedChunks[0]], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }
  
  // 多个 WAV 文件需要正确合并
  // WAV 头部是 44 字节，但某些可能有额外的 chunk
  // 简单策略：第一个文件完整保留，后续文件跳过 44 字节头部
  const WAV_HEADER_SIZE = 44;
  
  // 计算总数据长度
  let totalDataLength = decodedChunks[0].length;
  for (let i = 1; i < decodedChunks.length; i++) {
    if (decodedChunks[i].length > WAV_HEADER_SIZE) {
      totalDataLength += decodedChunks[i].length - WAV_HEADER_SIZE;
    }
  }
  
  // 创建合并后的数组
  const merged = new Uint8Array(totalDataLength);
  let offset = decodedChunks[0].length;
  merged.set(decodedChunks[0], 0);
  
  for (let i = 1; i < decodedChunks.length; i++) {
    if (decodedChunks[i].length > WAV_HEADER_SIZE) {
      const dataOnly = decodedChunks[i].slice(WAV_HEADER_SIZE);
      merged.set(dataOnly, offset);
      offset += dataOnly.length;
    }
  }
  
  // 更新 WAV 头部中的文件大小字段
  // 字节 4-7: 文件总大小 - 8
  const fileSize = merged.length - 8;
  merged[4] = fileSize & 0xff;
  merged[5] = (fileSize >> 8) & 0xff;
  merged[6] = (fileSize >> 16) & 0xff;
  merged[7] = (fileSize >> 24) & 0xff;
  
  // 字节 40-43: 数据大小
  const dataSize = merged.length - WAV_HEADER_SIZE;
  merged[40] = dataSize & 0xff;
  merged[41] = (dataSize >> 8) & 0xff;
  merged[42] = (dataSize >> 16) & 0xff;
  merged[43] = (dataSize >> 24) & 0xff;
  
  const blob = new Blob([merged], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
