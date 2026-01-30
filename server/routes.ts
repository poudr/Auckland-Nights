import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hasPermission } from "./auth";
import { seedDatabase } from "./seed";
import { STAFF_HIERARCHY } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Seed database on startup
  await seedDatabase();

  // Check if Discord OAuth is configured
  const discordConfigured = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);

  // ============ AUTH ROUTES ============
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

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const { accessToken, refreshToken, ...safeUser } = req.user;
      res.json({ user: safeUser });
    } else {
      res.json({ user: null });
    }
  });

  app.get("/api/auth/status", (req, res) => {
    res.json({
      discordConfigured,
      authenticated: req.isAuthenticated(),
    });
  });

  // ============ USER ROUTES ============
  app.post("/api/user/sync-roles", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const guildId = process.env.DISCORD_GUILD_ID;
      
      if (!user.accessToken || !guildId) {
        return res.status(400).json({ error: "Cannot sync roles" });
      }

      const response = await fetch(
        `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );

      if (!response.ok) {
        return res.status(400).json({ error: "Failed to fetch roles from Discord" });
      }

      const memberData = await response.json();
      const newRoles = memberData.roles || [];

      // Map Discord roles to website permissions
      const roleMappings = await storage.getRoleMappings();
      const websiteRoles: string[] = [];
      let staffTier: string | null = null;
      let isStaff = false;

      for (const discordRoleId of newRoles) {
        const mapping = roleMappings.find(m => m.discordRoleId === discordRoleId);
        if (mapping) {
          websiteRoles.push(mapping.websitePermission);
          if (mapping.staffTier) {
            isStaff = true;
            // Keep the highest tier (lowest index)
            if (!staffTier || STAFF_HIERARCHY.indexOf(mapping.staffTier as any) < STAFF_HIERARCHY.indexOf(staffTier as any)) {
              staffTier = mapping.staffTier;
            }
          }
        }
      }

      const updatedUser = await storage.updateUser(user.discordId, {
        roles: newRoles,
        websiteRoles: Array.from(new Set(websiteRoles)),
        isStaff,
        staffTier,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { accessToken: _, refreshToken: __, ...safeUser } = updatedUser;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Role sync error:", error);
      res.status(500).json({ error: "Failed to sync roles" });
    }
  });

  // ============ STAFF/TEAM ROUTES ============
  app.get("/api/team", async (req, res) => {
    try {
      const staffMembers = await storage.getStaffMembers();
      
      // Group by staff tier
      const grouped: Record<string, any[]> = {};
      for (const tier of STAFF_HIERARCHY) {
        grouped[tier] = [];
      }
      
      for (const member of staffMembers) {
        if (member.staffTier && grouped[member.staffTier]) {
          grouped[member.staffTier].push({
            id: member.id,
            username: member.username,
            avatar: member.avatar,
            discordId: member.discordId,
            staffTier: member.staffTier,
          });
        }
      }

      res.json({ team: grouped, hierarchy: STAFF_HIERARCHY });
    } catch (error) {
      console.error("Team fetch error:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  // ============ DEPARTMENT ROUTES ============
  app.get("/api/departments", async (req, res) => {
    try {
      const depts = await storage.getDepartments();
      res.json({ departments: depts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.get("/api/departments/:code", async (req, res) => {
    try {
      const dept = await storage.getDepartment(req.params.code);
      if (!dept) return res.status(404).json({ error: "Department not found" });
      res.json({ department: dept });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch department" });
    }
  });

  app.get("/api/departments/:code/ranks", async (req, res) => {
    try {
      const ranks = await storage.getRanksByDepartment(req.params.code);
      res.json({ ranks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ranks" });
    }
  });

  app.get("/api/departments/:code/roster", async (req, res) => {
    try {
      const roster = await storage.getRosterByDepartment(req.params.code);
      const ranks = await storage.getRanksByDepartment(req.params.code);
      
      // Enrich roster with user and rank data
      const enrichedRoster = await Promise.all(
        roster.map(async (member) => {
          const user = await storage.getUser(member.userId);
          const rank = ranks.find(r => r.id === member.rankId);
          return {
            ...member,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar, discordId: user.discordId } : null,
            rank,
          };
        })
      );

      // Sort by rank priority
      enrichedRoster.sort((a, b) => (a.rank?.priority || 999) - (b.rank?.priority || 999));

      res.json({ roster: enrichedRoster, ranks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roster" });
    }
  });

  app.get("/api/departments/:code/sops", async (req, res) => {
    try {
      const sops = await storage.getSopsByDepartment(req.params.code);
      res.json({ sops });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SOPs" });
    }
  });

  app.get("/api/departments/:code/applications", isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code as string;
      const applications = await storage.getApplicationsByDepartment(code);
      res.json({ applications });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.post("/api/departments/:code/applications", isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code as string;
      const application = await storage.createApplication({
        userId: req.user!.id,
        departmentCode: code,
        type: req.body.type,
        formData: JSON.stringify(req.body.formData),
        status: "pending",
      });
      res.json({ application });
    } catch (error) {
      res.status(500).json({ error: "Failed to create application" });
    }
  });

  // ============ ADMIN ROUTES ============
  app.get("/api/admin/users", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(({ accessToken, refreshToken, ...u }) => u);
      res.json({ users: safeUsers });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/role-mappings", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const mappings = await storage.getRoleMappings();
      res.json({ mappings });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch role mappings" });
    }
  });

  app.post("/api/admin/role-mappings", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const mapping = await storage.createRoleMapping(req.body);
      res.json({ mapping });
    } catch (error) {
      res.status(500).json({ error: "Failed to create role mapping" });
    }
  });

  app.delete("/api/admin/role-mappings/:id", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      await storage.deleteRoleMapping(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete role mapping" });
    }
  });

  app.get("/api/admin/settings", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const settings = await storage.getAdminSettings();
      // Don't return secret values
      const safeSettings = settings.map(s => ({
        ...s,
        value: s.isSecret ? "********" : s.value,
      }));
      res.json({ settings: safeSettings });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const setting = await storage.upsertAdminSetting({
        ...req.body,
        updatedBy: req.user!.id,
      });
      res.json({ setting });
    } catch (error) {
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  app.get("/api/admin/menu-items", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const items = await storage.getMenuItems();
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.put("/api/admin/menu-items/:id", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const item = await storage.updateMenuItem(id, req.body);
      res.json({ item });
    } catch (error) {
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  // Sync all users from Discord
  app.post("/api/admin/sync-all-roles", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const guildId = process.env.DISCORD_GUILD_ID;
      const roleMappings = await storage.getRoleMappings();
      
      let synced = 0;
      let failed = 0;

      for (const user of users) {
        if (!user.accessToken || !guildId) {
          failed++;
          continue;
        }

        try {
          const response = await fetch(
            `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
            { headers: { Authorization: `Bearer ${user.accessToken}` } }
          );

          if (response.ok) {
            const memberData = await response.json();
            const newRoles = memberData.roles || [];
            
            const websiteRoles: string[] = [];
            let staffTier: string | null = null;
            let isStaff = false;

            for (const discordRoleId of newRoles) {
              const mapping = roleMappings.find(m => m.discordRoleId === discordRoleId);
              if (mapping) {
                websiteRoles.push(mapping.websitePermission);
                if (mapping.staffTier) {
                  isStaff = true;
                  if (!staffTier || STAFF_HIERARCHY.indexOf(mapping.staffTier as any) < STAFF_HIERARCHY.indexOf(staffTier as any)) {
                    staffTier = mapping.staffTier;
                  }
                }
              }
            }

            await storage.updateUser(user.discordId, {
              roles: newRoles,
              websiteRoles: Array.from(new Set(websiteRoles)),
              isStaff,
              staffTier,
            });
            synced++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      res.json({ synced, failed, total: users.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync roles" });
    }
  });

  // ============ MENU ROUTES ============
  app.get("/api/menu", async (req, res) => {
    try {
      const items = await storage.getMenuItems();
      const userPermissions = req.user?.websiteRoles || [];
      
      // Filter based on permissions
      const visibleItems = items.filter(item => {
        if (!item.isVisible) return false;
        if (!item.requiredPermission) return true;
        return userPermissions.includes(item.requiredPermission);
      });

      res.json({ items: visibleItems });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu" });
    }
  });

  // Check department access
  app.get("/api/user/check-access/:department", isAuthenticated, (req, res) => {
    const department = req.params.department as string;
    const userRoles = req.user?.websiteRoles || [];
    
    // Check if user has department permission
    const hasAccess = userRoles.includes(department) || userRoles.includes("admin");
    res.json({ hasAccess, department });
  });

  return httpServer;
}
