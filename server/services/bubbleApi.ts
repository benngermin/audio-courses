interface TICourse {
  _id: string;
  Created_Date: string;
  Modified_Date: string;
  name?: string;
  description?: string;
}

interface TIAssignment {
  _id: string;
  Created_Date: string;
  Modified_Date: string;
  title?: string;
  description?: string;
  course?: string;
  order?: number;
}

interface TILearningObject {
  _id: string;
  Created_Date: string;
  Modified_Date: string;
  title?: string;
  content?: string;
  audio?: string;
  loid?: string;
  'case sensitive loid'?: string;
  course?: string;
  assignment?: string;
}

interface APIResponse<T> {
  response: {
    results: T[];
    count: number;
    remaining: number;
  };
}

class BubbleApiService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BUBBLE_API_KEY || "";
    this.baseUrl = process.env.BUBBLE_API_URL || "";
    
    if (!this.apiKey) {
      console.warn("TI Content Repository API key not found. Content sync will require API key configuration.");
    }
  }

  async syncContent(): Promise<void> {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("TI Content Repository API credentials not configured");
    }

    try {
      console.log("Starting content sync from TI Content Repository...");
      
      // Fetch all data types
      const courses = await this.fetchCourses();
      const assignments = await this.fetchAssignments();
      const learningObjects = await this.fetchLearningObjects();
      
      console.log(`Fetched ${courses.length} courses, ${assignments.length} assignments, ${learningObjects.length} learning objects`);
      
      // Sync courses first
      for (const course of courses) {
        await this.syncCourse(course, assignments, learningObjects);
      }
      
      console.log("Content sync completed successfully");
    } catch (error) {
      console.error("Error syncing content from TI Content Repository:", error);
      throw error;
    }
  }

  private async fetchCourses(): Promise<TICourse[]> {
    const url = `${this.baseUrl}/course`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.statusText}`);
    }

    const data: APIResponse<TICourse> = await response.json();
    return data.response?.results || [];
  }

  private async fetchAssignments(): Promise<TIAssignment[]> {
    const url = `${this.baseUrl}/assignment`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch assignments: ${response.statusText}`);
    }

    const data: APIResponse<TIAssignment> = await response.json();
    return data.response?.results || [];
  }

  private async fetchLearningObjects(): Promise<TILearningObject[]> {
    const url = `${this.baseUrl}/learningobject`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch learning objects: ${response.statusText}`);
    }

    const data: APIResponse<TILearningObject> = await response.json();
    return data.response?.results || [];
  }

  private async syncCourse(
    tiCourse: TICourse, 
    allAssignments: TIAssignment[], 
    allLearningObjects: TILearningObject[]
  ): Promise<void> {
    const { storage } = await import("../storage");
    
    // Create or update course
    const courseData = {
      name: tiCourse.name || `Course ${tiCourse._id}`,
      description: tiCourse.description || "",
      bubbleId: tiCourse._id,
    };

    let course = await storage.getCourseByBubbleId(tiCourse._id);
    if (!course) {
      course = await storage.createCourse(courseData);
      console.log(`Created course: ${courseData.name}`);
    } else {
      course = await storage.updateCourse(course.id, courseData);
      console.log(`Updated course: ${courseData.name}`);
    }

    // Find and sync assignments for this course
    const courseAssignments = allAssignments.filter(a => a.course === tiCourse._id);
    
    for (let i = 0; i < courseAssignments.length; i++) {
      const assignment = courseAssignments[i];
      await this.syncAssignment(course.id, assignment, i, allLearningObjects);
    }
  }

  private async syncAssignment(
    courseId: string, 
    tiAssignment: TIAssignment, 
    orderIndex: number,
    allLearningObjects: TILearningObject[]
  ): Promise<void> {
    const { storage } = await import("../storage");
    
    const assignmentData = {
      courseId,
      title: tiAssignment.title || `Assignment ${tiAssignment._id}`,
      description: tiAssignment.description || "",
      orderIndex: tiAssignment.order ?? orderIndex,
      bubbleId: tiAssignment._id,
    };

    let assignment = await storage.getAssignmentByBubbleId(tiAssignment._id);
    if (!assignment) {
      assignment = await storage.createAssignment(assignmentData);
      console.log(`  Created assignment: ${assignmentData.title}`);
    } else {
      assignment = await storage.updateAssignment(assignment.id, assignmentData);
      console.log(`  Updated assignment: ${assignmentData.title}`);
    }

    // Find and sync learning objects (chapters) for this assignment
    const assignmentLearningObjects = allLearningObjects.filter(lo => lo.assignment === tiAssignment._id);
    
    for (let i = 0; i < assignmentLearningObjects.length; i++) {
      const learningObject = assignmentLearningObjects[i];
      await this.syncLearningObject(assignment.id, learningObject, i);
    }
  }

  private async syncLearningObject(
    assignmentId: string, 
    tiLearningObject: TILearningObject,
    orderIndex: number
  ): Promise<void> {
    const { storage } = await import("../storage");
    
    // Only sync if there's an audio file
    if (!tiLearningObject.audio) {
      console.log(`    Skipping learning object without audio: ${tiLearningObject.title || tiLearningObject._id}`);
      return;
    }
    
    const chapterData = {
      assignmentId,
      title: tiLearningObject.title || `Chapter ${tiLearningObject._id}`,
      audioUrl: tiLearningObject.audio,
      duration: 0, // Will need to be calculated or provided separately
      orderIndex: orderIndex,
      bubbleId: tiLearningObject._id,
    };

    let chapter = await storage.getChapterByBubbleId(tiLearningObject._id);
    if (!chapter) {
      await storage.createChapter(chapterData);
      console.log(`    Created chapter: ${chapterData.title}`);
    } else {
      await storage.updateChapter(chapter.id, chapterData);
      console.log(`    Updated chapter: ${chapterData.title}`);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey || !this.baseUrl) {
      console.log("API credentials not configured");
      return false;
    }

    try {
      const url = `${this.baseUrl}/course`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: APIResponse<TICourse> = await response.json();
        console.log(`API connection successful. Found ${data.response?.count || 0} courses.`);
        return true;
      } else {
        console.error(`API connection failed: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error("API connection error:", error);
      return false;
    }
  }
}

export const bubbleApiService = new BubbleApiService();