# Audio Learning Platform

## Overview

This is a mobile-first audio learning platform built for educational content consumption. The application allows users to access course materials through audio playback, with features like offline downloads, progress tracking, and user authentication. The system is designed to support learning on-the-go scenarios such as commuting or exercising.

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
- **Replit Auth Integration**: OAuth-based authentication using OpenID Connect
- **Session Management**: Secure session storage with PostgreSQL backend
- **Role-based Access**: Admin users have additional content management capabilities

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