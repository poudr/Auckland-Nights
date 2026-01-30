import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      discordId: string;
      username: string;
      discriminator: string | null;
      avatar: string | null;
      email: string | null;
      roles: string[] | null;
      websiteRoles: string[] | null;
      isStaff: boolean | null;
      staffTier: string | null;
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
  
  // Session configuration
  const sessionSettings: session.SessionOptions = {
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
    // Use REPLIT_DEPLOYMENT_URL for production, or construct from REPLIT_DEV_DOMAIN for dev
    let callbackURL: string;
    if (process.env.REPLIT_DEPLOYMENT_URL) {
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

            // Check if user exists
            let user = await storage.getUserByDiscordId(profile.id);

            if (user) {
              // Update existing user
              user = await storage.updateUser(profile.id, {
                username: profile.username,
                discriminator: profile.discriminator || null,
                avatar: profile.avatar || null,
                email: profile.email || null,
                roles: userRoles,
                accessToken,
                refreshToken,
              });
            } else {
              // Create new user
              user = await storage.createUser({
                discordId: profile.id,
                username: profile.username,
                discriminator: profile.discriminator || null,
                avatar: profile.avatar || null,
                email: profile.email || null,
                roles: userRoles,
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

export const hasPermission = (permission: string): RequestHandler => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const websiteRoles = req.user?.websiteRoles || [];
    const staffTier = req.user?.staffTier;
    
    // Directors and executives have full access
    if (staffTier === "director" || staffTier === "executive") {
      return next();
    }
    
    // Check specific permission
    if (websiteRoles.includes(permission) || websiteRoles.includes("admin")) {
      return next();
    }
    
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  };
};
