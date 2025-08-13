import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function setUserAsAdmin(userId: string) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.id, userId))
      .returning();
    
    if (updatedUser) {
      console.log(`User ${userId} has been set as admin`);
      console.log(`Email: ${updatedUser.email}`);
      console.log(`Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
    } else {
      console.log(`User ${userId} not found`);
    }
  } catch (error) {
    console.error("Error setting user as admin:", error);
  } finally {
    process.exit(0);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.log("Usage: tsx server/scripts/setAdmin.ts <userId>");
  console.log("You can find your user ID in the browser console after logging in");
  process.exit(1);
}

setUserAsAdmin(userId);