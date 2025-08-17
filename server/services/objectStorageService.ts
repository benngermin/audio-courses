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
    // For Replit environment, use keyFilename pointing to service account credentials
    const storageOptions: any = {};
    
    // Check if we're in Replit environment with object storage setup
    if (process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
      // Use the Replit-provided authentication
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      } else {
        // Replit may provide authentication automatically
        storageOptions.projectId = 'replit-objstore';
      }
    }
    
    this.storage = new Storage(storageOptions);
    this.bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || '';
    this.privateDir = process.env.PRIVATE_OBJECT_DIR || '/replit-objstore-acf44322-a117-4f93-bd59-40ae30f5d087/.private';
  }

  async uploadAudioFile(file: MulterFile, destinationPath: string): Promise<string> {
    try {
      // For now, store files locally in a public directory
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
      
      // Ensure the uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate a unique filename
      const fileName = `${Date.now()}-${destinationPath}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // Read the file and write it to the uploads directory
      const fileData = fs.readFileSync(file.path);
      fs.writeFileSync(filePath, fileData);
      
      // Clean up the temporary file
      if (fs.existsSync(file.path)) {
        await unlink(file.path);
      }
      
      // Return a relative URL that can be served by the Express server
      const audioUrl = `/uploads/audio/${fileName}`;
      console.log('Audio file uploaded successfully to:', audioUrl);
      
      return audioUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
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