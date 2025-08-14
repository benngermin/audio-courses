import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

class AudioService {
  private downloadDir: string;

  constructor() {
    this.downloadDir = path.join(process.cwd(), 'downloads', 'audio');
    this.ensureDownloadDir();
  }

  private async ensureDownloadDir(): Promise<void> {
    try {
      await access(this.downloadDir);
    } catch {
      await mkdir(this.downloadDir, { recursive: true });
    }
  }

  async downloadAudio(audioUrl: string, chapterId: string): Promise<string> {
    try {
      // If audioUrl is a relative path, construct the full URL
      let fullUrl = audioUrl;
      if (audioUrl.startsWith('/')) {
        // Use localhost with the Express server port for internal API calls
        const port = process.env.PORT || '5000';
        fullUrl = `http://localhost:${port}${audioUrl}`;
      }
      
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const filename = `${chapterId}.mp3`;
      const localPath = path.join(this.downloadDir, filename);

      await writeFile(localPath, Buffer.from(buffer));
      return localPath;
    } catch (error) {
      console.error(`Error downloading audio for chapter ${chapterId}:`, error);
      throw error;
    }
  }

  async deleteDownloadedAudio(chapterId: string): Promise<void> {
    try {
      const filename = `${chapterId}.mp3`;
      const localPath = path.join(this.downloadDir, filename);
      await unlink(localPath);
    } catch (error) {
      console.error(`Error deleting audio for chapter ${chapterId}:`, error);
      throw error;
    }
  }

  getLocalAudioPath(chapterId: string): string {
    const filename = `${chapterId}.mp3`;
    return path.join(this.downloadDir, filename);
  }

  async isAudioDownloaded(chapterId: string): Promise<boolean> {
    try {
      const localPath = this.getLocalAudioPath(chapterId);
      await access(localPath);
      return true;
    } catch {
      return false;
    }
  }
}

export const audioService = new AudioService();
