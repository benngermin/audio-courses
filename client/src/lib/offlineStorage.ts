interface OfflineAudioData {
  id: string;
  chapterId: string;
  title: string;
  blob: Blob;
  downloadedAt: string;
  lastAccessedAt: string;
}

interface ProgressData {
  chapterId: string;
  currentTime: number;
  duration: number;
  isCompleted: boolean;
  lastUpdated: string;
}

class OfflineStorage {
  private dbName = 'audio-learning-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create audio files store
        if (!db.objectStoreNames.contains('audioFiles')) {
          const audioStore = db.createObjectStore('audioFiles', { keyPath: 'id' });
          audioStore.createIndex('chapterId', 'chapterId', { unique: true });
        }

        // Create progress store
        if (!db.objectStoreNames.contains('progress')) {
          const progressStore = db.createObjectStore('progress', { keyPath: 'chapterId' });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async storeAudioFile(
    chapterId: string,
    title: string,
    audioUrl: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Download the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const blob = await response.blob();
    const audioData: OfflineAudioData = {
      id: `audio_${chapterId}`,
      chapterId,
      title,
      blob,
      downloadedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    const transaction = this.db.transaction(['audioFiles'], 'readwrite');
    const store = transaction.objectStore('audioFiles');
    
    return new Promise((resolve, reject) => {
      const request = store.put(audioData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAudioFile(chapterId: string): Promise<Blob | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['audioFiles'], 'readonly');
    const store = transaction.objectStore('audioFiles');
    const index = store.index('chapterId');

    return new Promise((resolve, reject) => {
      const request = index.get(chapterId);
      request.onsuccess = () => {
        const result = request.result as OfflineAudioData | undefined;
        if (result) {
          // Update last accessed time
          this.updateLastAccessed(chapterId);
          resolve(result.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAudioFile(chapterId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['audioFiles'], 'readwrite');
    const store = transaction.objectStore('audioFiles');
    const index = store.index('chapterId');

    return new Promise((resolve, reject) => {
      const getRequest = index.get(chapterId);
      getRequest.onsuccess = () => {
        const result = getRequest.result as OfflineAudioData | undefined;
        if (result) {
          const deleteRequest = store.delete(result.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve(); // Already deleted
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getAllDownloadedChapters(): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['audioFiles'], 'readonly');
    const store = transaction.objectStore('audioFiles');

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => {
        const keys = request.result as string[];
        const chapterIds = keys.map(key => key.replace('audio_', ''));
        resolve(chapterIds);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async isAudioDownloaded(chapterId: string): Promise<boolean> {
    const audioFile = await this.getAudioFile(chapterId);
    return audioFile !== null;
  }

  async saveProgress(progressData: Omit<ProgressData, 'lastUpdated'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fullProgressData: ProgressData = {
      ...progressData,
      lastUpdated: new Date().toISOString(),
    };

    const transaction = this.db.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');

    return new Promise((resolve, reject) => {
      const request = store.put(fullProgressData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getProgress(chapterId: string): Promise<ProgressData | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');

    return new Promise((resolve, reject) => {
      const request = store.get(chapterId);
      request.onsuccess = () => {
        resolve(request.result as ProgressData | undefined || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearProgress(chapterId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');

    return new Promise((resolve, reject) => {
      const request = store.delete(chapterId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { used: 0, quota: 0 };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stores = ['audioFiles', 'progress', 'metadata'];
    const transaction = this.db.transaction(stores, 'readwrite');

    const promises = stores.map(storeName => {
      const store = transaction.objectStore(storeName);
      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  private async updateLastAccessed(chapterId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['audioFiles'], 'readwrite');
    const store = transaction.objectStore('audioFiles');
    const index = store.index('chapterId');

    const getRequest = index.get(chapterId);
    getRequest.onsuccess = () => {
      const result = getRequest.result as OfflineAudioData | undefined;
      if (result) {
        result.lastAccessedAt = new Date().toISOString();
        store.put(result);
      }
    };
  }

  async createAudioUrl(chapterId: string): Promise<string | null> {
    const blob = await this.getAudioFile(chapterId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  }

  revokeAudioUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export const offlineStorage = new OfflineStorage();

// Initialize offline storage when the module is loaded
offlineStorage.initialize().catch(error => {
  console.warn('Failed to initialize offline storage:', error);
});

export default offlineStorage;
