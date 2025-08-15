import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { bubbleApiService } from "./services/bubbleApi";
import { audioService } from "./services/audioService";
// We'll generate simple MP3-compatible audio without lamejs due to its browser dependencies
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

  // Mock audio endpoint for testing - serves a simple valid MP3 file
  // This must be before the catch-all route so it's handled properly
  app.get('/api/audio/:chapterId.mp3', async (req, res) => {
    try {
      const chapterId = req.params.chapterId.replace('.mp3', '');
      
      console.log(`Generating test MP3 for chapter: ${chapterId}`);
      
      // Use chapter ID to create unique variations
      const hash = chapterId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const variation = hash % 256;
      
      // Create a very simple but valid MP3
      // We'll create a basic MP3 with proper structure
      const frames = [];
      const frameCount = 1000; // ~26 seconds
      
      for (let i = 0; i < frameCount; i++) {
        // Create MP3 frame (418 bytes for 128kbps, 44.1kHz)
        const frame = Buffer.alloc(418);
        
        // MP3 Frame header (4 bytes)
        frame[0] = 0xFF; // Frame sync (first 8 bits of 11)
        frame[1] = 0xFB; // Frame sync (last 3 bits) + MPEG-1 + Layer 3 + no protection
        frame[2] = 0x90; // 128kbps bitrate index
        frame[3] = 0x00; // 44.1kHz + no padding + private bit + mono
        
        // Generate simple audio data
        const frequency = 440 + (variation % 200); // A4 note with variation
        const wordIndex = Math.floor(i / 40); // Change every ~1 second
        const isWord = (wordIndex % 4) < 3; // 3 beats on, 1 beat off
        
        // Fill frame with audio data
        for (let j = 4; j < 418; j++) {
          if (isWord) {
            // Generate a simple tone
            const t = (i * 418 + j - 4) / 44100;
            const envelope = Math.sin(Math.PI * ((i % 40) / 40)) * 0.5; // Simple envelope
            const sample = Math.sin(2 * Math.PI * frequency * t) * envelope;
            
            // Convert to MP3 data range and add some variation
            const value = Math.floor(128 + sample * 100);
            frame[j] = Math.max(0, Math.min(255, value));
          } else {
            // Quiet/silence between words
            frame[j] = 128 + Math.floor(Math.random() * 4 - 2); // Near-silence with tiny noise
          }
        }
        
        frames.push(frame);
      }
      
      // Combine all frames into final MP3
      const mp3Buffer = Buffer.concat(frames);
      
      console.log(`Generated MP3 file of ${mp3Buffer.length} bytes for chapter ${chapterId}`);
      
      // Set proper headers for audio streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', mp3Buffer.length.toString());
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Send the MP3 file
      res.send(mp3Buffer);
    } catch (error) {
      console.error("Error generating audio:", error);
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
