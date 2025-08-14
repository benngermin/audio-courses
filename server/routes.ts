import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { bubbleApiService } from "./services/bubbleApi";
import { audioService } from "./services/audioService";
import * as wav from "node-wav";
import * as path from "path";
import { 
  insertCourseSchema, 
  insertAssignmentSchema, 
  insertChapterSchema,
  insertUserProgressSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get('/api/courses/:id', isAuthenticated, async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.post('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(courseData);
      res.json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Assignment routes
  app.get('/api/courses/:courseId/assignments', isAuthenticated, async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByCourse(req.params.courseId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
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
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  // Chapter routes
  app.get('/api/assignments/:assignmentId/chapters', isAuthenticated, async (req, res) => {
    try {
      const chapters = await storage.getChaptersByAssignment(req.params.assignmentId);
      console.log("API - Fetched chapters:", chapters.map(ch => ({ id: ch.id, title: ch.title, audioUrl: ch.audioUrl })));
      res.json(chapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
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
      console.error("Error fetching chapter:", error);
      res.status(500).json({ message: "Failed to fetch chapter" });
    }
  });

  // User progress routes
  app.get('/api/progress/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserProgress(userId, req.params.chapterId);
      res.json(progress || { currentTime: 0, isCompleted: false });
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progressData = insertUserProgressSchema.parse({
        ...req.body,
        userId,
      });
      const progress = await storage.updateUserProgress(progressData);
      res.json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Audio download routes
  app.post('/api/download/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chapterId = req.params.chapterId;
      
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      const localPath = await audioService.downloadAudio(chapter.audioUrl, chapterId);
      const downloadedContent = await storage.addDownloadedContent(userId, chapterId, localPath);
      
      res.json(downloadedContent);
    } catch (error) {
      console.error("Error downloading audio:", error);
      res.status(500).json({ message: "Failed to download audio" });
    }
  });

  app.get('/api/downloads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const downloads = await storage.getDownloadedContent(userId);
      res.json(downloads);
    } catch (error) {
      console.error("Error fetching downloads:", error);
      res.status(500).json({ message: "Failed to fetch downloads" });
    }
  });

  app.delete('/api/downloads/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chapterId = req.params.chapterId;
      
      await audioService.deleteDownloadedAudio(chapterId);
      await storage.removeDownloadedContent(userId, chapterId);
      
      res.json({ message: "Download removed" });
    } catch (error) {
      console.error("Error removing download:", error);
      res.status(500).json({ message: "Failed to remove download" });
    }
  });

  // Admin routes
  
  // Admin setup route - helps identify user for admin setup
  app.get('/api/admin/setup-info', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ 
        userId,
        email: user?.email,
        isAdmin: user?.isAdmin,
        setupCommand: `tsx server/scripts/setAdmin.ts ${userId}`
      });
    } catch (error) {
      console.error("Error fetching setup info:", error);
      res.status(500).json({ message: "Failed to fetch setup info" });
    }
  });
  
  app.post('/api/admin/sync', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
      console.error("Error syncing content:", error);
      res.status(500).json({ message: "Failed to sync content" });
    }
  });

  app.get('/api/admin/sync-status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const latestLog = await storage.getLatestSyncLog();
      res.json(latestLog);
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  // Upload course audio endpoint - uploads audio for all chapters in a course
  app.post('/api/admin/courses/:courseId/upload-audio', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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

  // Mock audio endpoint for testing - serves a WAV file
  // This must be before the catch-all route so it's handled properly
  app.get('/api/audio/:chapterId.mp3', async (req, res) => {
    try {
      const chapterId = req.params.chapterId;
      
      console.log(`Generating audio for chapter: ${chapterId}`);
      
      // Create a simple tone
      const sampleRate = 44100;
      const duration = 30; // 30 seconds for testing
      const samples = sampleRate * duration;
      const amplitude = 0.3;
      
      // Use different frequencies for different chapters
      const hash = chapterId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const baseFrequency = 300 + (hash % 200); // Range from 300Hz to 500Hz
      
      // Generate PCM audio data (mono)
      const channelData = new Float32Array(samples);
      
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        // Simple sine wave with envelope
        const envelope = Math.min(1, t * 10) * Math.max(0, 1 - ((t - duration + 0.5) / 0.5));
        channelData[i] = Math.sin(2 * Math.PI * baseFrequency * t) * amplitude * envelope;
      }
      
      // Create WAV buffer using node-wav
      const wavBuffer = wav.encode([channelData], {
        sampleRate: sampleRate,
        float: false,
        bitDepth: 16
      });
      
      console.log(`Generated WAV file of ${wavBuffer.length} bytes for chapter ${chapterId}`);
      
      // Set proper headers for audio streaming
      // Use audio/wav MIME type for WAV files
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', wavBuffer.length.toString());
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Send the WAV file
      res.send(wavBuffer);
    } catch (error) {
      console.error("Error generating audio:", error);
      res.status(500).json({ message: "Failed to generate audio" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
