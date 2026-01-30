# Tamaki Makaurau RP - FiveM Server Website

## Overview
A dark-themed website for a New Zealand/Auckland-based GTA V FiveM roleplay server. Features Discord OAuth authentication with automatic role syncing from the Discord server to the website.

## Recent Changes
- **Jan 30, 2026**: Initial full-stack implementation with Discord OAuth, user profiles, staff roster, and department portals

## Tech Stack
- **Frontend**: React 19 with TypeScript, Tailwind CSS v4, Wouter routing, TanStack Query
- **Backend**: Express 5, Passport.js with Discord strategy, PostgreSQL with Drizzle ORM
- **Styling**: Dark theme with orange (#f97316) accents, Oxanium + Plus Jakarta Sans fonts

## Project Structure
```
client/
├── src/
│   ├── assets/         # Images (hero-auckland.png)
│   ├── components/     # Navbar, UI components
│   ├── lib/            # auth.ts (Discord auth hooks), queryClient, utils
│   └── pages/          # Home, Join, Staff, Departments
server/
├── auth.ts             # Discord OAuth setup with Passport
├── db.ts               # PostgreSQL connection
├── routes.ts           # API endpoints
├── storage.ts          # Database operations
shared/
└── schema.ts           # Drizzle database schema (users, staffRoles)
```

## Required Environment Variables

### Discord OAuth (Required for Login)
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_CLIENT_SECRET` - Discord application client secret
- `DISCORD_GUILD_ID` - Your Discord server ID (for role syncing)

### Security
- `SESSION_SECRET` - Random string for session encryption (required in production)

### Department Access (Optional)
- `POLICE_ROLE_IDS` - Comma-separated Discord role IDs for police access
- `EMS_ROLE_IDS` - Comma-separated Discord role IDs for EMS access
- `FIRE_ROLE_IDS` - Comma-separated Discord role IDs for fire department access

## Features
1. **Discord Login**: Users authenticate via Discord OAuth
2. **Role Syncing**: User's Discord roles are automatically synced to their profile
3. **Staff Roster**: Displays staff members organized by hierarchy (Management > Admins > Mods)
4. **Department Portals**: Role-locked access to Police, EMS, and Fire department pages
5. **User Profiles**: Shows synced roles and profile information

## API Endpoints
- `GET /api/auth/discord` - Initiate Discord OAuth flow
- `GET /api/auth/discord/callback` - OAuth callback handler
- `POST /api/auth/logout` - End user session
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/auth/status` - Check auth configuration status
- `POST /api/user/sync-roles` - Refresh user roles from Discord
- `GET /api/staff` - Get staff member list
- `GET /api/user/check-access/:department` - Check department access

## Database Schema
- **users**: Discord user data with synced roles
- **staffRoles**: Configuration for staff hierarchy tiers

## Development
```bash
npm run dev      # Start development server
npm run db:push  # Push schema changes to database
```
