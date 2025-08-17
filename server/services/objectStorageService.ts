import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import type { File as MulterFile } from 'multer';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

class ObjectStorageService {
  private storage: Storage;
  private bucketName: string;
  private privateDir: string;

  constructor() {
    this.storage = new Storage();
    this.bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || '';
    this.privateDir = process.env.PRIVATE_OBJECT_DIR || '.private';
  }

  async uploadAudioFile(file: MulterFile, destinationPath: string): Promise<string> {
    if (!this.bucketName) {
      throw new Error('Object storage bucket not configured');
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const fullPath = `${this.privateDir}/audio/${destinationPath}`;
      
      // Upload the file to the bucket
      await bucket.upload(file.path, {
        destination: fullPath,
        metadata: {
          contentType: file.mimetype,
        },
      });

      // Generate a signed URL for accessing the file
      const [url] = await bucket.file(fullPath).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Clean up the temporary file
      if (fs.existsSync(file.path)) {
        await unlink(file.path);
      }

      return url;
    } catch (error) {
      console.error('Error uploading file to object storage:', error);
      // Clean up the temporary file on error
      if (fs.existsSync(file.path)) {
        await unlink(file.path);
      }
      throw error;
    }
  }

  async deleteAudioFile(filePath: string): Promise<void> {
    if (!this.bucketName) {
      throw new Error('Object storage bucket not configured');
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      await bucket.file(filePath).delete();
    } catch (error) {
      console.error('Error deleting file from object storage:', error);
      // Don't throw error if file doesn't exist
      if ((error as any).code !== 404) {
        throw error;
      }
    }
  }

  getPublicUrl(filePath: string): string {
    if (!this.bucketName) {
      throw new Error('Object storage bucket not configured');
    }

    return `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
  }
}

export const objectStorageService = new ObjectStorageService();