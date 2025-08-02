---
description: Repository Information Overview
alwaysApply: true
---

# Sandwich Project Platform Information

## Summary
The Sandwich Project Platform is a full-stack web application for managing volunteer projects, tasks, and communications. It uses a React frontend with a Node.js/Express backend, and Supabase for database storage. The platform includes project management, messaging, and reporting features with a focus on tracking volunteer activities.

## Structure
- **api/**: Serverless API endpoints for Vercel deployment
- **client/**: React frontend application built with Vite
- **server/**: Express.js backend server with routes and services
- **shared/**: Shared TypeScript types and database schema
- **scripts/**: Database migration and utility scripts
- **supabase/**: Supabase functions and configuration
- **attached_assets/**: Static assets and data files
- **backups/**: Backup files for previous component versions

## Language & Runtime
**Languages**: TypeScript/JavaScript (primary), SQL
**Node Version**: Modern Node.js (not explicitly specified)
**Build System**: Vite for frontend, Node.js for backend
**Package Manager**: npm
**Database**: PostgreSQL via Supabase

## Dependencies
**Main Dependencies**:
- **Frontend**: React 18.3, React Router 7.6, Radix UI components, TailwindCSS 3.4
- **Backend**: Express 4.21, Drizzle ORM 0.39, PostgreSQL (pg 8.16)
- **API**: Ably 2.10 (real-time), SendGrid 8.1 (email), WebSockets (ws 8.18)
- **Data**: Drizzle ORM, Zod 3.24 (validation)
- **Utilities**: date-fns 3.6, PDF generation (jspdf 3.0, pdfkit 0.17)
- **Authentication**: Supabase Auth, Passport.js 0.7

**Development Dependencies**:
- TypeScript 5.6
- Vite 5.4
- Drizzle Kit 0.30
- TailwindCSS 3.4
- Vercel tooling

## Build & Installation
```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Database migrations
npm run db:push

# Data migration utilities
npm run migrate:groups-main
npm run fix:data-integrity
npm run analyze:task-assignments
```

## Server Architecture
**Main Server**: Express.js with HTTP and WebSocket support
**Database**: PostgreSQL via Supabase with connection pooling
**Authentication**: Supabase Auth + custom auth system with session management
**API Routes**: RESTful endpoints in server/routes
**Services**: Modular services in server/services including messaging and notifications
**Real-time**: WebSocket server for notifications and real-time updates
**Performance**: Cache management and query optimization

## Client Architecture
**Framework**: React 18 with Vite
**Routing**: React Router 7
**State Management**: React Context, hooks, and React Query
**UI Components**: Radix UI primitives with TailwindCSS
**Styling**: TailwindCSS with custom components
**Build Tool**: Vite with terser minification

## Database
**Type**: PostgreSQL via Supabase
**ORM**: Drizzle ORM
**Schema**: Defined in shared/schema.ts
**Migration Tool**: Drizzle Kit
**Tables**: Users, Projects, Tasks, Messages, Committees, Conversations, Audit logs
**Features**: Row-level security, soft delete functionality

## Deployment
**Platform**: Vercel (API routes) + custom hosting
**Configuration**: vercel.json for Vercel deployment
**Environment**: Production/Development modes via NODE_ENV
**Environment Variables**: Managed via .env file (template in .env.example)
**Static Assets**: Served from client/dist in production
**Fallback**: Graceful degradation with fallback server
