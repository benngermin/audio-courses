-- Production database fix script
-- Run this to ensure production has the correct content

-- Step 1: Clear dependent data first (respecting foreign key constraints)
DELETE FROM user_progress;
DELETE FROM downloaded_content;
DELETE FROM chapters;
DELETE FROM assignments;

-- Step 2: Update existing course or insert if not exists
INSERT INTO courses (id, code, name, description, is_active)
VALUES ('bdb05622-d97e-496b-8f6a-575fae865436', 'INS101', 'The Insurance Solution', 'Learn the fundamentals of risk management in the insurance industry', true)
ON CONFLICT (id) DO UPDATE SET 
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Step 3: Insert correct assignment (or update if exists)
INSERT INTO assignments (id, course_id, title, description, order_index)
VALUES ('4f53a908-4427-44fa-a77e-156b5fc5b427', 'bdb05622-d97e-496b-8f6a-575fae865436', '1 - The Insurance Solution', 'Introduction to insurance solutions', 1)
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Step 4: Insert correct chapters
INSERT INTO chapters (id, assignment_id, title, audio_url, duration, order_index)
VALUES 
('b90bf978-e515-423e-9245-d7a502978427', '4f53a908-4427-44fa-a77e-156b5fc5b427', '1.1 How Businesses Integrate Insurance and Risk Management', '/uploads/audio/1755474199751-temp-1755474199751-a683b016002c49ffa33aad4b21d9c1a2.mp3', 456, 1),
('8f1951cf-44ff-4afa-82d9-9506302c60b9', '4f53a908-4427-44fa-a77e-156b5fc5b427', '1.2 Noninsurance Contractual Risk Transfer', '/uploads/audio/1755473961639-temp-1755473961639-created-audio-483211.mp3', 874, 2)
ON CONFLICT (id) DO UPDATE SET
  assignment_id = EXCLUDED.assignment_id,
  title = EXCLUDED.title,
  audio_url = EXCLUDED.audio_url,
  duration = EXCLUDED.duration,
  order_index = EXCLUDED.order_index;