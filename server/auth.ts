import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { STAFF_HIERARCHY } from "@shared/schema";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      discordId: string;
      username: string;
      displayName: string | null;
      discriminator: string | null;
      avatar: string | null;
      email: string | null;
      roles: string[] | null;
      websiteRoles: string[] | null;
      isStaff: boolean | null;
      staffTier: string | null;
      staffTiers: string[] | null;
      accessToken: string | null;
      refreshToken: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

export function setupAuth(app: Express) {
  // Require SESSION_SECRET in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  
  const PgStore = connectPgSimple(session);

  const sessionSettings: session.SessionOptions = {
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: "session",
    }),
    secret: sessionSecret || "dev-only-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Only set up Discord strategy if credentials are available
  if (DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET) {
    let callbackURL: string;
    if (process.env.APP_URL) {
      const base = process.env.APP_URL.replace(/\/$/, "");
      callbackURL = `${base}/api/auth/discord/callback`;
    } else if (process.env.REPLIT_DEPLOYMENT_URL) {
      callbackURL = `${process.env.REPLIT_DEPLOYMENT_URL}/api/auth/discord/callback`;
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      callbackURL = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/discord/callback`;
    } else {
      callbackURL = "http://localhost:5000/api/auth/discord/callback";
    }
    
    console.log("Discord OAuth Callback URL:", callbackURL);

    passport.use(
      new DiscordStrategy(
        {
          clientID: DISCORD_CLIENT_ID,
          clientSecret: DISCORD_CLIENT_SECRET,
          callbackURL,
          scope: ["identify", "email", "guilds", "guilds.members.read"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Fetch user's roles from the guild
            let userRoles: string[] = [];
            if (DISCORD_GUILD_ID) {
              try {
                const response = await fetch(
                  `https://discord.com/api/v10/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  }
                );
                if (response.ok) {
                  const memberData = await response.json();
                  userRoles = memberData.roles || [];
                }
              } catch (error) {
                console.error("Failed to fetch guild roles:", error);
              }
            }

            const roleMappings = await storage.getRoleMappings();
            const allWebsiteRoleDefs = await storage.getWebsiteRoles();
            const websitePermissions: string[] = [];
            const collectedTiers: string[] = [];
            let staffTier: string | null = null;
            let isStaff = false;

            for (const discordRoleId of userRoles) {
              const mapping = roleMappings.find(m => m.discordRoleId === discordRoleId);
              if (mapping) {
                const permissions = mapping.websitePermission.split(",").map(p => p.trim()).filter(Boolean);
                websitePermissions.push(...permissions);
                if (mapping.staffTier) {
                  isStaff = true;
                  collectedTiers.push(mapping.staffTier);
                  const idx = STAFF_HIERARCHY.indexOf(mapping.staffTier as any);
                  const curIdx = staffTier ? STAFF_HIERARCHY.indexOf(staffTier as any) : -1;
                  if (idx !== -1 && (curIdx === -1 || idx < curIdx)) {
                    staffTier = mapping.staffTier;
                  }
                }
              }

              const wsRole = allWebsiteRoleDefs.find(r => r.discordRoleId === discordRoleId);
              if (wsRole) {
                if (wsRole.permissions) {
                  websitePermissions.push(...wsRole.permissions);
                }
                if (wsRole.staffTier) {
                  isStaff = true;
                  collectedTiers.push(wsRole.staffTier);
                  const idx = STAFF_HIERARCHY.indexOf(wsRole.staffTier as any);
                  const curIdx = staffTier ? STAFF_HIERARCHY.indexOf(staffTier as any) : -1;
                  if (idx !== -1 && (curIdx === -1 || idx < curIdx)) {
                    staffTier = wsRole.staffTier;
                  }
                }
              }
            }

            const uniquePermissions = Array.from(new Set(websitePermissions));
            const uniqueTiers = Array.from(new Set(collectedTiers));

            // Check if user exists
            let user = await storage.getUserByDiscordId(profile.id);

            const displayName = (profile as any)._json?.global_name || profile.username;

            if (user) {
              user = await storage.updateUser(profile.id, {
                username: profile.username,
                displayName,
                discriminator: profile.discriminator || null,
                avatar: profile.avatar || null,
                email: profile.email || null,
                roles: userRoles,
                websiteRoles: uniquePermissions,
                isStaff,
                staffTier,
                staffTiers: uniqueTiers,
                accessToken,
                refreshToken,
              });
            } else {
              user = await storage.createUser({
                discordId: profile.id,
                username: profile.username,
                displayName,
                discriminator: profile.discriminator || null,
                avatar: profile.avatar || null,
                email: profile.email || null,
                roles: userRoles,
                websiteRoles: uniquePermissions,
                isStaff,
                staffTier,
                staffTiers: uniqueTiers,
                accessToken,
                refreshToken,
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || undefined);
    } catch (error) {
      done(error);
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

export const hasRole = (roleIds: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userRoles = req.user?.roles || [];
    const hasRequiredRole = roleIds.some((roleId) => userRoles.includes(roleId));
    if (!hasRequiredRole) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

const STAFF_TIER_HIERARCHY = ["director", "executive", "manager", "administrator", "moderator", "support", "development"];

export function meetsStaffTier(userTier: string | null | undefined, requiredTier: string): boolean {
  if (!userTier) return false;
  const userIdx = STAFF_TIER_HIERARCHY.indexOf(userTier);
  const reqIdx = STAFF_TIER_HIERARCHY.indexOf(requiredTier);
  if (userIdx === -1 || reqIdx === -1) return false;
  return userIdx <= reqIdx;
}

export const hasPermission = (permission: string): RequestHandler => {
  return async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const websiteRoles = req.user?.websiteRoles || [];
    const staffTier = req.user?.staffTier;
    
    if (staffTier === "director" || staffTier === "executive") {
      return next();
    }
    
    if (permission === "admin") {
      const setting = await storage.getAdminSetting("staff_access_admin_panel");
      const requiredTier = setting?.value || "executive";
      if (staffTier && meetsStaffTier(staffTier, requiredTier)) {
        return next();
      }
      const mappings = await storage.getRoleMappings();
      if (mappings.length === 0) {
        console.log("Bootstrap mode: Granting admin access to", req.user?.username);
        return next();
      }
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    
    if (websiteRoles.includes(permission)) {
      return next();
    }
    
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  };
};
