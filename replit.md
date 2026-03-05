# Tamaki Makaurau RP - FiveM Server Website

## Overview
This project is a dark-themed website for a New Zealand/Auckland-based GTA V FiveM roleplay server. Its primary purpose is to provide a centralized platform for community management, staff operations, and player engagement. Key capabilities include Discord OAuth authentication with automatic role syncing, comprehensive department management (Police, EMS, Fire, AOS, SERT, Traffic Control, Towing), and an advanced application system for joining departments and submitting support requests. The platform aims to streamline administrative tasks, enhance communication within the server community, and offer a rich, interactive experience for players and staff.

## User Preferences
I want iterative development.
Ask before making major changes.
I prefer detailed explanations.
Do not make changes to the folder `shared`.
Do not make changes to the file `server/seed.ts`.
I prefer to use `npm` as the package manager.
I prefer `React 19` with `TypeScript` for the frontend.
I prefer `Tailwind CSS v4` for styling.
I prefer `Wouter` for routing.
I prefer `TanStack Query` for data fetching.
I prefer `Express 5` for the backend.
I prefer `Passport.js` with `Discord strategy` for authentication.
I prefer `PostgreSQL` with `Drizzle ORM` for the database.
I prefer a dark theme with orange (`#f97316`) accents.
I prefer `Oxanium` and `Plus Jakarta Sans` fonts.
All file uploads should use the local filesystem (`multer-based`) and save to the `uploads/` directory.

## System Architecture
The system employs a client-server architecture. The frontend is built with React 19 and TypeScript, utilizing Tailwind CSS v4 for styling, Wouter for routing, and TanStack Query for data management. The backend is an Express 5 server handling API requests, authentication, and database interactions. Passport.js with a Discord strategy manages user authentication and role syncing. PostgreSQL, accessed via Drizzle ORM, serves as the primary database.

**UI/UX Decisions:**
The website features a dark theme with orange (`#f97316`) accents, using Oxanium and Plus Jakarta Sans fonts for a consistent aesthetic. Dynamic page SEO is implemented for better searchability.

**Technical Implementations:**
- **Authentication:** Discord OAuth for user login and automatic role syncing based on `DISCORD_GUILD_ID`.
- **Role-Based Access Control (RBAC):** Granular permissions managed through `roleMappings` table, dictating access to department portals, admin features, and specific actions. Directors/Executives have full access.
- **Department Management:** Dedicated portals for Police, Fire, EMS, AOS, SERT, Auckland Traffic Control, and Auckland Towing, each with customizable rosters, SOPs, and application forms.
- **Application System:** Supports both department whitelist applications and general support forms (e.g., Ban Appeals, Staff Apps). Features a form builder, submission threads, notifications, and leadership approval workflows with automatic Discord role assignment.
- **Admin Panel:** Centralized dashboard for user management, role mapping configuration, bulk role syncing, audit logging, and SEO management.
- **File Uploads:** Local filesystem-based storage (`multer`) for server updates and application message attachments, saving to the `uploads/` directory.
- **Roster System:** Dynamic display of staff members, including custom ATP text, callsigns, QIDs, and division assignments (for Police). Player profiles are accessible.
- **SOPs and FAQs:** Department-specific Standard Operating Procedures and a general FAQ system with editable, categorizable entries.
- **Notifications:** In-app notifications with deep-linking to relevant application threads and configurable recipients.
- **Server Updates:** A section on the homepage for managers to post server news and updates with optional images.

## External Dependencies
- **Discord API:** Used for OAuth authentication, retrieving user roles, and assigning roles via a Discord Bot API integration.
- **PostgreSQL:** The primary database for storing all application data, user information, department configurations, roles, and other persistent data.
- **Tailwind CSS:** A utility-first CSS framework used for styling the frontend.
- **Wouter:** A tiny router for React used for client-side navigation.
- **TanStack Query:** Used for data fetching, caching, and state management in the frontend.
- **Passport.js:** Middleware for Node.js that handles authentication, specifically with the Discord strategy.
- **Drizzle ORM:** A TypeScript ORM for PostgreSQL, used for database interactions.
- **Multer:** Node.js middleware for handling `multipart/form-data`, primarily used for file uploads.