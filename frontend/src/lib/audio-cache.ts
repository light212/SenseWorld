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
 * 将 base64 音频合并并创建播放 URL
 */
export function createAudioUrl(audioChunks: string[]): string {
  if (!audioChunks || audioChunks.length === 0) {
    throw new Error('No audio chunks provided');
  }
  
  // 合并所有 base64 chunks
  const binaryChunks: Uint8Array[] = [];
  for (const chunk of audioChunks) {
    try {
      const binary = atob(chunk);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      binaryChunks.push(bytes);
    } catch (e) {
      console.warn('Invalid base64 chunk, skipping');
    }
  }
  
  if (binaryChunks.length === 0) {
    throw new Error('No valid audio chunks');
  }
  
  // 合并成一个 Blob
  const blob = new Blob(binaryChunks, { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
