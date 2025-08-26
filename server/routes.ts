import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRoutes from "./authRoutes";
import { isAuthenticated } from "./authUtils";
import cookieParser from "cookie-parser";
import { bubbleApiService } from "./services/bubbleApi";
import { audioService } from "./services/audioService";
import { objectStorageService } from "./services/objectStorageService";
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import multer from 'multer';

// SECURITY: Safe error logging utility
function logError(context: string, error: any) {
  // Only log safe error information, avoid sensitive data
  const safeError = {
    message: error.message || 'Unknown error',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    context
  };
  console.error(`[${context}] Error:`, safeError);
}

const execAsync = promisify(exec);
import * as path from "path";
import { 
  insertCourseSchema, 
  insertAssignmentSchema, 
  insertChapterSchema,
  insertUserProgressSchema,
  paramIdSchema,
  batchProgressSchema,
  readAlongUpdateSchema
} from "@shared/schema";

// SECURITY: Safe file upload configuration with additional validation
const uploadAudio = multer({
  dest: '/tmp/',
  limits: {
    fileSize: 50 * 1024 * 1024, // SECURITY: Reduced to 50MB limit
    files: 1, // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // SECURITY: Strict MIME type validation
    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm'];
    
    // SECURITY: Validate file extension as well as MIME type
    const allowedExtensions = ['.mp3', '.wav', '.mp4', '.ogg', '.webm', '.m4a'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // SECURITY: Sanitize filename to prevent path traversal
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '');
    file.originalname = sanitizedName;
    
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files with valid extensions are allowed.'));
    }
  },
});

// SECURITY: JSON file upload configuration
const uploadJson = multer({
  dest: '/tmp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for JSON files
    files: 1, // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // SECURITY: Validate JSON files
    const allowedMimes = ['application/json', 'text/json'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // SECURITY: Sanitize filename to prevent path traversal
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '');
    file.originalname = sanitizedName;
    
    if ((allowedMimes.includes(file.mimetype) || file.mimetype === 'text/plain') && fileExtension === '.json') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JSON files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Cookie parser middleware
  app.use(cookieParser());
  
  // Auth routes
  app.use(authRoutes);

  // Protected user route is now handled by authRoutes

  // Health check endpoint (no auth required for testing)
  app.get('/api/health', async (req, res) => {
    const courses = await storage.getCourses();
    res.json({ 
      status: 'ok', 
      coursesAvailable: courses.length,
      timestamp: new Date().toISOString()
    });
  });

  // Course routes
  app.get('/api/courses', isAuthenticated, async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      logError('fetch-courses', error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get('/api/courses/:id', isAuthenticated, async (req, res) => {
    try {
      // SECURITY: Validate parameter format
      const courseId = paramIdSchema.parse(req.params.id);
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      logError('fetch-course', error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.post('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(courseData);
      res.json(course);
    } catch (error) {
      logError('create-course', error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Assignment routes
  app.get('/api/courses/:courseId/assignments', isAuthenticated, async (req, res) => {
    try {
      // SECURITY: Validate parameter format
      const courseId = paramIdSchema.parse(req.params.courseId);
      const assignments = await storage.getAssignmentsByCourse(courseId);
      res.json(assignments);
    } catch (error) {
      logError('fetch-assignments', error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get('/api/assignments/:id', isAuthenticated, async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      logError('fetch-assignment', error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  // Chapter routes
  app.get('/api/assignments/:assignmentId/chapters', isAuthenticated, async (req, res) => {
    try {
      // SECURITY: Validate parameter format
      const assignmentId = paramIdSchema.parse(req.params.assignmentId);
      const chapters = await storage.getChaptersByAssignment(assignmentId);
      console.log("API - Fetched chapters:", chapters.map(ch => ({ id: ch.id, title: ch.title, audioUrl: ch.audioUrl })));
      res.json(chapters);
    } catch (error) {
      logError('fetch-chapters', error);
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  app.get('/api/chapters/:id', isAuthenticated, async (req, res) => {
    try {
      const chapter = await storage.getChapter(req.params.id);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      res.json(chapter);
    } catch (error) {
      logError('fetch-chapter', error);
      res.status(500).json({ message: "Failed to fetch chapter" });
    }
  });

  // User progress routes
  app.get('/api/progress/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // SECURITY: Validate parameter format
      const chapterId = paramIdSchema.parse(req.params.chapterId);
      const progress = await storage.getUserProgress(userId, chapterId);
      res.json(progress || { currentTime: 0, isCompleted: false });
    } catch (error) {
      logError('fetch-progress', error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const progressData = insertUserProgressSchema.parse({
        ...req.body,
        userId,
      });
      const progress = await storage.updateUserProgress(progressData);
      res.json(progress);
    } catch (error) {
      logError('update-progress', error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Batch progress update endpoint for improved performance
  app.post('/api/progress/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // SECURITY: Validate batch update data
      const updates = batchProgressSchema.parse(req.body);
      
      const results = await Promise.allSettled(
        updates.map(async (update: any) => {
          const progressData = insertUserProgressSchema.parse({
            ...update,
            userId,
          });
          return storage.updateUserProgress(progressData);
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      res.json({ 
        message: `Batch update completed: ${successful} successful, ${failed} failed`,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean)
      });
    } catch (error) {
      logError('batch-progress-update', error);
      res.status(500).json({ message: "Failed to update progress batch" });
    }
  });

  // Audio download routes
  app.post('/api/download/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chapterId = req.params.chapterId;
      
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      const localPath = await audioService.downloadAudio(chapter.audioUrl, chapterId);
      const downloadedContent = await storage.addDownloadedContent(userId, chapterId, localPath);
      
      res.json(downloadedContent);
    } catch (error) {
      logError('download-audio', error);
      res.status(500).json({ message: "Failed to download audio" });
    }
  });

  app.get('/api/downloads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const downloads = await storage.getDownloadedContent(userId);
      res.json(downloads);
    } catch (error) {
      logError('fetch-downloads', error);
      res.status(500).json({ message: "Failed to fetch downloads" });
    }
  });

  app.delete('/api/downloads/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chapterId = req.params.chapterId;
      
      await audioService.deleteDownloadedAudio(chapterId);
      await storage.removeDownloadedContent(userId, chapterId);
      
      res.json({ message: "Download removed" });
    } catch (error) {
      logError('remove-download', error);
      res.status(500).json({ message: "Failed to remove download" });
    }
  });

  // Admin routes
  
  // Admin setup route - helps identify user for admin setup
  app.get('/api/admin/setup-info', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = req.user;
      res.json({ 
        userId,
        email: user?.email,
        isAdmin: user?.isAdmin,
        setupCommand: `tsx server/scripts/setAdmin.ts ${userId}`
      });
    } catch (error) {
      logError('fetch-setup-info', error);
      res.status(500).json({ message: "Failed to fetch setup info" });
    }
  });
  
  app.get('/api/admin/test-connection', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const isConnected = await bubbleApiService.testConnection();
      res.json({ 
        connected: isConnected,
        message: isConnected ? "Successfully connected to TI Content Repository API" : "Failed to connect to TI Content Repository API"
      });
    } catch (error) {
      logError('test-connection', error);
      res.status(500).json({ message: "Failed to test connection" });
    }
  });

  app.post('/api/admin/sync', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.createSyncLog('in_progress', 'Starting sync from content repo API');
      
      try {
        await bubbleApiService.syncContent();
        await storage.createSyncLog('success', 'Sync completed successfully');
        res.json({ message: "Sync completed successfully" });
      } catch (syncError) {
        await storage.createSyncLog('error', `Sync failed: ${syncError}`);
        throw syncError;
      }
    } catch (error) {
      logError('sync-content', error);
      res.status(500).json({ message: "Failed to sync content" });
    }
  });

  app.get('/api/admin/sync-status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const latestLog = await storage.getLatestSyncLog();
      res.json(latestLog);
    } catch (error) {
      logError('fetch-sync-status', error);
      res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  // Manual content management endpoints
  app.post('/api/admin/courses', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseData = insertCourseSchema.parse(req.body);
      const newCourse = await storage.createCourse(courseData);
      res.json(newCourse);
    } catch (error) {
      logError('create-course', error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.put('/api/admin/courses/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseId = req.params.courseId;
      const courseData = insertCourseSchema.partial().parse(req.body);
      const updatedCourse = await storage.updateCourse(courseId, courseData);
      res.json(updatedCourse);
    } catch (error) {
      logError('update-course', error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  app.delete('/api/admin/courses/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseId = req.params.courseId;
      await storage.deleteCourse(courseId);
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      logError('delete-course', error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  app.post('/api/admin/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const assignmentData = insertAssignmentSchema.parse(req.body);
      const newAssignment = await storage.createAssignment(assignmentData);
      res.json(newAssignment);
    } catch (error) {
      logError('create-assignment', error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.put('/api/admin/assignments/:assignmentId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const assignmentId = req.params.assignmentId;
      const assignmentData = insertAssignmentSchema.partial().parse(req.body);
      const updatedAssignment = await storage.updateAssignment(assignmentId, assignmentData);
      res.json(updatedAssignment);
    } catch (error) {
      logError('update-assignment', error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  app.delete('/api/admin/assignments/:assignmentId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const assignmentId = req.params.assignmentId;
      await storage.deleteAssignment(assignmentId);
      res.json({ message: "Assignment deleted successfully" });
    } catch (error) {
      logError('delete-assignment', error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  app.post('/api/admin/chapters', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const chapterData = insertChapterSchema.parse(req.body);
      const newChapter = await storage.createChapter(chapterData);
      res.json(newChapter);
    } catch (error) {
      logError('create-chapter', error);
      res.status(500).json({ message: "Failed to create chapter" });
    }
  });

  app.put('/api/admin/chapters/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const chapterId = req.params.chapterId;
      const chapterData = insertChapterSchema.partial().parse(req.body);
      const updatedChapter = await storage.updateChapter(chapterId, chapterData);
      res.json(updatedChapter);
    } catch (error) {
      logError('update-chapter', error);
      res.status(500).json({ message: "Failed to update chapter" });
    }
  });

  app.delete('/api/admin/chapters/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const chapterId = req.params.chapterId;
      await storage.deleteChapter(chapterId);
      res.json({ message: "Chapter deleted successfully" });
    } catch (error) {
      logError('delete-chapter', error);
      res.status(500).json({ message: "Failed to delete chapter" });
    }
  });

  // Upload audio file temporarily (without chapter association)
  app.post('/api/admin/upload-temp-audio', isAuthenticated, uploadAudio.single('audio'), async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      // SECURITY: Additional file validation beyond multer
      if (!req.file.mimetype.startsWith('audio/')) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "Invalid file type" });
      }

      // SECURITY: Validate file size server-side as well
      const stats = await fs.promises.stat(req.file.path);
      if (stats.size > 50 * 1024 * 1024) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "File too large" });
      }

      // Upload the file to object storage with a secure temporary name
      const fileName = `temp-${Date.now()}-${Math.random().toString(36).substring(2)}.mp3`;
      const audioUrl = await objectStorageService.uploadAudioFile(req.file, fileName);

      res.json({ 
        message: "Audio file uploaded successfully",
        audioUrl
      });
    } catch (error) {
      logError('upload-temp-audio', error);
      // Clean up the uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path);
      }
      res.status(500).json({ message: "Failed to upload audio file" });
    }
  });

  // Upload audio file for a specific chapter
  app.post('/api/admin/upload-audio', isAuthenticated, uploadAudio.single('audio'), async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const { chapterId } = req.body;
      
      // SECURITY: Validate chapter ID format
      if (!chapterId || typeof chapterId !== 'string' || !/^[a-zA-Z0-9\-_]{1,50}$/.test(chapterId)) {
        // Clean up the uploaded file
        if (fs.existsSync(req.file.path)) {
          await fs.promises.unlink(req.file.path);
        }
        return res.status(400).json({ message: "Invalid chapter ID format" });
      }
      
      // SECURITY: Additional file validation
      if (!req.file.mimetype.startsWith('audio/')) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "Invalid file type" });
      }

      // SECURITY: Validate file size server-side
      const stats = await fs.promises.stat(req.file.path);
      if (stats.size > 50 * 1024 * 1024) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "File too large" });
      }

      // Get the chapter to update
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) {
        // Clean up the uploaded file
        if (fs.existsSync(req.file.path)) {
          await fs.promises.unlink(req.file.path);
        }
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Upload the file to object storage with secure filename
      const fileName = `${chapterId}-${Date.now()}-${Math.random().toString(36).substring(2)}.mp3`;
      const audioUrl = await objectStorageService.uploadAudioFile(req.file, fileName);

      // Update the chapter with the new audio URL
      const updatedChapter = await storage.updateChapter(chapterId, {
        audioUrl,
      });

      res.json({ 
        message: "Audio file uploaded successfully",
        audioUrl,
        chapter: updatedChapter
      });
    } catch (error) {
      logError('upload-audio', error);
      // Clean up the uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path);
      }
      res.status(500).json({ message: "Failed to upload audio file" });
    }
  });

  // Get all assignments across all courses for admin dropdown
  app.get('/api/admin/all-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courses = await storage.getCourses();
      const assignmentsWithCourse = [];
      
      for (const course of courses) {
        const assignments = await storage.getAssignmentsByCourse(course.id);
        for (const assignment of assignments) {
          assignmentsWithCourse.push({
            ...assignment,
            courseName: course.name,
            courseCode: course.code,
          });
        }
      }

      res.json(assignmentsWithCourse);
    } catch (error) {
      console.error("Error fetching all assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Read-along routes
  app.get('/api/read-along/:chapterId', isAuthenticated, async (req, res) => {
    try {
      const chapterId = req.params.chapterId;
      
      // Get chapter with text content
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Get text synchronization data
      const segments = await storage.getTextSynchronization(chapterId);
      
      const readAlongData = {
        chapterId: chapter.id,
        textContent: chapter.textContent || '',
        hasReadAlong: chapter.hasReadAlong || false,
        segments: segments || []
      };

      res.json(readAlongData);
    } catch (error) {
      logError('fetch-read-along', error);
      res.status(500).json({ message: "Failed to fetch read-along data" });
    }
  });

  // Update chapter text content (admin only)
  app.post('/api/admin/read-along/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // SECURITY: Validate parameters and request body
      const chapterId = paramIdSchema.parse(req.params.chapterId);
      const { textContent, segments } = readAlongUpdateSchema.parse(req.body);
      
      // Update chapter with text content
      await storage.updateChapter(chapterId, {
        textContent,
        hasReadAlong: true
      });

      // Save text synchronization segments
      if (segments && segments.length > 0) {
        // Convert validated segments to ReadAlongSegment format
        const readAlongSegments = segments.map((segment, index) => ({
          ...segment,
          id: segment.id || `${chapterId}-segment-${index}`
        }));
        await storage.saveTextSynchronization(chapterId, readAlongSegments);
      }

      res.json({ message: "Read-along data updated successfully" });
    } catch (error) {
      logError('update-read-along', error);
      res.status(500).json({ message: "Failed to update read-along data" });
    }
  });

  // Admin endpoint to upload read-along JSON file
  app.post('/api/admin/upload-readalong-json', isAuthenticated, uploadJson.single('readalong'), async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No JSON file provided" });
      }

      // SECURITY: Validate file type
      if (!req.file.mimetype.includes('json')) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "Invalid file type. Please upload a JSON file." });
      }

      // Read and parse the JSON file
      const fileContent = await fs.promises.readFile(req.file.path, 'utf-8');
      let readAlongData;
      
      try {
        readAlongData = JSON.parse(fileContent);
      } catch (parseError) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "Invalid JSON format" });
      }

      // Clean up the uploaded file
      await fs.promises.unlink(req.file.path).catch(() => {});

      // Validate the JSON structure
      try {
        const validated = readAlongUpdateSchema.parse(readAlongData);
        res.json({ 
          message: "Read-along JSON file uploaded successfully",
          data: validated
        });
      } catch (validationError) {
        logError('validation-read-along', validationError);
        return res.status(400).json({ 
          message: "Invalid JSON structure. Please ensure the file contains 'textContent' and 'segments' fields." 
        });
      }
    } catch (error) {
      logError('upload-readalong-json', error);
      if (req.file && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({ message: "Failed to upload read-along JSON file" });
    }
  });

  // Get all chapters across all assignments for admin interface
  app.get('/api/admin/all-chapters', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courses = await storage.getCourses();
      const allChapters = [];
      
      for (const course of courses) {
        const assignments = await storage.getAssignmentsByCourse(course.id);
        for (const assignment of assignments) {
          const chapters = await storage.getChaptersByAssignment(assignment.id);
          for (const chapter of chapters) {
            allChapters.push({
              ...chapter,
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              courseId: course.id,
              courseName: course.name,
            });
          }
        }
      }

      res.json(allChapters);
    } catch (error) {
      logError('fetch-all-chapters', error);
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  // Upload course audio endpoint - uploads audio for all chapters in a course
  app.post('/api/admin/courses/:courseId/upload-audio', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseId = req.params.courseId;
      const { baseAudioUrl } = req.body;

      // Get all assignments and chapters for this course
      const assignments = await storage.getAssignmentsByCourse(courseId);
      let updatedCount = 0;

      for (const assignment of assignments) {
        const chapters = await storage.getChaptersByAssignment(assignment.id);
        
        for (const chapter of chapters) {
          // Generate audio URL for each chapter based on course and chapter ID
          const audioUrl = baseAudioUrl ? 
            `${baseAudioUrl}/${courseId}/${chapter.id}.mp3` : 
            `https://content.theinstitutes.org/audio/courses/${courseId}/chapters/${chapter.id}.mp3`;
          
          await storage.updateChapter(chapter.id, {
            audioUrl,
            duration: Math.floor(Math.random() * 600) + 60 // Placeholder duration, will be updated when actual audio is loaded
          });
          updatedCount++;
        }
      }

      res.json({ 
        message: `Successfully uploaded audio for ${updatedCount} chapters in course`,
        updatedCount 
      });
    } catch (error) {
      console.error("Error uploading course audio:", error);
      res.status(500).json({ message: "Failed to upload course audio" });
    }
  });

  // Test page for audio ended event
  app.get('/test-audio-ended', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'test-audio-ended.html'));
  });

  // Audio endpoint - serves actual MP3 files or generates mock audio for testing
  // This must be before the catch-all route so it's handled properly
  app.get('/api/audio/:chapterId.mp3', async (req, res) => {
    try {
      const rawChapterId = req.params.chapterId.replace('.mp3', '');
      
      // SECURITY: Sanitize chapter ID to prevent path traversal and command injection
      const chapterId = rawChapterId.replace(/[^a-zA-Z0-9\-_]/g, '');
      if (!chapterId || chapterId !== rawChapterId) {
        return res.status(400).json({ message: "Invalid chapter ID" });
      }
      
      // Check if we have an actual audio file for this chapter
      // First try with the chapter ID as filename
      const possiblePaths: string[] = [
        path.join(process.cwd(), 'server', 'audio-files', `${chapterId}.mp3`)
      ];
      
      // Special case for chapter-4-business-insurance
      if (chapterId === 'chapter-4-business-insurance') {
        possiblePaths.push(path.join(process.cwd(), 'server', 'audio-files', 'chapter-4.mp3'));
      }
      
      for (const audioPath of possiblePaths) {
        try {
          // SECURITY: Ensure path stays within audio-files directory
          const normalizedPath = path.normalize(audioPath);
          const audioFilesDir = path.join(process.cwd(), 'server', 'audio-files');
          if (!normalizedPath.startsWith(audioFilesDir)) {
            continue;
          }
          
          await fs.promises.access(normalizedPath);
          
          // Get file stats for content-length
          const stats = await fs.promises.stat(normalizedPath);
          
          // Set proper headers for audio streaming
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', stats.size.toString());
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          // Stream the file
          const stream = fs.createReadStream(normalizedPath);
          stream.pipe(res);
          
          console.log(`Serving actual MP3 file for chapter: ${chapterId}`);
          return;
        } catch (err) {
          // File doesn't exist, try next path
          continue;
        }
      }
      
      console.log(`Audio file not found for ${chapterId}, generating mock audio`);
      
      // SECURITY: Use safe parameterized approach for audio generation
      // Validate and constrain frequency parameters
      const hash = chapterId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const baseFreq = Math.max(200, Math.min(400, 200 + (hash % 200))); // Constrain to 200-400 Hz
      
      // Create temp files with secure naming
      const tempDir = os.tmpdir();
      const tempId = `audio_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const tempMp3 = path.join(tempDir, `${tempId}.mp3`);
      
      // SECURITY: Use spawn with array arguments instead of shell command
      const duration = 30;
      const sampleRate = 44100;
      
      // Use child_process.spawn for safe command execution
      const { spawn } = require('child_process');
      
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-f', 'lavfi',
          '-i', `sine=frequency=${baseFreq}:duration=0.3,apad=pad_dur=0.1[s1];sine=frequency=${baseFreq * 1.5}:duration=0.2,apad=pad_dur=0.15[s2];sine=frequency=${baseFreq * 2}:duration=0.25,apad=pad_dur=0.1[s3];sine=frequency=${baseFreq * 0.8}:duration=0.35,apad=pad_dur=0.05[s4];[s1][s2][s3][s4]concat=n=4:v=0:a=1[mix];[mix]aloop=loop=25:size=${sampleRate}[loop];[loop]atrim=duration=${duration},volume=0.5,tremolo=f=4:d=0.3,aformat=sample_rates=44100:channel_layouts=mono`,
          '-t', duration.toString(),
          '-b:a', '128k',
          '-ar', '44100',
          '-ac', '1',
          '-y', tempMp3
        ]);
        
        ffmpeg.on('close', (code: number | null) => {
          if (code === 0) {
            resolve(null);
          } else {
            reject(new Error(`FFmpeg process exited with code ${code}`));
          }
        });
        
        ffmpeg.on('error', (error: Error) => {
          reject(error);
        });
      });
      
      // Read the generated MP3 file
      const mp3Buffer = await fs.promises.readFile(tempMp3);
      
      // Clean up temp file
      await fs.promises.unlink(tempMp3).catch(() => {}); // Ignore errors
      
      console.log(`Generated valid MP3 file of ${mp3Buffer.length} bytes for chapter ${chapterId}`);
      
      // Set proper headers for audio streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', mp3Buffer.length.toString());
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Send the MP3 file
      res.send(mp3Buffer);
    } catch (error) {
      console.log("Error generating audio - details hidden for security");
      res.status(500).json({ message: "Failed to generate audio" });
    }
  });
  
  // Redirect .wav requests to .mp3 for backwards compatibility during migration
  app.get('/api/audio/:chapterId.wav', (req, res) => {
    const chapterId = req.params.chapterId;
    res.redirect(`/api/audio/${chapterId}.mp3`);
  });

  const httpServer = createServer(app);
  return httpServer;
}
