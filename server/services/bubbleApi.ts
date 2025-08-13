interface BubbleCourse {
  id: string;
  name: string;
  description?: string;
  assignments: BubbleAssignment[];
}

interface BubbleAssignment {
  id: string;
  title: string;
  description?: string;
  order: number;
  chapters: BubbleChapter[];
}

interface BubbleChapter {
  id: string;
  title: string;
  description?: string;
  audioUrl: string;
  duration?: number;
  order: number;
}

class BubbleApiService {
  private apiKey: string;
  private baseUrl: string;
  private contentRepoUrl: string;

  constructor() {
    this.apiKey = process.env.BUBBLE_API_KEY || process.env.VITE_BUBBLE_API_KEY || "";
    this.baseUrl = process.env.BUBBLE_API_URL || process.env.VITE_BUBBLE_API_URL || "https://api.bubble.io";
    this.contentRepoUrl = process.env.CONTENT_REPO_URL || "https://api.theinstitutes.org/content";
    
    if (!this.apiKey) {
      console.warn("Content repo API key not found. Content sync will require API key configuration.");
    }
  }

  async syncContent(): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Bubble API key not configured");
    }

    try {
      const courses = await this.fetchCourses();
      
      for (const course of courses) {
        await this.syncCourse(course);
      }
    } catch (error) {
      console.error("Error syncing content from Bubble:", error);
      throw error;
    }
  }

  private async fetchCourses(): Promise<BubbleCourse[]> {
    const response = await fetch(`${this.baseUrl}/courses`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.statusText}`);
    }

    const data = await response.json();
    return data.courses || [];
  }

  private async syncCourse(bubbleCourse: BubbleCourse): Promise<void> {
    const { storage } = await import("../storage");
    
    // Create or update course
    const courseData = {
      name: bubbleCourse.name,
      description: bubbleCourse.description,
      bubbleId: bubbleCourse.id,
    };

    let course = await storage.getCourse(bubbleCourse.id);
    if (!course) {
      course = await storage.createCourse(courseData);
    } else {
      course = await storage.updateCourse(course.id, courseData);
    }

    // Sync assignments
    for (const bubbleAssignment of bubbleCourse.assignments) {
      await this.syncAssignment(course.id, bubbleAssignment);
    }
  }

  private async syncAssignment(courseId: string, bubbleAssignment: BubbleAssignment): Promise<void> {
    const { storage } = await import("../storage");
    
    const assignmentData = {
      courseId,
      title: bubbleAssignment.title,
      description: bubbleAssignment.description,
      orderIndex: bubbleAssignment.order,
      bubbleId: bubbleAssignment.id,
    };

    let assignment = await storage.getAssignment(bubbleAssignment.id);
    if (!assignment) {
      assignment = await storage.createAssignment(assignmentData);
    } else {
      assignment = await storage.updateAssignment(assignment.id, assignmentData);
    }

    // Sync chapters
    for (const bubbleChapter of bubbleAssignment.chapters) {
      await this.syncChapter(assignment.id, bubbleChapter);
    }
  }

  private async syncChapter(assignmentId: string, bubbleChapter: BubbleChapter): Promise<void> {
    const { storage } = await import("../storage");
    
    const chapterData = {
      assignmentId,
      title: bubbleChapter.title,
      description: bubbleChapter.description,
      audioUrl: bubbleChapter.audioUrl,
      duration: bubbleChapter.duration,
      orderIndex: bubbleChapter.order,
      bubbleId: bubbleChapter.id,
    };

    let chapter = await storage.getChapter(bubbleChapter.id);
    if (!chapter) {
      await storage.createChapter(chapterData);
    } else {
      await storage.updateChapter(chapter.id, chapterData);
    }
  }
}

export const bubbleApiService = new BubbleApiService();
