# Migration Guide - Moving Off Replit

## What I've Done So Far

1. **Removed Replit-specific dependencies** from package.json:
   - `@replit/vite-plugin-cartographer`
   - `@replit/vite-plugin-runtime-error-modal`

2. **Updated vite.config.ts** to remove Replit plugins

3. **Created .env.example** with all required environment variables

4. **Created .gitignore** to protect sensitive files

## Next Steps

### 1. Set Up Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Key variables to configure:
- `DATABASE_URL` - Your PostgreSQL connection string
- `SESSION_SECRET` - Generate a secure random string
- `SENDGRID_API_KEY` - For email notifications (optional)
- `GOOGLE_*` - For Google Sheets integration (optional)

### 2. Set Up PostgreSQL Database
You have several options:
- **Local PostgreSQL**: Install PostgreSQL locally
- **Neon**: Continue using Neon (cloud PostgreSQL)
- **Supabase**: Free tier available
- **Railway**: Easy deployment with PostgreSQL

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Database Migrations
```bash
npm run db:push
```

### 5. Start Development Server
```bash
npm run dev
```

## Authentication Notes
The app currently uses a temporary authentication system (temp-auth.ts) instead of Replit Auth. This system:
- Uses email/password authentication
- Stores sessions in PostgreSQL
- Has default users configured via environment variables

To disable Replit authentication completely, you'll need to:
1. Remove references to `replitAuth.ts` 
2. Continue using the temp auth system or implement your own

## Deployment Options

### Option 1: Vercel (Recommended for Frontend)
- Great for React apps
- Automatic deployments from GitHub
- Need separate backend hosting

### Option 2: Railway
- Full-stack deployment
- PostgreSQL included
- Easy environment variable management

### Option 3: Render
- Free tier available
- PostgreSQL database included
- Automatic deploys from GitHub

### Option 4: DigitalOcean App Platform
- More control
- Good for production apps
- Managed PostgreSQL available

### Option 5: Self-hosted VPS
- Complete control
- Use PM2 for process management
- Nginx for reverse proxy

## Production Build
```bash
npm run build
npm start
```

## Common Issues

1. **Database Connection**: Make sure your DATABASE_URL is correct and accessible
2. **Port Configuration**: Some hosts provide PORT automatically
3. **Session Storage**: Ensure PostgreSQL sessions table is created
4. **File Uploads**: Check that your host supports file storage or use cloud storage