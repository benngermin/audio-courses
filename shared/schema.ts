import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code"),
  name: varchar("name").notNull(),
  description: text("description"),
  bubbleId: varchar("bubble_id").unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assignment table
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  bubbleId: varchar("bubble_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chapter table
export const chapters = pgTable("chapters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  audioUrl: varchar("audio_url").notNull(),
  duration: integer("duration"), // in seconds
  orderIndex: integer("order_index").notNull(),
  bubbleId: varchar("bubble_id").unique(),
  // Read-along text content
  textContent: text("text_content"), // Full chapter text
  hasReadAlong: boolean("has_read_along").default(false), // Whether read-along is available
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User progress table
export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chapterId: varchar("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  currentTime: real("current_time").default(0), // in seconds
  isCompleted: boolean("is_completed").default(false),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Downloaded content table for offline access
export const downloadedContent = pgTable("downloaded_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chapterId: varchar("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  localPath: varchar("local_path").notNull(),
  downloadedAt: timestamp("downloaded_at").defaultNow(),
});

// Text synchronization data for read-along feature
export const textSynchronization = pgTable("text_synchronization", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chapterId: varchar("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  // Text segment data
  segmentIndex: integer("segment_index").notNull(), // Order of this segment
  segmentType: varchar("segment_type").notNull(), // 'sentence', 'paragraph', 'word'
  text: text("text").notNull(), // The text content
  // Timing data (in seconds)
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  // Positioning data for highlighting
  wordIndex: integer("word_index"), // Word position within sentence
  characterStart: integer("character_start"), // Start character position
  characterEnd: integer("character_end"), // End character position
  createdAt: timestamp("created_at").defaultNow(),
});

// Sync log table
export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: varchar("status").notNull(), // 'success', 'error', 'in_progress'
  message: text("message"),
  syncedAt: timestamp("synced_at").defaultNow(),
});

// Relations
export const coursesRelations = relations(courses, ({ many }) => ({
  assignments: many(assignments),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  assignment: one(assignments, {
    fields: [chapters.assignmentId],
    references: [assignments.id],
  }),
  userProgress: many(userProgress),
  downloadedContent: many(downloadedContent),
  textSynchronization: many(textSynchronization),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [userProgress.chapterId],
    references: [chapters.id],
  }),
}));

export const downloadedContentRelations = relations(downloadedContent, ({ one }) => ({
  user: one(users, {
    fields: [downloadedContent.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [downloadedContent.chapterId],
    references: [chapters.id],
  }),
}));

export const textSynchronizationRelations = relations(textSynchronization, ({ one }) => ({
  chapter: one(chapters, {
    fields: [textSynchronization.chapterId],
    references: [chapters.id],
  }),
}));

// Insert schemas
export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChapterSchema = createInsertSchema(chapters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type DownloadedContent = typeof downloadedContent.$inferSelect;
export type SyncLog = typeof syncLogs.$inferSelect;
export type TextSynchronization = typeof textSynchronization.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;

// Read-along specific types
export interface ReadAlongSegment {
  id: string;
  segmentIndex: number;
  segmentType: 'sentence' | 'paragraph' | 'word';
  text: string;
  startTime: number;
  endTime: number;
  wordIndex?: number;
  characterStart?: number;
  characterEnd?: number;
}

export interface ReadAlongData {
  chapterId: string;
  textContent: string;
  segments: ReadAlongSegment[];
  hasReadAlong: boolean;
}

// SECURITY: Additional validation schemas for API endpoints
export const paramIdSchema = z.string().regex(/^[a-zA-Z0-9\-_]{1,50}$/, "Invalid ID format");

export const batchProgressSchema = z.array(insertUserProgressSchema).max(100, "Too many progress updates");

export const readAlongUpdateSchema = z.object({
  textContent: z.string().max(50000, "Text content too long"),
  segments: z.array(z.object({
    id: z.string().optional(),
    segmentIndex: z.number().min(0).max(10000),
    segmentType: z.enum(['sentence', 'paragraph', 'word']),
    text: z.string().max(1000, "Segment text too long"),
    startTime: z.number().min(0),
    endTime: z.number().min(0),
    wordIndex: z.number().optional(),
    characterStart: z.number().optional(),
    characterEnd: z.number().optional(),
  })).max(10000, "Too many segments")
});
