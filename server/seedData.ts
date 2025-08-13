import { db } from "./db";
import { courses, assignments, chapters } from "@shared/schema";

export async function seedTestData() {
  try {
    console.log("Seeding test data...");
    
    // Check if data already exists
    const existingCourses = await db.select().from(courses);
    if (existingCourses.length > 0) {
      console.log("Data already exists, skipping seed");
      return;
    }

    // Create a test course
    const [testCourse] = await db.insert(courses).values({
      code: "CPCU 500",
      name: "Becoming a Leader in Risk Management",
      description: "Learn the fundamentals of risk management in the insurance industry",
      isActive: true,
    }).returning();

    console.log("Created course:", testCourse.name);

    // Create assignments for the course
    const assignmentData = [
      {
        courseId: testCourse.id,
        title: "Assignment 1: Introduction to Risk",
        description: "Understanding basic risk concepts and terminology",
        orderIndex: 1,
      },
      {
        courseId: testCourse.id,
        title: "Assignment 2: Risk Assessment",
        description: "Methods and tools for assessing different types of risks",
        orderIndex: 2,
      },
      {
        courseId: testCourse.id,
        title: "Assignment 3: Risk Mitigation",
        description: "Strategies for reducing and managing identified risks",
        orderIndex: 3,
      },
    ];

    const insertedAssignments = await db.insert(assignments).values(assignmentData).returning();
    console.log(`Created ${insertedAssignments.length} assignments`);

    // Create chapters for each assignment
    // Using the same test audio file for all chapters for easier testing
    const testAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    const testAudioDuration = 369; // Duration in seconds (6 minutes 9 seconds)
    
    const chapterData = [];
    
    // Assignment 1 chapters
    chapterData.push(
      {
        assignmentId: insertedAssignments[0].id,
        title: "Chapter 1.1: What is Risk?",
        description: "Defining risk in the context of insurance",
        audioUrl: testAudioUrl,
        duration: testAudioDuration,
        orderIndex: 1,
      },
      {
        assignmentId: insertedAssignments[0].id,
        title: "Chapter 1.2: Types of Risk",
        description: "Exploring different categories of risk",
        audioUrl: testAudioUrl,
        duration: testAudioDuration,
        orderIndex: 2,
      },
      {
        assignmentId: insertedAssignments[0].id,
        title: "Chapter 1.3: Risk Management Framework",
        description: "Overview of the risk management process",
        audioUrl: testAudioUrl,
        duration: testAudioDuration,
        orderIndex: 3,
      }
    );

    // Assignment 2 chapters
    chapterData.push(
      {
        assignmentId: insertedAssignments[1].id,
        title: "Chapter 2.1: Risk Identification",
        description: "Techniques for identifying potential risks",
        audioUrl: testAudioUrl,
        duration: testAudioDuration,
        orderIndex: 1,
      },
      {
        assignmentId: insertedAssignments[1].id,
        title: "Chapter 2.2: Risk Analysis",
        description: "Analyzing probability and impact of risks",
        audioUrl: testAudioUrl,
        duration: testAudioDuration,
        orderIndex: 2,
      },
      {
        assignmentId: insertedAssignments[1].id,
        title: "Chapter 2.3: Risk Evaluation",
        description: "Prioritizing risks for treatment",
        audioUrl: testAudioUrl,
        duration: testAudioDuration,
        orderIndex: 3,
      }
    );

    // Assignment 3 chapters
    chapterData.push(
      {
        assignmentId: insertedAssignments[2].id,
        title: "Chapter 3.1: Risk Control Strategies",
        description: "Methods for controlling and reducing risks",
        audioUrl: testAudioUrl,
        duration: testAudioDuration,
        orderIndex: 1,
      },
      {
        assignmentId: insertedAssignments[2].id,
        title: "Chapter 3.2: Risk Financing",
        description: "Financial strategies for managing risk",
        audioUrl: testAudioUrl,
        duration: testAudioDuration,
        orderIndex: 2,
      },
      {
        assignmentId: insertedAssignments[2].id,
        title: "Chapter 3.3: Monitoring and Review",
        description: "Continuous improvement in risk management",
        audioUrl: testAudioUrl,
        duration: testAudioDuration,
        orderIndex: 3,
      }
    );

    const insertedChapters = await db.insert(chapters).values(chapterData).returning();
    console.log(`Created ${insertedChapters.length} chapters`);

    console.log("Test data seeded successfully!");
  } catch (error) {
    console.error("Error seeding test data:", error);
  }
}