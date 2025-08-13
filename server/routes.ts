import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { bubbleApiService } from "./services/bubbleApi";
import { audioService } from "./services/audioService";
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
  app.post('/api/admin/sync', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.createSyncLog('in_progress', 'Starting sync from Bubble API');
      
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

  const httpServer = createServer(app);
  return httpServer;
}
