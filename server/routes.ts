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

  app.get("/api/auth/status", async (req, res) => {
    const mappings = await storage.getRoleMappings();
    const isBootstrapMode = mappings.length === 0;
    
    res.json({
      discordConfigured,
      authenticated: req.isAuthenticated(),
      isBootstrapMode, // True if no role mappings exist - first user gets admin access
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
      const allWebsiteRoleDefs = await storage.getWebsiteRoles();
      const websiteRoles: string[] = [];
      let staffTier: string | null = null;
      let isStaff = false;

      for (const discordRoleId of newRoles) {
        const mapping = roleMappings.find(m => m.discordRoleId === discordRoleId);
        if (mapping) {
          const permissions = mapping.websitePermission.split(",").map(p => p.trim()).filter(Boolean);
          websiteRoles.push(...permissions);
          if (mapping.staffTier) {
            isStaff = true;
            if (!staffTier || STAFF_HIERARCHY.indexOf(mapping.staffTier as any) < STAFF_HIERARCHY.indexOf(staffTier as any)) {
              staffTier = mapping.staffTier;
            }
          }
        }

        const wsRole = allWebsiteRoleDefs.find(r => r.discordRoleId === discordRoleId);
        if (wsRole) {
          if (wsRole.permissions) {
            websiteRoles.push(...wsRole.permissions);
          }
          if (wsRole.staffTier) {
            isStaff = true;
            if (!staffTier || STAFF_HIERARCHY.indexOf(wsRole.staffTier as any) < STAFF_HIERARCHY.indexOf(staffTier as any)) {
              staffTier = wsRole.staffTier;
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
      const departmentRanks = await storage.getRanksByDepartment(req.params.code);
      const allUsers = await storage.getAllUsers();
      const manualRoster = await storage.getRosterByDepartment(req.params.code);

      const ranksWithDiscordRole = departmentRanks
        .filter(r => r.discordRoleId)
        .sort((a, b) => a.priority - b.priority);

      type RosterEntry = {
        id: string;
        userId: string;
        departmentCode: string;
        rankId: string;
        callsign: string | null;
        callsignNumber: number | null;
        isActive: boolean;
        user: { id: string; username: string; avatar: string | null; discordId: string } | null;
        rank: typeof departmentRanks[0] | undefined;
      };

      const rosterMap = new Map<string, RosterEntry>();

      for (const rank of ranksWithDiscordRole) {
        const matchingUsers = allUsers.filter(u =>
          u.roles && u.roles.includes(rank.discordRoleId!)
        );

        for (const user of matchingUsers) {
          if (rosterMap.has(user.id)) {
            const existing = rosterMap.get(user.id)!;
            if (rank.priority < (existing.rank?.priority || 999)) {
              rosterMap.set(user.id, {
                id: `auto-${user.id}-${rank.id}`,
                userId: user.id,
                departmentCode: req.params.code,
                rankId: rank.id,
                callsign: existing.callsign,
                callsignNumber: existing.callsignNumber,
                isActive: true,
                user: { id: user.id, username: user.username, avatar: user.avatar, discordId: user.discordId },
                rank,
              });
            }
          } else {
            const manual = manualRoster.find(m => m.userId === user.id);
            rosterMap.set(user.id, {
              id: manual?.id || `auto-${user.id}-${rank.id}`,
              userId: user.id,
              departmentCode: req.params.code,
              rankId: rank.id,
              callsign: manual?.callsign || null,
              callsignNumber: manual?.callsignNumber || null,
              isActive: true,
              user: { id: user.id, username: user.username, avatar: user.avatar, discordId: user.discordId },
              rank,
            });
          }
        }
      }

      const autoRoster = Array.from(rosterMap.values())
        .sort((a, b) => (a.rank?.priority || 999) - (b.rank?.priority || 999));

      res.json({ roster: autoRoster, ranks: departmentRanks });
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
      const allWebsiteRoleDefs = await storage.getWebsiteRoles();
      
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
            
            const websiteRolesArr: string[] = [];
            let staffTier: string | null = null;
            let isStaff = false;

            for (const discordRoleId of newRoles) {
              const mapping = roleMappings.find(m => m.discordRoleId === discordRoleId);
              if (mapping) {
                const permissions = mapping.websitePermission.split(",").map(p => p.trim()).filter(Boolean);
                websiteRolesArr.push(...permissions);
                if (mapping.staffTier) {
                  isStaff = true;
                  if (!staffTier || STAFF_HIERARCHY.indexOf(mapping.staffTier as any) < STAFF_HIERARCHY.indexOf(staffTier as any)) {
                    staffTier = mapping.staffTier;
                  }
                }
              }

              const wsRole = allWebsiteRoleDefs.find(r => r.discordRoleId === discordRoleId);
              if (wsRole) {
                if (wsRole.permissions) {
                  websiteRolesArr.push(...wsRole.permissions);
                }
                if (wsRole.staffTier) {
                  isStaff = true;
                  if (!staffTier || STAFF_HIERARCHY.indexOf(wsRole.staffTier as any) < STAFF_HIERARCHY.indexOf(staffTier as any)) {
                    staffTier = wsRole.staffTier;
                  }
                }
              }
            }

            await storage.updateUser(user.discordId, {
              roles: newRoles,
              websiteRoles: Array.from(new Set(websiteRolesArr)),
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
  app.get("/api/user/check-access/:department", isAuthenticated, async (req, res) => {
    const department = req.params.department as string;
    const userRoles = req.user?.websiteRoles || [];
    const staffTier = req.user?.staffTier;
    
    console.log(`[check-access] User: ${req.user?.username}, staffTier: ${staffTier}, department: ${department}`);
    
    // Directors and Executives automatically get access to ALL department portals
    if (staffTier === "director" || staffTier === "executive") {
      console.log(`[check-access] Granting leadership access to ${req.user?.username} (${staffTier})`);
      return res.json({ hasAccess: true, department, isLeadership: true });
    }
    
    // Check if user has department permission (from Discord role mappings)
    let hasAccess = userRoles.includes(department) || userRoles.includes("admin");
    
    // Also check website role assignments
    const roleAssignments = await storage.getUserRoleAssignments(req.user!.id);
    for (const assignment of roleAssignments) {
      const role = await storage.getWebsiteRole(assignment.roleId);
      if (role?.permissions?.includes(department) || role?.permissions?.includes("admin")) {
        hasAccess = true;
        break;
      }
    }
    
    // Check if user is leadership in this department (has leadership rank)
    const rosterMember = await storage.getRosterMemberByUser(req.user!.id, department);
    let isLeadership = false;
    if (rosterMember) {
      const rank = await storage.getRank(rosterMember.rankId);
      isLeadership = rank?.isLeadership || false;
    }
    
    res.json({ hasAccess, department, isLeadership });
  });

  // ============ WEBSITE ROLES ROUTES ============
  app.get("/api/admin/website-roles", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const roles = await storage.getWebsiteRoles();
      res.json({ roles });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch website roles" });
    }
  });

  app.post("/api/admin/website-roles", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const role = await storage.createWebsiteRole(req.body);
      res.json({ role });
    } catch (error) {
      res.status(500).json({ error: "Failed to create website role" });
    }
  });

  app.put("/api/admin/website-roles/:id", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const role = await storage.updateWebsiteRole(req.params.id as string, req.body);
      res.json({ role });
    } catch (error) {
      res.status(500).json({ error: "Failed to update website role" });
    }
  });

  app.delete("/api/admin/website-roles/:id", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      await storage.deleteWebsiteRole(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete website role" });
    }
  });

  // ============ USER ROLE ASSIGNMENT ROUTES ============
  app.get("/api/admin/users/:userId/roles", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const assignments = await storage.getUserRoleAssignments(req.params.userId as string);
      const roles = await storage.getWebsiteRoles();
      const assignedRoles = assignments.map(a => roles.find(r => r.id === a.roleId)).filter(Boolean);
      res.json({ roles: assignedRoles, assignments });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  app.post("/api/admin/users/:userId/roles", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const assignment = await storage.assignRoleToUser({
        userId: req.params.userId as string,
        roleId: req.body.roleId,
        assignedBy: req.user!.id,
      });
      res.json({ assignment });
    } catch (error) {
      res.status(500).json({ error: "Failed to assign role" });
    }
  });

  app.delete("/api/admin/users/:userId/roles/:roleId", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      await storage.removeRoleFromUser(req.params.userId as string, req.params.roleId as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove role" });
    }
  });

  app.put("/api/admin/users/:userId", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId as string);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updated = await storage.updateUser(user.discordId, req.body);
      if (updated) {
        const { accessToken, refreshToken, ...safeUser } = updated;
        res.json({ user: safeUser });
      } else {
        res.status(404).json({ error: "Failed to update user" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // ============ ALL DEPARTMENT RANKS (ADMIN) ============
  app.get("/api/admin/department-ranks", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      const result: Record<string, { department: typeof departments[0]; ranks: any[] }> = {};
      for (const dept of departments) {
        const ranks = await storage.getRanksByDepartment(dept.code);
        result[dept.code] = { department: dept, ranks };
      }
      res.json({ departments: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch department ranks" });
    }
  });

  // ============ DEPARTMENT RANK MANAGEMENT ROUTES ============
  app.post("/api/departments/:code/ranks", isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code as string;
      
      // Check if user has leadership access
      const staffTier = req.user?.staffTier;
      let isLeadership = staffTier === "director" || staffTier === "executive";
      
      if (!isLeadership) {
        const rosterMember = await storage.getRosterMemberByUser(req.user!.id, code);
        if (rosterMember) {
          const rank = await storage.getRank(rosterMember.rankId);
          isLeadership = rank?.isLeadership || false;
        }
      }
      
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      
      const rank = await storage.createRank({
        ...req.body,
        departmentCode: code,
      });
      res.json({ rank });
    } catch (error) {
      res.status(500).json({ error: "Failed to create rank" });
    }
  });

  app.put("/api/departments/:code/ranks/:rankId", isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code as string;
      
      // Check if user has leadership access
      const staffTier = req.user?.staffTier;
      let isLeadership = staffTier === "director" || staffTier === "executive";
      
      if (!isLeadership) {
        const rosterMember = await storage.getRosterMemberByUser(req.user!.id, code);
        if (rosterMember) {
          const rank = await storage.getRank(rosterMember.rankId);
          isLeadership = rank?.isLeadership || false;
        }
      }
      
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      
      const rank = await storage.updateRank(req.params.rankId as string, req.body);
      res.json({ rank });
    } catch (error) {
      res.status(500).json({ error: "Failed to update rank" });
    }
  });

  app.delete("/api/departments/:code/ranks/:rankId", isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code as string;
      
      // Check if user has leadership access
      const staffTier = req.user?.staffTier;
      let isLeadership = staffTier === "director" || staffTier === "executive";
      
      if (!isLeadership) {
        const rosterMember = await storage.getRosterMemberByUser(req.user!.id, code);
        if (rosterMember) {
          const rank = await storage.getRank(rosterMember.rankId);
          isLeadership = rank?.isLeadership || false;
        }
      }
      
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      
      // Soft delete not available, just delete
      // Note: This should probably check for roster members using this rank first
      await storage.updateRank(req.params.rankId as string, { priority: -1 }); // Mark as deleted
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete rank" });
    }
  });

  return httpServer;
}
