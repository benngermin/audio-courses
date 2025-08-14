# Audio Learning Platform

## Overview

This is a mobile-first audio learning platform built for The Institutes educational content consumption. Users access the platform directly from Moodle LMS via SSO authentication, immediately landing on their course assignments page. The application allows users to consume course materials through audio playback, with features like offline downloads, progress tracking, and automatic authentication. The system is designed to support learning on-the-go scenarios such as commuting or exercising.

## Recent Changes (August 14, 2025)

- **Mobile Responsive Optimization**:
  - **Header Redesign**: On mobile, displays only course code (e.g., "CPCU 500") instead of full name to save space
  - **Compact Assignment Dropdown**: Reduced width and text size, shows truncated titles with max-width constraints
  - **Responsive Sizing**: All buttons, icons, and text scale appropriately for mobile devices
  - **Improved Touch Targets**: Optimized button sizes for better mobile interaction (minimum 44px touch targets)
  - **Mini Player**: Reduced padding and icon sizes for mobile while maintaining usability
  - **Chapter Cards**: Condensed layout with smaller icons and wrapped text for duration/status indicators
  - **Consistent Breakpoints**: Uses `sm:` prefix for desktop styles (640px breakpoint)

- **Expanded Player Redesign - Podcast App Layout**:
  - **Removed Circular Progress**: Replaced with album art placeholder showing music note icon
  - **New Playback Controls**: -15 and +30 second skip buttons (matching standard podcast apps)
  - **Removed Chapter Navigation**: No more previous/next chapter buttons in expanded player
  - **Bottom Controls Row**: Centered layout with Volume, Cast/AirPlay, and Speed controls
  - **Cast Button**: Added universal cast icon that works for both iOS AirPlay and Android Cast
  - **Time Display**: Shows remaining time with minus sign (e.g., "-23:45") like podcast apps
  - **Responsive Button Sizes**: 72px play button on mobile, 80px on desktop for optimal touch targets
  - **Playback Speed Indicator**: Speed badge appears on clock icon when not at 1x speed

- **Debugging and Performance Improvements**:
  - Fixed excessive console logging from audio hooks and player components
  - Resolved multiple audio element initialization issue - now reuses existing audio elements
  - Fixed download functionality by constructing full URLs for internal audio fetching
  - Reduced console noise by removing debug logs from MiniPlayer and ExpandedPlayer
  - Optimized audio state synchronization between components
  - Audio playback now smoother with less re-rendering

## Previous Changes (August 13, 2025)

- **Audio Playback Fix**:
  - Fixed audio playback issue where nothing would play due to non-existent external audio URLs
  - Created mock audio generation endpoint at `/api/audio/:chapterId.mp3` for testing
  - Updated all chapter audio URLs in database to use local endpoints instead of external domain
  - Audio now generates test WAV files with different tones for each chapter
  - Each chapter produces a unique 30-second test tone based on chapter ID
  - Audio playback now fully functional with play/pause, seek, and progress tracking

- **UI Design Update**:
  - Updated color palette with new orange primary color (#ff6b35)
  - Implemented circular progress indicator for full-screen audio playback
  - Added linear progress bar for mini player at bottom
  - Updated typography to use system font stack (-apple-system, BlinkMacSystemFont, etc.)
  - Applied new colors: Primary Orange, Orange Tint for backgrounds, updated text hierarchy
  - Replaced album art placeholder with interactive circular progress component
  - Updated all UI components to use new design tokens (background, foreground, borders)
  - Improved dark mode support with appropriate color inversions

- **Admin Dashboard Implementation**:
  - Created comprehensive admin panel accessible at `/admin`
  - Admin users can upload course audio from content repository API
  - Course browsing with expandable assignments and chapters view
  - Real-time audio upload status indicators for each chapter
  - Content sync functionality from The Institutes content repository
  - Admin access granted to user 44064638 (kahn@theinstitutes.org)
- **Enhanced Content Management**:
  - Added BubbleApiService for content repository integration
  - Implemented admin API routes for content syncing and audio uploads
  - Created setAdmin.ts script for granting admin privileges
  - Added sync status monitoring with timestamp tracking
- **Admin Navigation**:
  - Added admin-only navigation button in app header
  - Admin users see "Admin" button to access dashboard
  - From admin dashboard, button changes to "Back to App"
  - Seamless navigation between admin panel and main app
- **Simplified Navigation Architecture**: 
  - Removed Downloads page entirely from the application
  - Removed bottom navigation bar completely
  - All navigation now handled through the app header
  - Assignment selection moved to header dropdown for better UX
  - **Removed "Back to Assignments" button** - navigation is only through dropdown
- **Assignments Page Enhancement**:
  - Restructured to display chapters directly instead of assignment cards
  - Page title dynamically shows selected assignment name
  - Header dropdown allows switching between assignments
  - Chapter titles used directly instead of generic "Chapter 1, Chapter 2..." naming
  - **Made assignments page the main landing page** (replaced home page)
- **Enhanced Download UX**:
  - Removed individual download buttons from each chapter
  - Added single "Download All Chapters" button at assignment level
  - Shows download progress with real-time updates
  - Downloaded chapters display blue "Offline" indicator
  - Users can delete individual chapter downloads with trash icon
  - Smart download status: shows "All downloaded" when complete
  - Mobile-responsive download controls

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern component-based frontend using functional components with hooks
- **Wouter**: Lightweight client-side routing for navigation between pages
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **Tailwind CSS + shadcn/ui**: Utility-first styling with consistent, accessible component library
- **Vite**: Fast build tool and development server with hot module replacement

### Backend Architecture
- **Express.js**: REST API server handling authentication, content management, and file operations
- **Node.js ESM**: Modern module system with TypeScript compilation via tsx/esbuild
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect
- **Session-based Authentication**: Using Replit's OpenID Connect with PostgreSQL session storage

### Database Design
- **PostgreSQL**: Primary database using Neon serverless for scalability
- **Schema Structure**:
  - Users table with admin role support
  - Courses containing assignments and chapters in hierarchical structure
  - User progress tracking for learning analytics
  - Downloaded content management for offline support
  - Sync logs for content updates from external sources

### Authentication System
- **Replit Auth Integration**: OAuth-based authentication using OpenID Connect with automatic SSO
- **Direct Course Access**: Users arrive from Moodle LMS with course context, no landing page needed
- **Session Management**: Secure session storage with PostgreSQL backend
- **Role-based Access**: Admin users have additional content management capabilities
- **Auto-Authentication**: Automatic redirect to SSO login when not authenticated

### Audio Management
- **Progressive Web App**: Service worker for offline functionality and audio caching
- **Custom Audio Player**: Built with Web Audio API supporting playback speed control, progress tracking
- **Download System**: Local storage of audio files using IndexedDB for offline access
- **Media Session API**: Integration for native media controls and background playback

### Content Synchronization
- **Bubble API Integration**: External content management system sync capability
- **Hierarchical Content Structure**: Courses → Assignments → Chapters workflow
- **Background Sync**: Automated content updates with conflict resolution

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Authentication**: OAuth provider for user management and session handling

### Content Management
- **Bubble API**: External headless CMS for course content management and updates
- **Audio CDN**: External audio file hosting (configurable endpoint)

### Frontend Libraries
- **Radix UI**: Unstyled, accessible component primitives for complex UI interactions
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation and schema parsing
- **date-fns**: Date manipulation and formatting utilities

### Development Tools
- **Drizzle Kit**: Database migration and schema management
- **TypeScript**: Static type checking across full stack
- **PostCSS**: CSS processing with Tailwind CSS compilation
- **ESBuild**: Fast JavaScript bundling for production builds

### PWA Features
- **Service Worker**: Offline functionality and resource caching
- **IndexedDB**: Client-side database for offline audio storage and progress sync
- **Media Session API**: Native media control integration for mobile devices