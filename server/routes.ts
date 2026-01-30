import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Check if Discord OAuth is configured
  const discordConfigured = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);

  // Auth routes
  app.get("/api/auth/discord", (req, res, next) => {
    if (!discordConfigured) {
      return res.status(503).json({ error: "Discord OAuth not configured" });
    }
    passport.authenticate("discord")(req, res, next);
  });

  app.get(
    "/api/auth/discord/callback",
    passport.authenticate("discord", {
      failureRedirect: "/?error=auth_failed",
    }),
    (req, res) => {
      res.redirect("/");
    }
  );

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      // Don't send tokens to frontend
      const { accessToken, refreshToken, ...safeUser } = req.user;
      res.json({ user: safeUser });
    } else {
      res.json({ user: null });
    }
  });

  // Get auth status (for frontend to know if Discord is configured)
  app.get("/api/auth/status", (req, res) => {
    res.json({
      discordConfigured,
      authenticated: req.isAuthenticated(),
    });
  });

  // Refresh user roles from Discord
  app.post("/api/user/sync-roles", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const guildId = process.env.DISCORD_GUILD_ID;
      
      if (!user.accessToken || !guildId) {
        return res.status(400).json({ error: "Cannot sync roles" });
      }

      const response = await fetch(
        `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return res.status(400).json({ error: "Failed to fetch roles from Discord" });
      }

      const memberData = await response.json();
      const newRoles = memberData.roles || [];

      const updatedUser = await storage.updateUser(user.discordId, {
        roles: newRoles,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { accessToken, refreshToken, ...safeUser } = updatedUser;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Role sync error:", error);
      res.status(500).json({ error: "Failed to sync roles" });
    }
  });

  // Get staff members (users with staff roles)
  app.get("/api/staff", async (req, res) => {
    try {
      const staffRoleConfig = await storage.getStaffRoles();
      const allUsers = await storage.getAllStaff();
      
      // Group users by their highest staff tier
      const staffByTier: Record<string, Array<{ user: any; role: any }>> = {
        management: [],
        administrators: [],
        moderators: [],
      };

      const staffRoleIds = staffRoleConfig.map(r => r.discordRoleId);
      
      for (const user of allUsers) {
        const userRoles = user.roles || [];
        
        // Find the user's highest staff role
        for (const staffRole of staffRoleConfig) {
          if (userRoles.includes(staffRole.discordRoleId)) {
            const tier = staffRole.tier.toLowerCase();
            if (staffByTier[tier]) {
              staffByTier[tier].push({
                user: {
                  id: user.id,
                  username: user.username,
                  discriminator: user.discriminator,
                  avatar: user.avatar,
                },
                role: staffRole,
              });
            }
            break; // Only show user in their highest tier
          }
        }
      }

      res.json({ staff: staffByTier, roles: staffRoleConfig });
    } catch (error) {
      console.error("Staff fetch error:", error);
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  // Check if user has specific roles (for department access)
  app.get("/api/user/check-access/:department", isAuthenticated, (req, res) => {
    const { department } = req.params;
    const userRoles = req.user?.roles || [];
    
    // Map departments to required role IDs (these would be configured)
    const departmentRoles: Record<string, string[]> = {
      police: process.env.POLICE_ROLE_IDS?.split(",") || [],
      ems: process.env.EMS_ROLE_IDS?.split(",") || [],
      fire: process.env.FIRE_ROLE_IDS?.split(",") || [],
    };

    const requiredRoles = departmentRoles[department.toLowerCase()] || [];
    const hasAccess = requiredRoles.length === 0 || requiredRoles.some(r => userRoles.includes(r));

    res.json({ hasAccess, department });
  });

  return httpServer;
}
