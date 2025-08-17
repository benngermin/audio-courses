# Audio Learning Platform

## Overview

This is a mobile-first audio learning platform built for The Institutes educational content consumption. Users access the platform directly from Moodle LMS via SSO authentication, immediately landing on their course assignments page. The application allows users to consume course materials through audio playback, with features like offline downloads, progress tracking, and automatic authentication. The system is designed to support learning on-the-go scenarios such as commuting or exercising.

## Recent Changes (January 18, 2025)

### Unified Content Management System
- Created a single, unified interface for managing all educational content regardless of source (API or manual upload)
- Replaced separate content management components with UnifiedContentManager component
- Administrators can now manage courses, assignments, and chapters in one hierarchical interface
- Features include:
  - **Full CRUD Operations**: Create, read, update, and delete for all content types
  - **API Sync Integration**: Import content from The Institutes content repository
  - **Manual Upload**: Direct audio file upload to Google Cloud Storage
  - **Hierarchical View**: Nested accordion interface showing courses → assignments → chapters
  - **Inline Actions**: Edit and delete buttons for each content item
  - **Form Validation**: Comprehensive validation using react-hook-form and zod

### Technical Implementation
- **UnifiedContentManager Component**: Single component managing both API-sourced and manually uploaded content
- **Backend Routes**: CRUD endpoints for courses, assignments, and chapters at `/api/admin/*`
- **Storage Methods**: Added `getAllAssignments()` and `getAllChapters()` methods to DatabaseStorage
- **File Upload**: Audio upload via multer middleware to Google Cloud Storage
- **Object Storage**: Using default bucket for storing audio files with signed URLs
- **Database Operations**: Full CRUD support in storage interface for all content types

