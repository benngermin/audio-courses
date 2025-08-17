# Audio Learning Platform

## Overview

This is a mobile-first audio learning platform built for The Institutes educational content consumption. Users access the platform directly from Moodle LMS via SSO authentication, immediately landing on their course assignments page. The application allows users to consume course materials through audio playback, with features like offline downloads, progress tracking, and automatic authentication. The system is designed to support learning on-the-go scenarios such as commuting or exercising.

## Recent Changes (January 18, 2025)

### UI/UX Optimizations
- **Improved Course Management Layout**: Enhanced the visual hierarchy and layout consistency across all content levels
- **Action Icons Alignment**: Action buttons (add, edit, delete) are now properly aligned to the right and only visible on hover for cleaner interface
- **Expand Arrow Positioning**: Fixed awkward placement of accordion expand arrows, now integrated properly with the trigger area
- **Content Count Display**: Assignment and chapter counts now use proper singular/plural forms and are better positioned
- **Nested Content Presentation**: Improved spacing and visual separation between courses, assignments, and chapters
- **Hover Effects**: Added smooth transitions and hover states for better user interaction feedback

### Unified Content Management System
- Created a single, unified interface for managing all educational content regardless of source (API or manual upload)
- Replaced separate content management components with UnifiedContentManager component
- Administrators can now manage courses, assignments, and chapters in one hierarchical interface
- Features include:
  - **Full CRUD Operations**: Create, read, update, and delete for all content types
  - **API Sync Integration**: Import content from The Institutes content repository
  - **Manual Upload**: Direct audio file upload to Google Cloud Storage
  - **Hierarchical View**: Nested accordion interface showing courses → assignments → chapters
  - **Inline Actions**: Edit and delete buttons for each content item with hover visibility
  - **Form Validation**: Comprehensive validation using react-hook-form and zod

### Technical Implementation
- **UnifiedContentManager Component**: Single component managing both API-sourced and manually uploaded content
- **Backend Routes**: CRUD endpoints for courses, assignments, and chapters at `/api/admin/*`
- **Storage Methods**: Added `getAllAssignments()` and `getAllChapters()` methods to DatabaseStorage
- **File Upload**: Audio upload via multer middleware to Google Cloud Storage
- **Object Storage**: Using default bucket for storing audio files with signed URLs
- **Database Operations**: Full CRUD support in storage interface for all content types

