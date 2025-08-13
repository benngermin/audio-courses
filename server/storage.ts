import {
  users,
  courses,
  assignments,
  chapters,
  userProgress,
  downloadedContent,
  syncLogs,
  type User,
  type UpsertUser,
  type Course,
  type Assignment,
  type Chapter,
  type UserProgress,
  type DownloadedContent,
  type SyncLog,
  type InsertCourse,
  type InsertAssignment,
  type InsertChapter,
  type InsertUserProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Course operations
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  
  // Assignment operations
  getAssignmentsByCourse(courseId: string): Promise<Assignment[]>;
  getAssignment(id: string): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment>;
  deleteAssignment(id: string): Promise<void>;
  
  // Chapter operations
  getChaptersByAssignment(assignmentId: string): Promise<Chapter[]>;
  getChapter(id: string): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: string, chapter: Partial<InsertChapter>): Promise<Chapter>;
  deleteChapter(id: string): Promise<void>;
  
  // User progress operations
  getUserProgress(userId: string, chapterId: string): Promise<UserProgress | undefined>;
  updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  getUserProgressByChapter(userId: string, chapterId: string): Promise<UserProgress | undefined>;
  
  // Downloaded content operations
  getDownloadedContent(userId: string): Promise<DownloadedContent[]>;
  addDownloadedContent(userId: string, chapterId: string, localPath: string): Promise<DownloadedContent>;
  removeDownloadedContent(userId: string, chapterId: string): Promise<void>;
  
  // Sync log operations
  createSyncLog(status: string, message?: string): Promise<SyncLog>;
  getLatestSyncLog(): Promise<SyncLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses).where(eq(courses.isActive, true)).orderBy(asc(courses.name));
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course> {
    const [updatedCourse] = await db
      .update(courses)
      .set({ ...course, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return updatedCourse;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.update(courses).set({ isActive: false }).where(eq(courses.id, id));
  }

  // Assignment operations
  async getAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
    return await db
      .select()
      .from(assignments)
      .where(eq(assignments.courseId, courseId))
      .orderBy(asc(assignments.orderIndex));
  }

  async getAssignment(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }

  async updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment> {
    const [updatedAssignment] = await db
      .update(assignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return updatedAssignment;
  }

  async deleteAssignment(id: string): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  // Chapter operations
  async getChaptersByAssignment(assignmentId: string): Promise<Chapter[]> {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.assignmentId, assignmentId))
      .orderBy(asc(chapters.orderIndex));
  }

  async getChapter(id: string): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const [newChapter] = await db.insert(chapters).values(chapter).returning();
    return newChapter;
  }

  async updateChapter(id: string, chapter: Partial<InsertChapter>): Promise<Chapter> {
    const [updatedChapter] = await db
      .update(chapters)
      .set({ ...chapter, updatedAt: new Date() })
      .where(eq(chapters.id, id))
      .returning();
    return updatedChapter;
  }

  async deleteChapter(id: string): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  // User progress operations
  async getUserProgress(userId: string, chapterId: string): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.chapterId, chapterId)));
    return progress;
  }

  async updateUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const existing = await this.getUserProgress(progress.userId, progress.chapterId);
    
    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({ ...progress, updatedAt: new Date() })
        .where(and(eq(userProgress.userId, progress.userId), eq(userProgress.chapterId, progress.chapterId)))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userProgress).values(progress).returning();
      return created;
    }
  }

  async getUserProgressByChapter(userId: string, chapterId: string): Promise<UserProgress | undefined> {
    return this.getUserProgress(userId, chapterId);
  }

  // Downloaded content operations
  async getDownloadedContent(userId: string): Promise<DownloadedContent[]> {
    return await db
      .select()
      .from(downloadedContent)
      .where(eq(downloadedContent.userId, userId))
      .orderBy(desc(downloadedContent.downloadedAt));
  }

  async addDownloadedContent(userId: string, chapterId: string, localPath: string): Promise<DownloadedContent> {
    const [content] = await db
      .insert(downloadedContent)
      .values({ userId, chapterId, localPath })
      .returning();
    return content;
  }

  async removeDownloadedContent(userId: string, chapterId: string): Promise<void> {
    await db
      .delete(downloadedContent)
      .where(and(eq(downloadedContent.userId, userId), eq(downloadedContent.chapterId, chapterId)));
  }

  // Sync log operations
  async createSyncLog(status: string, message?: string): Promise<SyncLog> {
    const [log] = await db
      .insert(syncLogs)
      .values({ status, message })
      .returning();
    return log;
  }

  async getLatestSyncLog(): Promise<SyncLog | undefined> {
    const [log] = await db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.syncedAt))
      .limit(1);
    return log;
  }
}

export const storage = new DatabaseStorage();
