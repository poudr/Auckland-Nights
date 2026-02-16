# Tamaki Makaurau RP - FiveM Server Website

## Overview
A dark-themed website for a New Zealand/Auckland-based GTA V FiveM roleplay server. Features Discord OAuth authentication with automatic role syncing from the Discord server to the website.

## Recent Changes
- **Feb 16, 2026**: Form editing (edit existing application forms with pre-populated questions/roles); Whitelist application system (isWhitelist flag, "Apply Now" button on access-denied pages and department cards, public whitelist form endpoint); One whitelist form per department enforced; Submission validation restricts non-members to whitelist forms only
- **Feb 16, 2026**: Automatic role assignment on application acceptance; Form builder configures default Discord roles (from department ranks) and website portal access roles; Accept panel lets leadership tweak roles per-application before confirming; Server-side validation restricts roles to department scope; Discord Bot API integration for role assignment; DISCORD_BOT_TOKEN secret required
- **Feb 11, 2026**: Home page About section (admin-editable description + Get Started button); Changed "Whitelisted Jobs" to "Custom Scripts"; Admin Settings now persist to database; AOS Squad system (squad CRUD, squad-based roster categorization, squad assignment in leadership settings)
- **Feb 10, 2026**: Fire and EMS SOP pages with Jump To navigation (Rules-page style); Custom staff roster colors (hex); Admin panel restricted to Director/Executive only; Pre-seeded department access role mappings (Police, Fire, EMS, AOS); Removed AOS ranks from seed (manual setup); QID system for Police roster
- **Feb 10, 2026**: Added "Department Roles" section in admin Role Management panel with expandable department accordions and inline Discord Role ID editing; Bi-directional sync with Leadership Settings (both use same rank update API); Fixed Leadership Settings tab visibility for Directors/Executives
- **Feb 9, 2026**: Unified role management (merged Website Roles + Discord Mappings into single tab); Pre-seeded 6 staff roles; Auto-populating roster from Discord role IDs on department ranks; Inline rank Discord Role ID editing in Leadership Settings
- **Jan 30, 2026**: Added department portals with rosters, SOPs, applications; Admin dashboard with role mapping CRUD and bulk sync; Team page with staff hierarchy
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
│   └── pages/          # Home, Join, Team, Departments, DepartmentPortal, Admin
server/
├── auth.ts             # Discord OAuth setup with Passport, hasPermission middleware
├── db.ts               # PostgreSQL connection
├── routes.ts           # API endpoints for auth, departments, admin
├── storage.ts          # Database operations via Drizzle ORM
├── seed.ts             # Database seeding for departments and ranks
shared/
└── schema.ts           # Drizzle database schema (users, departments, ranks, roster, etc.)
```

## Required Environment Variables

### Discord OAuth (Required for Login)
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_CLIENT_SECRET` - Discord application client secret
- `DISCORD_GUILD_ID` - Your Discord server ID (for role syncing)

### Security
- `SESSION_SECRET` - Random string for session encryption (required in production)

## Features
1. **Discord Login**: Users authenticate via Discord OAuth
2. **Role Syncing**: User's Discord roles are automatically synced to website permissions via role mappings
3. **Staff Roster**: Displays staff members organized by hierarchy (Director → Executive → Manager → Administrator → Moderator → Support → Development)
4. **Department Portals**: Role-locked access to Police, EMS, Fire, and AOS department pages with rosters, SOPs, applications
5. **Admin Dashboard**: Role mapping configuration, user management, bulk role sync
6. **RBAC**: Directors/Executives have full access; other users need explicit website permissions

## API Endpoints

### Authentication
- `GET /api/auth/discord` - Initiate Discord OAuth flow
- `GET /api/auth/discord/callback` - OAuth callback handler
- `POST /api/auth/logout` - End user session
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/auth/status` - Check auth configuration status
- `POST /api/user/sync-roles` - Refresh user roles from Discord

### Team & Departments
- `GET /api/team` - Get staff members grouped by tier
- `GET /api/departments` - List all departments
- `GET /api/departments/:code` - Get single department
- `GET /api/departments/:code/ranks` - Get department ranks
- `GET /api/departments/:code/roster` - Get department roster with users
- `GET /api/departments/:code/sops` - Get department SOPs
- `GET /api/departments/:code/applications` - Get department applications (auth required)
- `POST /api/departments/:code/applications` - Submit application (auth required)
- `GET /api/user/check-access/:department` - Check user's department access

### Admin (requires admin permission)
- `GET /api/admin/users` - List all users
- `GET /api/admin/role-mappings` - List role mappings
- `POST /api/admin/role-mappings` - Create role mapping
- `DELETE /api/admin/role-mappings/:id` - Delete role mapping
- `POST /api/admin/sync-all-roles` - Sync all users' roles from Discord
- `GET /api/admin/settings` - Get admin settings
- `POST /api/admin/settings` - Update admin setting
- `GET /api/admin/menu-items` - Get menu items
- `PUT /api/admin/menu-items/:id` - Update menu item

## Database Schema
- **users**: Discord user data with synced roles, websiteRoles, isStaff, staffTier
- **departments**: Police, Fire, EMS, AOS with colors and icons
- **ranks**: Department ranks with priority, leadership flag, callsign prefix
- **rosterMembers**: User membership in departments with rank and callsign
- **sops**: Standard Operating Procedures per department
- **applications**: User applications to join departments
- **roleMappings**: Discord role ID → website permission + staff tier mapping
- **menuItems**: Dynamic navigation menu configuration
- **adminSettings**: Key-value admin configuration

## Departments (Seeded)
1. **Auckland Police Department** (police) - Blue, 11 ranks from Commissioner to Recruit
2. **NZ Fire & Emergency** (fire) - Red, 8 ranks from District Manager to Recruit
3. **Emergency Ambulance Service** (ems) - Green, 8 ranks from District Operations Officer to First Responder
4. **Armed Offenders Squad** (aos) - Purple, 6 ranks from Commander to Trainee

## Development
```bash
npm run dev      # Start development server
npm run db:push  # Push schema changes to database
```
