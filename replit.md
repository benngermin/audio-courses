# Audio Learning Platform

## Overview

This is a mobile-first audio learning platform built for The Institutes educational content consumption. Users access the platform directly from Moodle LMS via SSO authentication, immediately landing on their course assignments page. The application allows users to consume course materials through audio playback, with features like offline downloads, progress tracking, and automatic authentication. The system is designed to support learning on-the-go scenarios such as commuting or exercising.

## Recent Changes (January 18, 2025)

### Manual Content Upload Feature
- Added comprehensive manual content management system in the admin panel
- Administrators can now manually create and manage courses, assignments, and chapters
- Implemented direct audio file upload for chapters using object storage
- Created ManualContentUpload component with three tabs:
  - **Courses Tab**: Create, edit, and delete courses
  - **Assignments Tab**: Create assignments and link them to courses
  - **Chapters Tab**: Upload audio files and create chapters for assignments
- Integrated Google Cloud Storage for audio file storage
- Added multer middleware for handling file uploads
- Created objectStorageService for managing cloud storage operations

### Technical Implementation
- **Backend Routes**: Added CRUD endpoints for courses, assignments, and chapters at `/api/admin/*`
- **File Upload**: Implemented `/api/admin/upload-audio` endpoint with multer for audio file processing
- **Object Storage**: Set up default bucket for storing audio files in the cloud
- **Frontend Components**: Created ManualContentUpload component with full form validation using react-hook-form and zod
- **Database Operations**: Extended storage interface with full CRUD support for all content types

