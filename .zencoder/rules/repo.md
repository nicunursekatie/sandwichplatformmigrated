---
description: Repository Information Overview
alwaysApply: true
---

# The Sandwich Project Platform Information

## Summary

The Sandwich Project Platform is a web application for managing volunteer projects, tasks, and communications. It includes a React frontend, Node.js backend, and PostgreSQL database with Supabase integration. The platform supports project management, messaging, user authentication, and reporting features.

## Structure

- **api/**: API routes and serverless functions
- **client/**: React frontend application
- **server/**: Express.js backend server
- **shared/**: Shared code and database schema
- **scripts/**: Database migration and utility scripts
- **attached_assets/**: Project assets and data files
- **supabase/**: Supabase functions and configuration

## Language & Runtime

**Languages**: TypeScript, JavaScript, SQL, Python
**Node Version**: Not explicitly specified, compatible with modern Node.js
**Build System**: Vite
**Package Manager**: npm/yarn
**Database**: PostgreSQL via Supabase

## Dependencies

**Main Dependencies**:

- **Frontend**: React, React Router, Radix UI components, TailwindCSS
- **Backend**: Express, Drizzle ORM, PostgreSQL, Supabase
- **API**: Ably (real-time), SendGrid (email)
- **Data**: Drizzle ORM, Zod (validation)
- **Utilities**: date-fns, PDF generation (jspdf)

**Development Dependencies**:

- TypeScript
- Vite
- TailwindCSS
- Drizzle Kit

## Build & Installation

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build frontend
npm run build

# Database migrations
npm run db:push

# Data migration utilities
npm run migrate:groups-main
npm run fix:data-integrity
```

## Server Configuration

**Main Server**: Express.js with HTTP and WebSocket support
**Database**: PostgreSQL via Supabase
**Authentication**: Custom auth system with session management
**API Routes**: RESTful endpoints in server/routes
**Real-time**: WebSocket server for notifications

## Client Application

**Framework**: React with Vite
**Routing**: React Router
**UI Components**: Radix UI primitives with TailwindCSS
**State Management**: React Context and hooks
**Build Tool**: Vite

## Database

**ORM**: Drizzle ORM
**Schema**: Defined in shared/schema.ts
**Migrations**: Managed with Drizzle Kit
**Tables**: Users, Projects, Tasks, Messages, Committees, Audit logs

## Python Integration

**Python Version**: >=3.11
**Dependencies**: pandas, psycopg2, openpyxl, python-dotenv, requests
**Purpose**: Data processing and database operations

## Testing

No formal testing framework identified in the repository.

## Deployment

**Production Mode**: Configured for deployment on Replit
**Environment Variables**: Managed via .env file (template in .env.example)
**Static Assets**: Served from client/dist in production
