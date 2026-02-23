# Tamaki Makaurau RP - FiveM Server Website

## Overview
A dark-themed website for a New Zealand/Auckland-based GTA V FiveM roleplay server. Features Discord OAuth authentication with automatic role syncing from the Discord server to the website.

## Recent Changes
- **Feb 23, 2026**: QoL improvements batch - Question reordering (move up/down) in department and support form builders; Full rank editing (name, abbreviation, callsign prefix, leadership flag, Discord ID) in both Leadership Settings and Admin panel; Rank hierarchy reordering (move up/down priority); General portal access role display/edit per department; Rebuilt admin panel with Dashboard (stats overview), Access Control (granular permission tiers per action), SEO Management (per-page titles/descriptions with preview), Audit Log (paginated action tracking with user info), plus existing tabs; Dynamic page SEO via PageSeo component; Audit logging on admin actions (role CRUD, settings, sync, user updates)
- **Feb 23, 2026**: File upload storage via Replit Object Storage (server updates, application messages); Server Updates use direct image upload instead of URL input; Application messages support file attachments (images inline, documents downloadable); Discord invite URL and FiveM connect URL now read from admin settings (Join page, Support page); MessageContent component renders attachments in threads
- **Feb 20, 2026**: Added Auckland Traffic Control department (code: traffic, icon: TrafficCone, color: #F97316); TrafficCone icon added to all department icon maps (DepartmentPortal, Departments, Profile); Director/Executive/Manager website roles updated with 'traffic' permission; department works identically to other departments (roster, SOPs, applications, leadership settings)
- **Feb 19, 2026**: Player profiles at /profile/:discordId (display name from Discord, department memberships with ranks/callsigns/QIDs, staff-visible open applications); EMS custom roster layout (Name-ATP-Callsign-CSO columns, CSO from Discord role); Roster names link to profiles using displayName; "My Profile" in user dropdown; displayName shown throughout nav
- **Feb 19, 2026**: Support page redesigned with tabbed layout (FAQ, Applications, Join Discord, Contact Us); FAQ system with accordion-style entries (Executive/Director can add/edit/delete FAQs with categories); Application form management (Executive/Director can create/delete forms); Join Discord section with rich invite card; Contact Us with Discord ticket links; Removed "Welcome back" from home page; Added SUPPORT to navbar before SHOP
- **Feb 19, 2026**: Server Updates section on home page (Manager+ can post updates with title, description, optional image; newest shows in full, older condensed); Support page (/support) with 7 pre-seeded application types (Staff Apps, Ban Appeals, Events Staff, Social Media, CivX, Gang, Development); configurable access tiers per form; Executive/Director can edit questions and access; staff can close/open forms; submission thread system with notifications
- **Feb 16, 2026**: Notification deep-linking (clicks navigate directly to application thread); User applications visible on access-denied pages; Clear All notifications button; Leadership can delete applications; Configurable notification recipients per form
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
### Emergency Services
1. **Auckland Police Department** (police) - Blue, 11 ranks from Commissioner to Recruit
2. **NZ Fire & Emergency** (fire) - Red, 8 ranks from District Manager to Recruit
3. **Emergency Ambulance Service** (ems) - Green, 8 ranks from District Operations Officer to First Responder
4. **Armed Offenders Squad** (aos) - Purple, 6 ranks from Commander to Trainee

### Other Departments
5. **Auckland Towing** (towing) - Amber, ranks managed via Leadership Settings. General Discord Role ID: 1404050461581115453

## Development
```bash
npm run dev      # Start development server
npm run db:push  # Push schema changes to database
```
