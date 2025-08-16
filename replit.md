# Audio Learning Platform

## Overview

This is a mobile-first audio learning platform built for The Institutes educational content consumption. Users access the platform directly from Moodle LMS via SSO authentication, immediately landing on their course assignments page. The application allows users to consume course materials through audio playback, with features like offline downloads, progress tracking, and automatic authentication. The system is designed to support learning on-the-go scenarios such as commuting or exercising.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query v5) for server state
- **UI Components**: Shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite with React plugin
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React and React Icons
- **Audio**: Custom useAudio hook with Media Session API integration
- **Animations**: Framer Motion for smooth transitions

### Backend
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with tsx for compilation
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
- **Authentication**: Replit OIDC/SSO with Passport.js
- **Session Storage**: connect-pg-simple for PostgreSQL-based sessions
- **API**: RESTful endpoints with Zod validation
- **File Storage**: Local filesystem for audio downloads

### Development Tools
- **Database Schema**: Drizzle Kit for migrations
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Hot Reload**: Vite dev server with automatic workflow restart

## Core Functionality

### Authentication & Authorization
- **SSO Integration**: Seamless authentication via Replit OIDC
- **Auto-authentication**: Automatic redirect to login when not authenticated
- **Session Management**: 7-day persistent sessions stored in PostgreSQL
- **Token Refresh**: Automatic token refresh to maintain active sessions
- **Role-based Access**: Admin users have access to content management features
- **User Profile**: Stores first name, last name, email, and profile image

### Content Structure
1. **Courses**: Top-level educational programs
   - Course code, name, and description
   - Active/inactive status for availability control
   - Integration with external content repository via Bubble ID

2. **Assignments**: Learning modules within courses
   - Ordered sequence within each course
   - Title and description for context
   - Multiple chapters per assignment

3. **Chapters**: Individual audio lessons
   - Audio file URL for streaming
   - Duration tracking in seconds
   - Ordered sequence within assignments
   - Progress tracking per user

### Audio Playback Features
- **Mini Player**: Persistent bottom player showing current track
  - Play/pause controls
  - Track information display
  - Progress bar with time display
  - Quick access to expanded player

- **Expanded Player**: Full-featured audio interface
  - Large album art visualization with animated orbs
  - Scrubbing progress bar for seeking
  - Playback speed control (0.5x to 2x)
  - Volume control with mute option
  - Skip forward/backward (30 seconds)
  - Chapter navigation (previous/next)
  - Social sharing capabilities
  - Download for offline listening

- **Play All Mode**: Sequential playback of all chapters in an assignment
  - Automatic advancement to next chapter
  - Maintains playback context across chapters
  - Option to stop at any time

- **Background Playback**: Media Session API integration
  - Lock screen controls
  - Notification controls
  - Metadata display (title, artist, album art)

### Progress Tracking
- **Automatic Saving**: Progress saved every 10 seconds during playback
- **Resume Playback**: Start from last position when returning to a chapter
- **Completion Status**: Visual indicators for completed chapters
- **Remaining Time**: Display of time left in each chapter
- **Cross-device Sync**: Progress synchronized across all user devices

### Offline Support
- **Download Management**: Download individual chapters or entire assignments
- **Local Storage**: Audio files stored in filesystem
- **Download Status**: Visual indicators for downloaded content
- **Offline Playback**: Play downloaded content without internet
- **Storage Management**: Remove individual or all downloads

### Admin Features
- **Content Sync**: Integration with external content repository API
  - Fetch courses, assignments, and chapters from Bubble API
  - Automatic content updates
  - Sync status monitoring with timestamps
  - Error tracking and reporting

- **Manual Content Management**:
  - Create, edit, and delete courses
  - Manage assignments within courses
  - Add and organize chapters
  - Upload audio files directly

- **Audio Generation**: Mock audio creation for testing
  - Text-to-speech conversion using edge-tts
  - Automatic duration calculation
  - MP3 format output

## User Interface

### Design System
- **Color Palette**: 
  - Primary Orange (#ff6b35) for main actions
  - System font stack for optimal readability
  - Gray scale for text hierarchy
  - Clean white cards on light background

- **Responsive Design**:
  - Mobile-first approach
  - Breakpoints for tablet and desktop
  - Touch-optimized controls
  - Adaptive layouts for different screen sizes

### Key Pages

1. **Assignments Page** (`/assignments`)
   - Default landing page after authentication
   - Assignment switcher in header
   - Chapter list with progress indicators
   - Play All and Download All actions
   - Search and filter capabilities

2. **Chapters Page** (`/chapters`)
   - Detailed chapter listing for an assignment
   - Individual chapter cards with metadata
   - Progress visualization
   - Download status indicators

3. **Player Page** (`/player`)
   - Dedicated audio player view
   - Full-screen visualization
   - Chapter navigation controls
   - Progress tracking

4. **Admin Page** (`/admin`)
   - Content management dashboard
   - Sync status and controls
   - Course/assignment/chapter CRUD operations
   - Setup information display

### Components Architecture
- **Context Providers**:
  - `AudioProvider`: Global audio state and controls
  - `QueryClientProvider`: Server state management
  - `TooltipProvider`: Tooltip system
  - `Toaster`: Toast notifications

- **Shared Components**:
  - `AppHeader`: Navigation and course/assignment selection
  - `MiniPlayer`: Persistent audio controls
  - `ExpandedPlayer`: Full audio interface
  - `ChapterList`: Reusable chapter display
  - `AdminPanel`: Administrative interface

## Database Schema

### Core Tables
- **users**: User profiles and authentication data
- **sessions**: Authentication session storage
- **courses**: Educational programs
- **assignments**: Learning modules
- **chapters**: Individual audio lessons
- **user_progress**: Playback progress tracking
- **downloaded_content**: Offline content registry
- **sync_logs**: Content synchronization history

### Relationships
- Courses → Assignments (one-to-many)
- Assignments → Chapters (one-to-many)
- Users → Progress (one-to-many per chapter)
- Users → Downloads (one-to-many)

## API Endpoints

### Authentication
- `GET /api/login` - Initiate SSO authentication
- `GET /api/callback` - Handle SSO callback
- `GET /api/logout` - End user session
- `GET /api/auth/user` - Get current user profile

### Content
- `GET /api/courses` - List all courses
- `GET /api/courses/:id/assignments` - Get assignments for course
- `GET /api/assignments/:id/chapters` - Get chapters for assignment
- `GET /api/audio/:filename` - Stream audio file

### Progress
- `GET /api/progress/:chapterId` - Get user progress
- `POST /api/progress` - Update playback progress

### Downloads
- `POST /api/download/:chapterId` - Download chapter audio
- `DELETE /api/download/:chapterId` - Remove downloaded audio
- `GET /api/downloads` - List user's downloads

### Admin
- `POST /api/admin/sync` - Sync content from external API
- `GET /api/admin/sync-status` - Get last sync status
- `POST /api/admin/generate-audio` - Generate mock audio
- CRUD operations for courses, assignments, chapters

## Environment Configuration

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session secret
- `REPLIT_DOMAINS` - Comma-separated list of allowed domains
- `REPL_ID` - Replit application identifier
- `ISSUER_URL` - OIDC issuer URL (defaults to Replit)

### Optional Configuration
- `BUBBLE_API_KEY` - External content API key
- `BUBBLE_API_URL` - External content API base URL
- `CONTENT_REPO_URL` - Content repository URL
- `PORT` - Server port (defaults to 5000)

## Development Workflow

### Setup
1. Database is automatically provisioned via Replit
2. Dependencies installed via npm
3. Database schema pushed via `npm run db:push`
4. Development server started with `npm run dev`

### Commands
- `npm run dev` - Start development server (Vite + Express)
- `npm run build` - Build production assets
- `npm run db:push` - Apply schema changes to database
- `npm run db:studio` - Open Drizzle Studio for database inspection

### File Structure
```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility libraries
│   │   ├── pages/       # Route components
│   │   └── App.tsx      # Main application component
│   └── index.html       # HTML entry point
├── server/              # Backend Express application
│   ├── services/        # Business logic services
│   ├── db.ts           # Database connection
│   ├── index.ts        # Server entry point
│   ├── replitAuth.ts   # Authentication setup
│   ├── routes.ts       # API route definitions
│   ├── storage.ts      # Data access layer
│   └── vite.ts         # Vite integration
├── shared/              # Shared TypeScript types
│   └── schema.ts       # Database schema and types
├── downloads/          # Local audio file storage
└── attached_assets/    # Static assets

```

## Security Considerations
- HTTPS-only cookies for session management
- CORS protection via Vite configuration
- SQL injection prevention via parameterized queries
- XSS protection through React's default escaping
- Authentication required for all API endpoints
- Admin role verification for management operations
- Secure token refresh mechanism

## Performance Optimizations
- Lazy loading of audio files
- Metadata preloading for quick playback
- Progress updates batched every 10 seconds
- React Query caching for API responses
- Memoized authentication configuration
- Database connection pooling
- Optimistic UI updates for better perceived performance

## Future Enhancements
- Push notifications for new content
- Collaborative playlists
- Advanced analytics dashboard
- Multi-language support
- Podcast-style subscriptions
- Social features (comments, ratings)
- Advanced search and filtering
- Batch operations for content management