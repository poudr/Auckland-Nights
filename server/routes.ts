import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hasPermission, meetsStaffTier } from "./auth";
import { seedDatabase } from "./seed";
import { STAFF_HIERARCHY } from "@shared/schema";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

function generateNextQid(existingQids: Set<string>): string {
  for (let num = 1; num <= 99; num++) {
    for (let charCode = 65; charCode <= 90; charCode++) {
      const qid = `ACP${num.toString().padStart(2, "0")}${String.fromCharCode(charCode)}`;
      if (!existingQids.has(qid)) {
        return qid;
      }
    }
  }
  return `ACP99Z`;
}

async function isUserDepartmentLeadership(user: any, departmentCode: string): Promise<boolean> {
  const tier = user?.staffTier;
  if (tier && ["director", "executive", "manager"].includes(tier)) return true;
  
  const rosterMember = await storage.getRosterMemberByUser(user.id, departmentCode);
  if (rosterMember) {
    const rank = await storage.getRank(rosterMember.rankId);
    if (rank?.isLeadership) return true;
  }
  
  if (user?.roles) {
    const deptRanks = await storage.getRanksByDepartment(departmentCode);
    const leadershipDiscordRoleIds = deptRanks
      .filter((r: any) => r.isLeadership && r.discordRoleId)
      .map((r: any) => r.discordRoleId!);
    if (user.roles.some((role: string) => leadershipDiscordRoleIds.includes(role))) return true;
  }
  
  return false;
}

async function canManageForm(user: any, formId: string, departmentCode: string): Promise<boolean> {
  if (await isUserDepartmentLeadership(user, departmentCode)) return true;
  return await storage.isFormManager(formId, user.id);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  async function logAuditEvent(userId: string | null, action: string, category: string, details?: string, targetId?: string, targetType?: string) {
    try {
      await storage.createAuditLog({ userId, action, category, details, targetId, targetType });
    } catch (e) {
      console.error("Failed to log audit event:", e);
    }
  }

  // Setup authentication
  setupAuth(app);

  // Seed database on startup
  await seedDatabase();

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Check if Discord OAuth is configured
  const discordConfigured = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);

  // ============ SEO ROUTES ============

  // Serve OG meta tags for social media crawlers (works in both dev and production)
  app.get("/{*path}", async (req, res, next) => {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const isCrawler = /discordbot|twitterbot|facebookexternalhit|linkedinbot|slackbot|whatsapp|telegrambot|googlebot|bingbot/i.test(ua);
    if (!isCrawler) return next();

    try {
      const ogImageSetting = await storage.getAdminSetting("og_image_url");
      const faviconSetting = await storage.getAdminSetting("favicon_url");

      const pagePath = req.path === "/" ? "home" : req.path.replace(/^\//, "").split("/")[0];
      const titleSetting = await storage.getAdminSetting(`seo_${pagePath}_title`);
      const descSetting = await storage.getAdminSetting(`seo_${pagePath}_description`);

      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
      const baseUrl = `${protocol}://${host}`;

      const title = titleSetting?.value || "Tamaki Makaurau RP - Auckland's Premier GTA V Roleplay";
      const description = descSetting?.value || "Join the most authentic New Zealand GTA V Roleplay server. Write your story in the streets of Auckland with custom jobs, vehicles, and a dedicated community.";
      const ogImage = ogImageSetting?.value
        ? (ogImageSetting.value.startsWith("http") ? ogImageSetting.value : `${baseUrl}${ogImageSetting.value}`)
        : `${baseUrl}/opengraph.jpg`;
      const favicon = faviconSetting?.value || "/favicon.png";

      res.status(200).set({ "Content-Type": "text/html" }).end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${baseUrl}${req.path}" />
  <meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="icon" href="${favicon}" />
</head>
<body></body>
</html>`);
    } catch (e) {
      next();
    }
  });

  app.get("/api/seo/:page", async (req, res) => {
    const page = req.params.page;
    const titleSetting = await storage.getAdminSetting(`seo_${page}_title`);
    const descSetting = await storage.getAdminSetting(`seo_${page}_description`);
    const faviconSetting = await storage.getAdminSetting("favicon_url");
    const ogImageSetting = await storage.getAdminSetting("og_image_url");
    res.json({
      title: titleSetting?.value || null,
      description: descSetting?.value || null,
      faviconUrl: faviconSetting?.value || null,
      ogImageUrl: ogImageSetting?.value || null,
    });
  });

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
      const collectedTiers: string[] = [];
      let staffTier: string | null = null;
      let isStaff = false;

      for (const discordRoleId of newRoles) {
        const mapping = roleMappings.find(m => m.discordRoleId === discordRoleId);
        if (mapping) {
          const permissions = mapping.websitePermission.split(",").map(p => p.trim()).filter(Boolean);
          websiteRoles.push(...permissions);
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
            websiteRoles.push(...wsRole.permissions);
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

      const updatedUser = await storage.updateUser(user.discordId, {
        roles: newRoles,
        websiteRoles: Array.from(new Set(websiteRoles)),
        isStaff,
        staffTier,
        staffTiers: Array.from(new Set(collectedTiers)),
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

  // ============ PROFILE ROUTES ============

  app.get("/api/profile/:discordId", async (req, res) => {
    try {
      const discordId = req.params.discordId as string;
      const profileUser = await storage.getUserByDiscordId(discordId);
      if (!profileUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { accessToken: _, refreshToken: __, ...safeUser } = profileUser;

      const allDepartments = await storage.getDepartments();
      const memberships: Array<{
        department: { code: string; name: string; color: string; icon: string | null };
        rank: { name: string; abbreviation: string | null; isLeadership: boolean; priority: number } | null;
        callsign: string | null;
        qid: string | null;
      }> = [];

      for (const dept of allDepartments) {
        const deptRanks = await storage.getRanksByDepartment(dept.code);
        const ranksWithDiscordRole = deptRanks.filter(r => r.discordRoleId);

        let bestRank: typeof deptRanks[0] | null = null;
        for (const rank of ranksWithDiscordRole) {
          if (profileUser.roles && profileUser.roles.includes(rank.discordRoleId!)) {
            if (!bestRank || rank.priority < bestRank.priority) {
              bestRank = rank;
            }
          }
        }

        if (bestRank) {
          const manualRoster = await storage.getRosterByDepartment(dept.code);
          const manual = manualRoster.find(m => m.userId === profileUser.id);
          memberships.push({
            department: { code: dept.code, name: dept.name, color: dept.color, icon: dept.icon },
            rank: { name: bestRank.name, abbreviation: bestRank.abbreviation, isLeadership: bestRank.isLeadership ?? false, priority: bestRank.priority },
            callsign: manual?.callsign || null,
            qid: manual?.qid || null,
          });
        }
      }

      let openApplications: any[] = [];
      const viewer = req.user;
      const isStaffViewer = viewer?.staffTier && ["director", "executive", "manager", "administrator"].includes(viewer.staffTier);

      if (isStaffViewer) {
        const allSubmissions = await storage.getSubmissionsByUser(profileUser.id);
        const openSubs = allSubmissions.filter(s => s.status === "pending" || s.status === "under_review");

        for (const sub of openSubs) {
          const form = await storage.getApplicationForm(sub.formId);
          const dept = form?.departmentCode ? await storage.getDepartment(form.departmentCode) : null;
          openApplications.push({
            id: sub.id,
            status: sub.status,
            formTitle: form?.title || "Unknown",
            departmentName: dept?.name || null,
            departmentCode: dept?.code || null,
            createdAt: sub.createdAt,
          });
        }

        const supportSubs = await storage.getSupportSubmissionsByUser(profileUser.id);
        const openSupportSubs = supportSubs.filter(s => s.status === "pending" || s.status === "under_review");
        for (const sub of openSupportSubs) {
          const form = await storage.getSupportForm(sub.formId);
          openApplications.push({
            id: sub.id,
            status: sub.status,
            formTitle: form?.title || "Unknown",
            departmentName: null,
            departmentCode: null,
            createdAt: sub.createdAt,
          });
        }
      }

      res.json({
        user: safeUser,
        memberships,
        openApplications,
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
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
            displayName: member.displayName,
            avatar: member.avatar,
            discordId: member.discordId,
            staffTier: member.staffTier,
            staffTiers: member.staffTiers || [member.staffTier],
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
      const code = req.params.code as string;
      const departmentRanks = await storage.getRanksByDepartment(code);
      const allUsers = await storage.getAllUsers();
      const manualRoster = await storage.getRosterByDepartment(code);

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
        qid: string | null;
        isActive: boolean;
        user: { id: string; username: string; displayName: string | null; avatar: string | null; discordId: string; roles: string[] | null; createdAt: Date | null } | null;
        rank: typeof departmentRanks[0] | undefined;
        squadId?: string | null;
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
                departmentCode: code,
                rankId: rank.id,
                callsign: existing.callsign,
                callsignNumber: existing.callsignNumber,
                qid: existing.qid,
                isActive: true,
                user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, discordId: user.discordId, roles: user.roles, createdAt: user.createdAt },
                rank,
                squadId: existing.squadId,
              });
            }
          } else {
            const manual = manualRoster.find(m => m.userId === user.id);
            rosterMap.set(user.id, {
              id: manual?.id || `auto-${user.id}-${rank.id}`,
              userId: user.id,
              departmentCode: code,
              rankId: rank.id,
              callsign: manual?.callsign || null,
              callsignNumber: manual?.callsignNumber || null,
              qid: manual?.qid || null,
              isActive: true,
              user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, discordId: user.discordId, roles: user.roles, createdAt: user.createdAt },
              rank,
              squadId: manual?.squadId || null,
            });
          }
        }
      }

      const autoRoster = Array.from(rosterMap.values())
        .sort((a, b) => {
          const rankDiff = (a.rank?.priority || 999) - (b.rank?.priority || 999);
          if (rankDiff !== 0) return rankDiff;
          const aTime = a.user?.createdAt ? new Date(a.user.createdAt).getTime() : 0;
          const bTime = b.user?.createdAt ? new Date(b.user.createdAt).getTime() : 0;
          return aTime - bTime;
        });

      if (code === "police") {
        const existingQids = new Set(
          manualRoster.filter(m => m.qid).map(m => m.qid!)
        );

        for (const entry of autoRoster) {
          if (!entry.qid) {
            const nextQid = generateNextQid(existingQids);
            entry.qid = nextQid;
            existingQids.add(nextQid);

            const manual = manualRoster.find(m => m.userId === entry.userId);
            if (manual) {
              await storage.updateRosterMember(manual.id, { qid: nextQid });
            } else {
              await storage.createRosterMember({
                userId: entry.userId,
                departmentCode: code,
                rankId: entry.rankId,
                qid: nextQid,
              });
            }
          }
        }
      }

      if (code === "ems") {
        const EMS_CALLSIGN_CONFIG: Record<string, { prefix: string; start: number; end: number }> = {
          "District Operations Manager": { prefix: "OSCAR", start: 20, end: 20 },
          "Group Operations Manager": { prefix: "OSCAR", start: 21, end: 29 },
          "Watch Operations Manager": { prefix: "MIKE", start: 20, end: 29 },
        };

        const activeUserIds = new Set(autoRoster.map(e => e.userId));
        const existingCallsigns = new Set<string>();
        for (const m of manualRoster) {
          if (m.callsign && activeUserIds.has(m.userId)) existingCallsigns.add(m.callsign);
        }
        for (const entry of autoRoster) {
          if (entry.callsign) existingCallsigns.add(entry.callsign);
        }

        for (const entry of autoRoster) {
          const rankName = entry.rank?.name || "";
          const config = EMS_CALLSIGN_CONFIG[rankName];
          if (!config) continue;

          if (!entry.callsign) {
            for (let num = config.start; num <= config.end; num++) {
              const callsign = `${config.prefix}${num}`;
              if (!existingCallsigns.has(callsign)) {
                entry.callsign = callsign;
                existingCallsigns.add(callsign);

                const manual = manualRoster.find(m => m.userId === entry.userId);
                if (manual) {
                  await storage.updateRosterMember(manual.id, { callsign });
                } else {
                  await storage.createRosterMember({
                    userId: entry.userId,
                    departmentCode: code,
                    rankId: entry.rankId,
                    callsign,
                  });
                }
                break;
              }
            }
          }
        }
      }

      let emsCsoRoleId: string | null = null;
      if (code === "ems") {
        const csoSetting = await storage.getAdminSetting("ems_cso_role_id");
        emsCsoRoleId = csoSetting || null;
      }

      res.json({ roster: autoRoster, ranks: departmentRanks, emsCsoRoleId });
    } catch (error) {
      console.error("Roster fetch error:", error);
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

  // ============ APPLICATION FORM ROUTES ============

  app.get("/api/departments/:code/forms", isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code as string;
      const forms = await storage.getApplicationFormsByDepartment(code);
      const activeForms = forms.filter(f => f.isActive);
      res.json({ forms: activeForms });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch forms" });
    }
  });

  app.get("/api/departments/:code/whitelist-form", async (req, res) => {
    try {
      const code = req.params.code as string;
      const forms = await storage.getApplicationFormsByDepartment(code);
      const whitelistForm = forms.find(f => f.isActive && f.isWhitelist);
      if (!whitelistForm) return res.json({ form: null });
      const questions = await storage.getQuestionsByForm(whitelistForm.id);
      res.json({ form: whitelistForm, questions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch whitelist form" });
    }
  });

  app.get("/api/forms/:id", isAuthenticated, async (req, res) => {
    try {
      const form = await storage.getApplicationForm(req.params.id);
      if (!form) return res.status(404).json({ error: "Form not found" });
      const questions = await storage.getQuestionsByForm(form.id);
      res.json({ form, questions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form" });
    }
  });

  app.post("/api/departments/:code/forms", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const code = req.params.code as string;
      if (!(await isUserDepartmentLeadership(user, code))) {
        return res.status(403).json({ error: "Only leadership can create forms" });
      }

      const { title, description, questions, rolesOnAccept, isWhitelist, notifyRanks } = req.body;

      if (isWhitelist) {
        const existingForms = await storage.getApplicationFormsByDepartment(code);
        for (const ef of existingForms) {
          if (ef.isWhitelist) {
            await storage.updateApplicationForm(ef.id, { isWhitelist: false });
          }
        }
      }

      const form = await storage.createApplicationForm({
        departmentCode: code,
        title,
        description: description || null,
        rolesOnAccept: rolesOnAccept ? JSON.stringify(rolesOnAccept) : null,
        notifyRanks: notifyRanks && Array.isArray(notifyRanks) && notifyRanks.length > 0 ? JSON.stringify(notifyRanks) : null,
        isWhitelist: isWhitelist || false,
        createdBy: user.id,
        isActive: true,
      });

      if (questions && Array.isArray(questions)) {
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await storage.createApplicationQuestion({
            formId: form.id,
            label: q.label,
            type: q.type,
            options: q.options ? JSON.stringify(q.options) : null,
            isRequired: q.isRequired !== false,
            priority: i,
          });
        }
      }

      const createdQuestions = await storage.getQuestionsByForm(form.id);
      res.json({ form, questions: createdQuestions });
    } catch (error) {
      console.error("Create form error:", error);
      res.status(500).json({ error: "Failed to create form" });
    }
  });

  app.put("/api/forms/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const existingFormCheck = await storage.getApplicationForm(req.params.id);
      if (!existingFormCheck) {
        return res.status(404).json({ error: "Form not found" });
      }
      if (!(await canManageForm(user, req.params.id, existingFormCheck.departmentCode))) {
        return res.status(403).json({ error: "Only leadership or assigned managers can edit forms" });
      }

      const { title, description, questions, rolesOnAccept, isWhitelist, notifyRanks } = req.body;

      if (isWhitelist) {
        const existingForm = existingFormCheck;
        if (existingForm) {
          const existingForms = await storage.getApplicationFormsByDepartment(existingForm.departmentCode);
          for (const ef of existingForms) {
            if (ef.isWhitelist && ef.id !== req.params.id) {
              await storage.updateApplicationForm(ef.id, { isWhitelist: false });
            }
          }
        }
      }

      const form = await storage.updateApplicationForm(req.params.id, { 
        title, 
        description,
        rolesOnAccept: rolesOnAccept ? JSON.stringify(rolesOnAccept) : null,
        notifyRanks: notifyRanks !== undefined ? (Array.isArray(notifyRanks) && notifyRanks.length > 0 ? JSON.stringify(notifyRanks) : null) : undefined,
        isWhitelist: isWhitelist !== undefined ? isWhitelist : undefined,
      });
      if (!form) return res.status(404).json({ error: "Form not found" });

      if (questions && Array.isArray(questions)) {
        const existingQuestions = await storage.getQuestionsByForm(form.id);
        
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          if (i < existingQuestions.length) {
            await storage.updateApplicationQuestion(existingQuestions[i].id, {
              label: q.label,
              type: q.type,
              options: q.options ? JSON.stringify(q.options) : null,
              isRequired: q.isRequired !== false,
              priority: i,
            });
          } else {
            await storage.createApplicationQuestion({
              formId: form.id,
              label: q.label,
              type: q.type,
              options: q.options ? JSON.stringify(q.options) : null,
              isRequired: q.isRequired !== false,
              priority: i,
            });
          }
        }
        
        for (let i = questions.length; i < existingQuestions.length; i++) {
          await storage.deleteApplicationQuestion(existingQuestions[i].id);
        }
      }

      const updatedQuestions = await storage.getQuestionsByForm(form.id);
      res.json({ form, questions: updatedQuestions });
    } catch (error) {
      res.status(500).json({ error: "Failed to update form" });
    }
  });

  app.delete("/api/forms/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const formToDelete = await storage.getApplicationForm(req.params.id);
      if (!formToDelete) {
        return res.status(404).json({ error: "Form not found" });
      }
      if (!(await canManageForm(user, req.params.id, formToDelete.departmentCode))) {
        return res.status(403).json({ error: "Only leadership or assigned managers can delete forms" });
      }
      await storage.deleteApplicationForm(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete form" });
    }
  });

  // ============ APPLICATION QUESTION REORDER ============
  app.post("/api/forms/:formId/questions/reorder", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const formId = req.params.formId;
      const { questionId, direction } = req.body;

      const form = await storage.getApplicationForm(formId);
      if (!form) return res.status(404).json({ error: "Form not found" });

      if (!(await canManageForm(user, formId, form.departmentCode))) {
        return res.status(403).json({ error: "Only leadership or assigned managers can reorder questions" });
      }

      const questions = await storage.getQuestionsByForm(formId);
      const sortedQuestions = [...questions].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      const currentIndex = sortedQuestions.findIndex(q => q.id === questionId);
      if (currentIndex === -1) return res.status(404).json({ error: "Question not found" });

      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= sortedQuestions.length) {
        return res.status(400).json({ error: "Cannot move question further in that direction" });
      }

      const currentPriority = sortedQuestions[currentIndex].priority ?? currentIndex;
      const swapPriority = sortedQuestions[swapIndex].priority ?? swapIndex;
      await storage.updateApplicationQuestion(sortedQuestions[currentIndex].id, { priority: swapPriority });
      await storage.updateApplicationQuestion(sortedQuestions[swapIndex].id, { priority: currentPriority });

      const updatedQuestions = await storage.getQuestionsByForm(formId);
      res.json({ questions: updatedQuestions });
    } catch (error) {
      console.error("Reorder questions error:", error);
      res.status(500).json({ error: "Failed to reorder questions" });
    }
  });

  // ============ APPLICATION SUBMISSION ROUTES ============

  app.get("/api/departments/:code/submissions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const code = req.params.code as string;
      const isLeadership = await isUserDepartmentLeadership(user, code);

      const managedForms = await storage.getFormManagersByUser(user.id);
      const managedFormIds = managedForms.map(m => m.formId);

      if (isLeadership) {
        const submissions = await storage.getSubmissionsByDepartment(code);
        const enriched = await Promise.all(submissions.map(async (sub) => {
          const form = await storage.getApplicationForm(sub.formId);
          const submitter = await storage.getUser(sub.userId);
          return {
            ...sub,
            formTitle: form?.title || "Unknown Form",
            username: submitter?.username || "Unknown",
            displayName: submitter?.displayName || null,
            avatar: submitter?.avatar || null,
            discordId: submitter?.discordId || "",
          };
        }));
        return res.json({ submissions: enriched });
      }

      const allSubmissions = await storage.getSubmissionsByDepartment(code);
      const managedSubmissions = allSubmissions.filter(s => managedFormIds.includes(s.formId));
      const userSubmissions = await storage.getSubmissionsByUser(user.id);
      const deptUserSubmissions = userSubmissions.filter(s => s.departmentCode === code);

      const combined = [...managedSubmissions, ...deptUserSubmissions.filter(s => !managedSubmissions.find(ms => ms.id === s.id))];

      const enriched = await Promise.all(combined.map(async (sub) => {
        const form = await storage.getApplicationForm(sub.formId);
        const submitter = await storage.getUser(sub.userId);
        return {
          ...sub,
          formTitle: form?.title || "Unknown Form",
          username: submitter?.username || "Unknown",
          displayName: submitter?.displayName || null,
          avatar: submitter?.avatar || null,
          discordId: submitter?.discordId || "",
        };
      }));
      res.json({ submissions: enriched });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.get("/api/submissions/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const isLeadership = await isUserDepartmentLeadership(user, submission.departmentCode);
      const isManager = !isLeadership && await storage.isFormManager(submission.formId, user.id);
      if (submission.userId !== user.id && !isLeadership && !isManager) {
        return res.status(403).json({ error: "Access denied" });
      }

      const form = await storage.getApplicationForm(submission.formId);
      const questions = form ? await storage.getQuestionsByForm(form.id) : [];
      const messages = await storage.getMessagesBySubmission(submission.id);
      const submitter = await storage.getUser(submission.userId);

      const enrichedMessages = await Promise.all(messages.map(async (msg) => {
        const sender = await storage.getUser(msg.userId);
        return {
          ...msg,
          username: sender?.username || "Unknown",
          displayName: sender?.displayName || null,
          avatar: sender?.avatar || null,
          discordId: sender?.discordId || "",
          staffTier: sender?.staffTier || null,
        };
      }));

      res.json({
        submission,
        form,
        questions,
        messages: enrichedMessages,
        submitter: submitter ? { username: submitter.username, displayName: submitter.displayName, avatar: submitter.avatar, discordId: submitter.discordId } : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  app.post("/api/departments/:code/submissions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const code = req.params.code as string;
      const { formId, answers } = req.body;

      const targetForm = await storage.getApplicationForm(formId);
      if (!targetForm || targetForm.departmentCode !== code) {
        return res.status(400).json({ error: "Invalid form for this department" });
      }

      const userWebsiteRoles = user.websiteRoles || [];
      const hasDeptAccess = userWebsiteRoles.includes(code) ||
        user.staffTier === "director" || user.staffTier === "executive";
      if (!hasDeptAccess && !targetForm.isWhitelist) {
        return res.status(403).json({ error: "You can only submit whitelist applications for departments you don't have access to" });
      }

      const submission = await storage.createSubmission({
        formId,
        userId: user.id,
        departmentCode: code,
        status: "pending",
        answers: JSON.stringify(answers),
      });

      const form = await storage.getApplicationForm(formId);
      const dept = await storage.getDepartment(code);

      let recipientUserIds: string[] = [];
      let useTargetedNotifications = false;

      if (form?.notifyRanks) {
        try {
          const rankIds: string[] = JSON.parse(form.notifyRanks);
          if (Array.isArray(rankIds) && rankIds.length > 0) {
            const rosterList = await storage.getRosterByDepartment(code);
            const matchingMembers = rosterList.filter(m => rankIds.includes(m.rankId));
            recipientUserIds = matchingMembers.map(m => m.userId);
            useTargetedNotifications = true;
          }
        } catch {}
      }

      if (!useTargetedNotifications) {
        const allUsers = await storage.getAllUsers();
        recipientUserIds = allUsers
          .filter(u => u.staffTier && ["director", "executive", "manager"].includes(u.staffTier))
          .map(u => u.id);
      }

      const uniqueRecipients = [...new Set(recipientUserIds)];
      for (const recipientId of uniqueRecipients) {
        await storage.createNotification({
          userId: recipientId,
          type: "application_submitted",
          title: "New Application",
          message: `${user.displayName || user.username} submitted an application for ${dept?.name || code}: ${form?.title || "Unknown"}`,
          link: `/departments/${code}/applications?submission=${submission.id}`,
          relatedId: submission.id,
          isRead: false,
        });
      }

      res.json({ submission });
    } catch (error) {
      console.error("Submit application error:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  app.put("/api/submissions/:id/status", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { status, rolesToAssign } = req.body;
      const submission = await storage.updateSubmission(req.params.id, { status });
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      if (!(await canManageForm(user, submission.formId, submission.departmentCode))) {
        return res.status(403).json({ error: "Only leadership or assigned managers can change status" });
      }

      const form = await storage.getApplicationForm(submission.formId);
      const dept = await storage.getDepartment(submission.departmentCode);

      const roleAssignmentResults: { discordRoles: string[]; websiteRoles: string[]; errors: string[] } = {
        discordRoles: [],
        websiteRoles: [],
        errors: [],
      };

      if (status === "accepted" && rolesToAssign) {
        const { discordRoleIds, websiteRoles: newWebsiteRoles } = rolesToAssign as {
          discordRoleIds?: string[];
          websiteRoles?: string[];
        };

        const deptCode = submission.departmentCode;
        const deptRanks = await storage.getRanksByDepartment(deptCode);
        const allowedDiscordRoleIds = new Set(
          deptRanks.filter(r => r.discordRoleId).map(r => r.discordRoleId!)
        );
        if (deptCode === "police") {
          const aosRanks = await storage.getRanksByDepartment("aos");
          aosRanks.filter(r => r.discordRoleId).forEach(r => allowedDiscordRoleIds.add(r.discordRoleId!));
        }
        if (deptCode === "ems") {
          const sertRanks = await storage.getRanksByDepartment("sert");
          sertRanks.filter(r => r.discordRoleId).forEach(r => allowedDiscordRoleIds.add(r.discordRoleId!));
        }

        const allowedWebsiteRoles = new Set([deptCode, ...(deptCode === "police" ? ["aos"] : []), ...(deptCode === "ems" ? ["sert"] : [])]);

        const validDiscordRoleIds = (discordRoleIds || []).filter(id => allowedDiscordRoleIds.has(id));
        const validWebsiteRoles = (newWebsiteRoles || []).filter(r => allowedWebsiteRoles.has(r));

        const applicant = await storage.getUser(submission.userId);
        if (applicant && applicant.discordId) {
          if (validDiscordRoleIds.length > 0) {
            const botToken = process.env.DISCORD_BOT_TOKEN;
            const guildId = process.env.DISCORD_GUILD_ID;
            if (botToken && guildId) {
              for (const roleId of validDiscordRoleIds) {
                try {
                  const response = await fetch(
                    `https://discord.com/api/v10/guilds/${guildId}/members/${applicant.discordId}/roles/${roleId}`,
                    {
                      method: "PUT",
                      headers: {
                        Authorization: `Bot ${botToken}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  if (response.ok || response.status === 204) {
                    roleAssignmentResults.discordRoles.push(roleId);
                  } else {
                    const errorText = await response.text();
                    console.error(`Failed to assign Discord role ${roleId}:`, response.status, errorText);
                    roleAssignmentResults.errors.push(`Discord role ${roleId}: ${response.status}`);
                  }
                } catch (err) {
                  console.error(`Error assigning Discord role ${roleId}:`, err);
                  roleAssignmentResults.errors.push(`Discord role ${roleId}: network error`);
                }
              }
            } else {
              roleAssignmentResults.errors.push("Discord bot token or guild ID not configured");
            }
          }

          if (validWebsiteRoles.length > 0) {
            const currentWebsiteRoles = applicant.websiteRoles || [];
            const mergedRoles = [...new Set([...currentWebsiteRoles, ...validWebsiteRoles])];
            await storage.updateUser(applicant.discordId, { websiteRoles: mergedRoles });
            roleAssignmentResults.websiteRoles = validWebsiteRoles;

            const allMappings = await storage.getRoleMappings();
            const botToken = process.env.DISCORD_BOT_TOKEN;
            const guildId = process.env.DISCORD_GUILD_ID;
            if (botToken && guildId) {
              for (const webRole of validWebsiteRoles) {
                const mapping = allMappings.find(m => m.websitePermission === webRole);
                if (mapping && !roleAssignmentResults.discordRoles.includes(mapping.discordRoleId)) {
                  try {
                    const response = await fetch(
                      `https://discord.com/api/v10/guilds/${guildId}/members/${applicant.discordId}/roles/${mapping.discordRoleId}`,
                      {
                        method: "PUT",
                        headers: {
                          Authorization: `Bot ${botToken}`,
                          "Content-Type": "application/json",
                        },
                      }
                    );
                    if (response.ok || response.status === 204) {
                      roleAssignmentResults.discordRoles.push(mapping.discordRoleId);
                    } else {
                      const errorText = await response.text();
                      console.error(`Failed to assign general Discord role ${mapping.discordRoleId}:`, response.status, errorText);
                      roleAssignmentResults.errors.push(`General role ${mapping.discordRoleId}: ${response.status}`);
                    }
                  } catch (err) {
                    console.error(`Error assigning general Discord role ${mapping.discordRoleId}:`, err);
                    roleAssignmentResults.errors.push(`General role ${mapping.discordRoleId}: network error`);
                  }
                }
              }
            }
          }
        }
      }

      await storage.createNotification({
        userId: submission.userId,
        type: "status_change",
        title: "Application Updated",
        message: `Your application for ${dept?.name || submission.departmentCode} (${form?.title || ""}) has been ${status}.`,
        link: `/departments/${submission.departmentCode}/applications?submission=${submission.id}`,
        relatedId: submission.id,
        isRead: false,
      });

      res.json({ submission, roleAssignment: roleAssignmentResults });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // ============ APPLICATION MESSAGE ROUTES ============

  app.post("/api/submissions/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const isLeadership = await isUserDepartmentLeadership(user, submission.departmentCode);
      const isManager = !isLeadership && await storage.isFormManager(submission.formId, user.id);
      if (submission.userId !== user.id && !isLeadership && !isManager) {
        return res.status(403).json({ error: "Access denied" });
      }

      const message = await storage.createMessage({
        submissionId: submission.id,
        userId: user.id,
        content: req.body.content,
      });

      const form = await storage.getApplicationForm(submission.formId);
      const dept = await storage.getDepartment(submission.departmentCode);

      if ((isLeadership || isManager) && submission.userId !== user.id) {
        await storage.createNotification({
          userId: submission.userId,
          type: "application_response",
          title: "Application Response",
          message: `${user.displayName || user.username} responded to your ${dept?.name || submission.departmentCode} application (${form?.title || ""}).`,
          link: `/departments/${submission.departmentCode}/applications?submission=${submission.id}`,
          relatedId: submission.id,
          isRead: false,
        });
      } else if (!isLeadership) {
        const leadershipUsers = await storage.getAllUsers();
        const leaders = leadershipUsers.filter(u =>
          u.staffTier && ["director", "executive", "manager"].includes(u.staffTier)
        );
        for (const leader of leaders) {
          await storage.createNotification({
            userId: leader.id,
            type: "application_response",
            title: "Application Reply",
            message: `${user.displayName || user.username} replied to their ${dept?.name || submission.departmentCode} application (${form?.title || ""}).`,
            link: `/departments/${submission.departmentCode}/applications?submission=${submission.id}`,
            relatedId: submission.id,
            isRead: false,
          });
        }
      }

      res.json({
        ...message,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        discordId: user.discordId,
        staffTier: user.staffTier,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.delete("/api/submissions/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      if (!(await canManageForm(user, submission.formId, submission.departmentCode))) {
        return res.status(403).json({ error: "Only leadership or assigned managers can delete applications" });
      }

      await storage.deleteSubmission(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete submission error:", error);
      res.status(500).json({ error: "Failed to delete application" });
    }
  });

  // ============ FORM MANAGERS ROUTES ============

  app.get("/api/forms/:id/managers", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const form = await storage.getApplicationForm(req.params.id);
      if (!form) return res.status(404).json({ error: "Form not found" });

      if (!(await isUserDepartmentLeadership(user, form.departmentCode))) {
        return res.status(403).json({ error: "Only leadership can view form managers" });
      }

      const managers = await storage.getFormManagers(req.params.id);
      const enriched = await Promise.all(managers.map(async (m) => {
        const u = await storage.getUser(m.userId);
        return {
          ...m,
          username: u?.username || "Unknown",
          displayName: u?.displayName || null,
          avatar: u?.avatar || null,
          discordId: u?.discordId || "",
        };
      }));
      res.json({ managers: enriched });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form managers" });
    }
  });

  app.post("/api/forms/:id/managers", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const form = await storage.getApplicationForm(req.params.id);
      if (!form) return res.status(404).json({ error: "Form not found" });

      if (!(await isUserDepartmentLeadership(user, form.departmentCode))) {
        return res.status(403).json({ error: "Only leadership can assign form managers" });
      }

      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const existing = await storage.isFormManager(req.params.id, userId);
      if (existing) return res.status(400).json({ error: "User is already a manager for this form" });

      const manager = await storage.addFormManager({
        formId: req.params.id,
        userId,
        assignedBy: user.id,
      });

      const targetUser = await storage.getUser(userId);
      await logAuditEvent(user.id, "Assigned form manager", "forms", `User: ${targetUser?.username || userId}, Form: ${form.title}`, req.params.id, "application_form");

      res.json({ manager });
    } catch (error) {
      res.status(500).json({ error: "Failed to add form manager" });
    }
  });

  app.delete("/api/forms/:id/managers/:userId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const form = await storage.getApplicationForm(req.params.id);
      if (!form) return res.status(404).json({ error: "Form not found" });

      if (!(await isUserDepartmentLeadership(user, form.departmentCode))) {
        return res.status(403).json({ error: "Only leadership can remove form managers" });
      }

      await storage.removeFormManager(req.params.id, req.params.userId);

      const targetUser = await storage.getUser(req.params.userId);
      await logAuditEvent(user.id, "Removed form manager", "forms", `User: ${targetUser?.username || req.params.userId}, Form: ${form.title}`, req.params.id, "application_form");

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove form manager" });
    }
  });

  // ============ NOTIFICATION ROUTES ============

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const notifs = await storage.getNotificationsByUser(user.id);
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ notifications: notifs.slice(0, 50), unreadCount: count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.delete("/api/notifications/clear-all", isAuthenticated, async (req, res) => {
    try {
      await storage.clearAllNotifications(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all read" });
    }
  });

  // ============ ADMIN ROUTES ============

  const ADMIN_TAB_SETTINGS: Record<string, { settingKey: string; defaultTier: string }> = {
    dashboard: { settingKey: "staff_access_admin_panel", defaultTier: "director" },
    users: { settingKey: "staff_manage_users", defaultTier: "director" },
    players: { settingKey: "staff_manage_players", defaultTier: "executive" },
    roles: { settingKey: "staff_manage_roles", defaultTier: "director" },
    access: { settingKey: "staff_manage_access_control", defaultTier: "director" },
    seo: { settingKey: "staff_manage_seo", defaultTier: "executive" },
    audit: { settingKey: "staff_view_audit_log", defaultTier: "executive" },
    settings: { settingKey: "staff_manage_settings", defaultTier: "director" },
  };

  async function checkStaffPermission(userTier: string | null | undefined, settingKey: string, defaultTier: string): Promise<boolean> {
    if (userTier === "director" || userTier === "executive") return true;
    const setting = await storage.getAdminSetting(settingKey);
    const requiredTier = setting?.value || defaultTier;
    return meetsStaffTier(userTier, requiredTier);
  }

  function requireStaffPermission(settingKey: string, defaultTier: string) {
    return async (req: any, res: any, next: any) => {
      const userTier = req.user?.staffTier;
      const allowed = await checkStaffPermission(userTier, settingKey, defaultTier);
      if (!allowed) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions for this action" });
      }
      next();
    };
  }

  app.get("/api/admin/accessible-tabs", isAuthenticated, hasPermission("admin"), async (req, res) => {
    try {
      const userTier = req.user?.staffTier;
      const tabs: Record<string, boolean> = {};
      for (const [tab, config] of Object.entries(ADMIN_TAB_SETTINGS)) {
        tabs[tab] = await checkStaffPermission(userTier, config.settingKey, config.defaultTier);
      }
      res.json({ tabs });
    } catch (error) {
      res.status(500).json({ error: "Failed to check permissions" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_users", "director"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(({ accessToken, refreshToken, ...u }) => u);
      res.json({ users: safeUsers });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/role-mappings", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_roles", "director"), async (req, res) => {
    try {
      const mappings = await storage.getRoleMappings();
      res.json({ mappings });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch role mappings" });
    }
  });

  app.post("/api/admin/role-mappings", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_roles", "director"), async (req, res) => {
    try {
      const mapping = await storage.createRoleMapping(req.body);
      await logAuditEvent(req.user!.id, "Created role mapping", "roles", `Discord: ${req.body.discordRoleId}`, mapping.id, "role_mapping");
      res.json({ mapping });
    } catch (error) {
      res.status(500).json({ error: "Failed to create role mapping" });
    }
  });

  app.delete("/api/admin/role-mappings/:id", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_roles", "director"), async (req, res) => {
    try {
      const id = req.params.id as string;
      await storage.deleteRoleMapping(id);
      await logAuditEvent(req.user!.id, "Deleted role mapping", "roles", undefined, id, "role_mapping");
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
    const settingKey = req.body.key as string;
    const isAccessControlSetting = settingKey?.startsWith("staff_") || settingKey?.startsWith("access_");
    const isSeoSetting = settingKey?.startsWith("seo_") || settingKey === "favicon_url" || settingKey === "og_image_url";

    if (isAccessControlSetting) {
      const allowed = await checkStaffPermission(req.user?.staffTier, "staff_manage_access_control", "director");
      if (!allowed) return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    } else if (isSeoSetting) {
      const allowed = await checkStaffPermission(req.user?.staffTier, "staff_manage_seo", "executive");
      if (!allowed) return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    } else {
      const allowed = await checkStaffPermission(req.user?.staffTier, "staff_manage_settings", "director");
      if (!allowed) return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    try {
      const setting = await storage.upsertAdminSetting({
        ...req.body,
        updatedBy: req.user!.id,
      });
      await logAuditEvent(req.user!.id, "Updated admin setting", "settings", `Key: ${req.body.key}`, setting.id, "admin_setting");
      res.json({ setting });
    } catch (error) {
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  app.get("/api/admin/menu-items", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_settings", "director"), async (req, res) => {
    try {
      const items = await storage.getMenuItems();
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.put("/api/admin/menu-items/:id", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_settings", "director"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const item = await storage.updateMenuItem(id, req.body);
      res.json({ item });
    } catch (error) {
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  // Sync all users from Discord
  app.post("/api/admin/sync-all-roles", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_sync_roles", "director"), async (req, res) => {
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
            const collectedTiers: string[] = [];
            let staffTier: string | null = null;
            let isStaff = false;

            for (const discordRoleId of newRoles) {
              const mapping = roleMappings.find(m => m.discordRoleId === discordRoleId);
              if (mapping) {
                const permissions = mapping.websitePermission.split(",").map(p => p.trim()).filter(Boolean);
                websiteRolesArr.push(...permissions);
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
                  websiteRolesArr.push(...wsRole.permissions);
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

            await storage.updateUser(user.discordId, {
              roles: newRoles,
              websiteRoles: Array.from(new Set(websiteRolesArr)),
              isStaff,
              staffTier,
              staffTiers: Array.from(new Set(collectedTiers)),
            });
            synced++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      await logAuditEvent(req.user!.id, "Bulk role sync", "roles", `Synced: ${synced}, Failed: ${failed}, Total: ${users.length}`);
      res.json({ synced, failed, total: users.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync roles" });
    }
  });

  app.get("/api/admin/audit-logs", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_view_audit_log", "executive"), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const [logs, total] = await Promise.all([
      storage.getAuditLogs(limit, offset),
      storage.getAuditLogCount(),
    ]);
    const userIds = [...new Set(logs.filter(l => l.userId).map(l => l.userId!))];
    const usersMap: Record<string, any> = {};
    for (const uid of userIds) {
      const user = await storage.getUser(uid);
      if (user) usersMap[uid] = { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, discordId: user.discordId };
    }
    res.json({ logs, total, users: usersMap });
  });

  app.get("/api/admin/dashboard-stats", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_access_admin_panel", "director"), async (req, res) => {
    const [users, departments, recentLogs] = await Promise.all([
      storage.getAllUsers(),
      storage.getDepartments(),
      storage.getAuditLogs(5, 0),
    ]);
    const staffCount = users.filter(u => u.isStaff).length;
    res.json({
      totalUsers: users.length,
      staffCount,
      departmentCount: departments.length,
      recentActivity: recentLogs,
    });
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

  app.get("/api/user/my-applications/:code", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const code = req.params.code as string;
      const submissions = await storage.getSubmissionsByUser(user.id);
      const deptSubmissions = submissions.filter(s => s.departmentCode === code);
      const enriched = await Promise.all(deptSubmissions.map(async (sub) => {
        const form = await storage.getApplicationForm(sub.formId);
        return {
          ...sub,
          formTitle: form?.title || "Unknown Form",
          username: user.username,
          avatar: user.avatar,
          discordId: user.discordId,
        };
      }));
      res.json({ submissions: enriched });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Check department access
  app.get("/api/user/check-access/:department", isAuthenticated, async (req, res) => {
    const department = req.params.department as string;
    const userRoles = req.user?.websiteRoles || [];
    const staffTier = req.user?.staffTier;
    
    console.log(`[check-access] User: ${req.user?.username}, staffTier: ${staffTier}, department: ${department}`);
    
    // Directors, Executives, and Managers automatically get access to ALL department portals with leadership
    if (staffTier === "director" || staffTier === "executive" || staffTier === "manager") {
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
    
    // Also check if user's Discord roles match any leadership rank's discordRoleId
    if (!isLeadership && req.user?.roles) {
      const deptRanks = await storage.getRanksByDepartment(department);
      const leadershipDiscordRoleIds = deptRanks
        .filter(r => r.isLeadership && r.discordRoleId)
        .map(r => r.discordRoleId!);
      if (req.user.roles.some(role => leadershipDiscordRoleIds.includes(role))) {
        isLeadership = true;
      }
    }

    const managedForms = await storage.getFormManagersByUser(req.user!.id);
    const deptForms = await storage.getApplicationFormsByDepartment(department);
    const managedFormIds = managedForms.filter(m => deptForms.some(f => f.id === m.formId)).map(m => m.formId);
    const isFormManager = managedFormIds.length > 0;

    // Leadership members always get access to their department
    if (!hasAccess && isLeadership) {
      hasAccess = true;
    }

    if (!hasAccess && isFormManager) {
      hasAccess = true;
    }
    
    res.json({ hasAccess, department, isLeadership, isFormManager, managedFormIds });
  });

  // ============ WEBSITE ROLES ROUTES ============
  app.get("/api/admin/website-roles", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_roles", "director"), async (req, res) => {
    try {
      const roles = await storage.getWebsiteRoles();
      res.json({ roles });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch website roles" });
    }
  });

  app.post("/api/admin/website-roles", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_roles", "director"), async (req, res) => {
    try {
      const role = await storage.createWebsiteRole(req.body);
      await logAuditEvent(req.user!.id, "Created website role", "roles", `Role: ${req.body.name}`, role.id, "website_role");
      res.json({ role });
    } catch (error) {
      res.status(500).json({ error: "Failed to create website role" });
    }
  });

  app.put("/api/admin/website-roles/:id", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_roles", "director"), async (req, res) => {
    try {
      const role = await storage.updateWebsiteRole(req.params.id as string, req.body);
      await logAuditEvent(req.user!.id, "Updated website role", "roles", `Role: ${req.body.name || req.params.id}`, req.params.id as string, "website_role");
      res.json({ role });
    } catch (error) {
      res.status(500).json({ error: "Failed to update website role" });
    }
  });

  app.delete("/api/admin/website-roles/:id", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_roles", "director"), async (req, res) => {
    try {
      await storage.deleteWebsiteRole(req.params.id as string);
      await logAuditEvent(req.user!.id, "Deleted website role", "roles", undefined, req.params.id as string, "website_role");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete website role" });
    }
  });

  // ============ USER ROLE ASSIGNMENT ROUTES ============
  app.get("/api/admin/users/:userId/roles", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_users", "director"), async (req, res) => {
    try {
      const assignments = await storage.getUserRoleAssignments(req.params.userId as string);
      const roles = await storage.getWebsiteRoles();
      const assignedRoles = assignments.map(a => roles.find(r => r.id === a.roleId)).filter(Boolean);
      res.json({ roles: assignedRoles, assignments });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  app.post("/api/admin/users/:userId/roles", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_users", "director"), async (req, res) => {
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

  app.delete("/api/admin/users/:userId/roles/:roleId", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_users", "director"), async (req, res) => {
    try {
      await storage.removeRoleFromUser(req.params.userId as string, req.params.roleId as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove role" });
    }
  });

  app.put("/api/admin/users/:userId", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_users", "director"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId as string);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updated = await storage.updateUser(user.discordId, req.body);
      if (updated) {
        await logAuditEvent(req.user!.id, "Updated user", "users", `User: ${updated.username}`, updated.id, "user");
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
  app.get("/api/admin/department-ranks", isAuthenticated, hasPermission("admin"), requireStaffPermission("staff_manage_roles", "director"), async (req, res) => {
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
      
      const isLeadership = await isUserDepartmentLeadership(req.user!, code);
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
      
      const isLeadership = await isUserDepartmentLeadership(req.user!, code);
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      
      const rank = await storage.updateRank(req.params.rankId as string, req.body);
      res.json({ rank });
    } catch (error) {
      res.status(500).json({ error: "Failed to update rank" });
    }
  });

  // Public settings endpoint (for about description, etc.)
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getAdminSetting(req.params.key as string);
      if (!setting || setting.isSecret) {
        return res.json({ value: null });
      }
      res.json({ value: setting.value });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  // ============ AOS SQUADS ============
  app.get("/api/aos/squads", async (req, res) => {
    try {
      const squads = await storage.getAosSquads();
      res.json({ squads });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch squads" });
    }
  });

  app.post("/api/aos/squads", isAuthenticated, async (req, res) => {
    try {
      const isLeadership = await isUserDepartmentLeadership(req.user!, "aos");
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      const squad = await storage.createAosSquad(req.body);
      res.json({ squad });
    } catch (error) {
      res.status(500).json({ error: "Failed to create squad" });
    }
  });

  app.put("/api/aos/squads/:id", isAuthenticated, async (req, res) => {
    try {
      const isLeadership = await isUserDepartmentLeadership(req.user!, "aos");
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      const squad = await storage.updateAosSquad(req.params.id as string, req.body);
      res.json({ squad });
    } catch (error) {
      res.status(500).json({ error: "Failed to update squad" });
    }
  });

  app.delete("/api/aos/squads/:id", isAuthenticated, async (req, res) => {
    try {
      const isLeadership = await isUserDepartmentLeadership(req.user!, "aos");
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      await storage.deleteAosSquad(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete squad" });
    }
  });

  // Update roster member squad assignment
  app.put("/api/departments/aos/roster/:memberId/squad", isAuthenticated, async (req, res) => {
    try {
      const isLeadership = await isUserDepartmentLeadership(req.user!, "aos");
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      const member = await storage.updateRosterMember(req.params.memberId as string, { squadId: req.body.squadId });
      res.json({ member });
    } catch (error) {
      res.status(500).json({ error: "Failed to update squad assignment" });
    }
  });

  app.put("/api/departments/:code/roster/:memberId/callsign", isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code as string;
      const isLeadership = await isUserDepartmentLeadership(req.user!, code);
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      const { callsign, userId, rankId } = req.body;
      const memberId = req.params.memberId as string;

      if (memberId.startsWith("auto-") && userId && rankId) {
        const existing = await storage.getRosterMemberByUser(userId, code);
        if (existing) {
          const updated = await storage.updateRosterMember(existing.id, { callsign: callsign || null });
          return res.json({ member: updated });
        }
        const created = await storage.createRosterMember({
          userId,
          departmentCode: code,
          rankId,
          callsign: callsign || null,
        });
        return res.json({ member: created });
      }

      const member = await storage.updateRosterMember(memberId, { callsign: callsign || null });
      res.json({ member });
    } catch (error) {
      res.status(500).json({ error: "Failed to update callsign" });
    }
  });

  app.delete("/api/departments/:code/ranks/:rankId", isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code as string;
      
      const isLeadership = await isUserDepartmentLeadership(req.user!, code);
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      
      const rankId = req.params.rankId as string;
      const rank = await storage.getRank(rankId);
      if (!rank) {
        return res.status(404).json({ error: "Rank not found" });
      }
      if (rank.departmentCode !== code) {
        return res.status(400).json({ error: "Rank does not belong to this department" });
      }

      const roster = await storage.getRosterByDepartment(code);
      const membersUsingRank = roster.filter(m => m.rankId === rankId);
      if (membersUsingRank.length > 0) {
        return res.status(400).json({ error: `Cannot delete rank "${rank.name}" — ${membersUsingRank.length} roster member(s) are assigned to it. Reassign or remove them first.` });
      }

      await storage.deleteRank(rankId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete rank" });
    }
  });

  // ============ SERVER UPDATES ============
  app.get("/api/server-updates", async (_req, res) => {
    try {
      const updates = await storage.getServerUpdates();
      const allUsers = await storage.getAllUsers();
      const enriched = updates.map(u => {
        const author = allUsers.find(a => a.id === u.authorId);
        return { ...u, authorName: author?.displayName || author?.username || "Unknown", authorAvatar: author?.avatar || null, authorDiscordId: author?.discordId || null };
      });
      res.json({ updates: enriched });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch server updates" });
    }
  });

  app.post("/api/server-updates", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["manager", "executive", "director"].includes(tier)) {
        return res.status(403).json({ error: "Manager or above required" });
      }
      const { title, description, imageUrl } = req.body;
      if (!title || !description) {
        return res.status(400).json({ error: "Title and description required" });
      }
      const update = await storage.createServerUpdate({ title, description, imageUrl: imageUrl || null, authorId: req.user!.id });
      res.json({ update });
    } catch (error) {
      res.status(500).json({ error: "Failed to create server update" });
    }
  });

  app.delete("/api/server-updates/:id", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["manager", "executive", "director"].includes(tier)) {
        return res.status(403).json({ error: "Manager or above required" });
      }
      await storage.deleteServerUpdate(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete server update" });
    }
  });

  // ============ SUPPORT ROUTES ============
  app.get("/api/support/forms", async (_req, res) => {
    try {
      const forms = await storage.getSupportForms();
      res.json({ forms });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch support forms" });
    }
  });

  app.get("/api/support/forms/:id", async (req, res) => {
    try {
      const form = await storage.getSupportForm(req.params.id as string);
      if (!form) return res.status(404).json({ error: "Form not found" });
      res.json({ form });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form" });
    }
  });

  app.patch("/api/support/forms/:id", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      const existingForm = await storage.getSupportForm(req.params.id as string);
      if (!existingForm) return res.status(404).json({ error: "Form not found" });

      const isTopTier = tier === "director" || tier === "executive";
      const hasFormAccess = tier && (existingForm.accessTiers || []).includes(tier);
      const isManager = await storage.isFormManager(req.params.id as string, req.user!.id);

      const { title, description, isOpen, accessTiers } = req.body;

      if ((title !== undefined || description !== undefined || accessTiers !== undefined) && !isTopTier) {
        return res.status(403).json({ error: "Executive or Director required" });
      }

      if (isOpen !== undefined && !isTopTier && !hasFormAccess && !isManager) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (isOpen !== undefined) updates.isOpen = isOpen;
      if (accessTiers !== undefined) updates.accessTiers = accessTiers;
      const form = await storage.updateSupportForm(req.params.id as string, updates);
      res.json({ form });
    } catch (error) {
      res.status(500).json({ error: "Failed to update form" });
    }
  });

  app.get("/api/support/forms/:id/questions", async (req, res) => {
    try {
      const questions = await storage.getSupportQuestionsByForm(req.params.id as string);
      res.json({ questions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.put("/api/support/forms/:id/questions", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      const isTopTier = tier === "director" || tier === "executive";
      const isManager = await storage.isFormManager(req.params.id as string, req.user!.id);
      if (!isTopTier && !isManager) {
        return res.status(403).json({ error: "Executive, Director, or Form Manager required" });
      }
      const formId = req.params.id as string;
      const { questions } = req.body;
      const existingQuestions = await storage.getSupportQuestionsByForm(formId);
      const result = [];
      
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (i < existingQuestions.length) {
          const updated = await storage.updateSupportQuestion(existingQuestions[i].id, {
            label: q.label,
            type: q.type,
            options: q.options || null,
            isRequired: q.isRequired ?? true,
            priority: q.priority ?? i,
          });
          if (updated) result.push(updated);
        } else {
          const question = await storage.createSupportQuestion({
            formId,
            label: q.label,
            type: q.type,
            options: q.options || null,
            isRequired: q.isRequired ?? true,
            priority: q.priority ?? i,
          });
          result.push(question);
        }
      }
      
      for (let i = questions.length; i < existingQuestions.length; i++) {
        await storage.deleteSupportQuestion(existingQuestions[i].id);
      }
      
      res.json({ questions: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to update questions" });
    }
  });

  // ============ SUPPORT QUESTION REORDER ============
  app.post("/api/support/forms/:formId/questions/reorder", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const tier = user.staffTier;
      const isTopTier = tier === "director" || tier === "executive" || tier === "manager";
      const isManager = await storage.isFormManager(req.params.formId as string, user.id);
      if (!isTopTier && !isManager) {
        return res.status(403).json({ error: "Only directors, executives, managers, or form managers can reorder questions" });
      }

      const formId = req.params.formId;
      const { questionId, direction } = req.body;

      const form = await storage.getSupportForm(formId);
      if (!form) return res.status(404).json({ error: "Form not found" });

      const questions = await storage.getSupportQuestionsByForm(formId);
      const sortedQuestions = [...questions].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      const currentIndex = sortedQuestions.findIndex(q => q.id === questionId);
      if (currentIndex === -1) return res.status(404).json({ error: "Question not found" });

      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= sortedQuestions.length) {
        return res.status(400).json({ error: "Cannot move question further in that direction" });
      }

      const currentPriority = sortedQuestions[currentIndex].priority ?? currentIndex;
      const swapPriority = sortedQuestions[swapIndex].priority ?? swapIndex;
      await storage.updateSupportQuestion(sortedQuestions[currentIndex].id, { priority: swapPriority });
      await storage.updateSupportQuestion(sortedQuestions[swapIndex].id, { priority: currentPriority });

      const updatedQuestions = await storage.getSupportQuestionsByForm(formId);
      res.json({ questions: updatedQuestions });
    } catch (error) {
      console.error("Reorder support questions error:", error);
      res.status(500).json({ error: "Failed to reorder questions" });
    }
  });

  app.get("/api/support/forms/:id/submissions", isAuthenticated, async (req, res) => {
    try {
      const form = await storage.getSupportForm(req.params.id as string);
      if (!form) return res.status(404).json({ error: "Form not found" });

      const tier = req.user?.staffTier;
      const hasAccess = tier && (form.accessTiers || []).includes(tier);
      const isTopTier = tier === "director" || tier === "executive";
      const isManager = await storage.isFormManager(form.id, req.user!.id);

      if (!hasAccess && !isTopTier && !isManager) {
        return res.status(403).json({ error: "Access denied" });
      }

      const submissions = await storage.getSupportSubmissionsByForm(form.id);
      const allUsers = await storage.getAllUsers();
      const enriched = submissions.map(sub => {
        const u = allUsers.find(a => a.id === sub.userId);
        return { ...sub, username: u?.username || "Unknown", displayName: u?.displayName || null, avatar: u?.avatar || null, discordId: u?.discordId || null };
      });
      res.json({ submissions: enriched });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.post("/api/support/forms/:id/submissions", isAuthenticated, async (req, res) => {
    try {
      const form = await storage.getSupportForm(req.params.id as string);
      if (!form) return res.status(404).json({ error: "Form not found" });
      if (!form.isOpen) return res.status(400).json({ error: "This form is currently closed" });

      const { answers } = req.body;
      const submission = await storage.createSupportSubmission({
        formId: form.id,
        userId: req.user!.id,
        answers: JSON.stringify(answers),
        status: "pending",
      });

      const allUsers = await storage.getAllUsers();
      const recipients = allUsers.filter(u => u.staffTier && (form.accessTiers || []).includes(u.staffTier));
      const recipientIds = new Set<string>();
      for (const recipient of recipients) {
        recipientIds.add(recipient.id);
        await storage.createNotification({
          userId: recipient.id,
          type: "application_submitted",
          title: "New Support Submission",
          message: `${req.user!.displayName || req.user!.username} submitted a ${form.title} application.`,
          link: `/support?form=${form.id}&submission=${submission.id}`,
          relatedId: submission.id,
          isRead: false,
        });
      }

      const formManagers = await storage.getFormManagers(form.id);
      for (const manager of formManagers) {
        if (!recipientIds.has(manager.userId) && manager.userId !== req.user!.id) {
          await storage.createNotification({
            userId: manager.userId,
            type: "application_submitted",
            title: "New Support Submission",
            message: `${req.user!.displayName || req.user!.username} submitted a ${form.title} application.`,
            link: `/support?form=${form.id}&submission=${submission.id}`,
            relatedId: submission.id,
            isRead: false,
          });
        }
      }

      res.json({ submission });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  app.get("/api/support/submissions/:id", isAuthenticated, async (req, res) => {
    try {
      const submission = await storage.getSupportSubmission(req.params.id as string);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const form = await storage.getSupportForm(submission.formId);
      const tier = req.user?.staffTier;
      const isOwner = submission.userId === req.user?.id;
      const hasAccess = tier && form && (form.accessTiers || []).includes(tier);
      const isTopTier = tier === "director" || tier === "executive";
      const isManager = await storage.isFormManager(submission.formId, req.user!.id);

      if (!isOwner && !hasAccess && !isTopTier && !isManager) {
        return res.status(403).json({ error: "Access denied" });
      }

      const user = await storage.getUser(submission.userId);
      const questions = form ? await storage.getSupportQuestionsByForm(form.id) : [];
      res.json({
        submission: { ...submission, username: user?.username || "Unknown", displayName: user?.displayName || null, avatar: user?.avatar || null, discordId: user?.discordId || null },
        form,
        questions,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  app.patch("/api/support/submissions/:id/status", isAuthenticated, async (req, res) => {
    try {
      const submission = await storage.getSupportSubmission(req.params.id as string);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const form = await storage.getSupportForm(submission.formId);
      const tier = req.user?.staffTier;
      const hasAccess = tier && form && (form.accessTiers || []).includes(tier);
      const isTopTier = tier === "director" || tier === "executive";
      const isManager = await storage.isFormManager(submission.formId, req.user!.id);

      if (!hasAccess && !isTopTier && !isManager) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { status } = req.body;
      const updated = await storage.updateSupportSubmission(submission.id, { status });

      await storage.createNotification({
        userId: submission.userId,
        type: "status_change",
        title: "Application Updated",
        message: `Your ${form?.title || "support"} application has been ${status}.`,
        link: `/support?form=${submission.formId}&submission=${submission.id}`,
        relatedId: submission.id,
        isRead: false,
      });

      res.json({ submission: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.get("/api/support/submissions/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const submission = await storage.getSupportSubmission(req.params.id as string);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const messages = await storage.getSupportMessagesBySubmission(submission.id);
      const allUsers = await storage.getAllUsers();
      const enriched = messages.map(m => {
        const u = allUsers.find(a => a.id === m.userId);
        return { ...m, username: u?.username || "Unknown", displayName: u?.displayName || null, avatar: u?.avatar || null, discordId: u?.discordId || null };
      });
      res.json({ messages: enriched });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/support/submissions/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const submission = await storage.getSupportSubmission(req.params.id as string);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const form = await storage.getSupportForm(submission.formId);
      const tier = req.user?.staffTier;
      const isOwner = submission.userId === req.user?.id;
      const hasAccess = tier && form && (form.accessTiers || []).includes(tier);
      const isTopTier = tier === "director" || tier === "executive";
      const isManager = await storage.isFormManager(submission.formId, req.user!.id);

      if (!isOwner && !hasAccess && !isTopTier && !isManager) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { content } = req.body;
      const message = await storage.createSupportMessage({
        submissionId: submission.id,
        userId: req.user!.id,
        content,
      });

      if (isOwner) {
        const allUsers = await storage.getAllUsers();
        const staffRecipients = allUsers.filter(u => u.staffTier && form && (form.accessTiers || []).includes(u.staffTier));
        for (const recipient of staffRecipients) {
          await storage.createNotification({
            userId: recipient.id,
            type: "application_response",
            title: "Application Reply",
            message: `${req.user!.displayName || req.user!.username} replied to their ${form?.title || "support"} application.`,
            link: `/support?form=${submission.formId}&submission=${submission.id}`,
            relatedId: submission.id,
            isRead: false,
          });
        }
        const formManagers = await storage.getFormManagers(submission.formId);
        for (const manager of formManagers) {
          if (!staffRecipients.find(r => r.id === manager.userId)) {
            await storage.createNotification({
              userId: manager.userId,
              type: "application_response",
              title: "Application Reply",
              message: `${req.user!.displayName || req.user!.username} replied to their ${form?.title || "support"} application.`,
              link: `/support?form=${submission.formId}&submission=${submission.id}`,
              relatedId: submission.id,
              isRead: false,
            });
          }
        }
      } else {
        await storage.createNotification({
          userId: submission.userId,
          type: "application_response",
          title: "Application Response",
          message: `${req.user!.displayName || req.user!.username} responded to your ${form?.title || "support"} application.`,
          link: `/support?form=${submission.formId}&submission=${submission.id}`,
          relatedId: submission.id,
          isRead: false,
        });
      }

      const user = await storage.getUser(req.user!.id);
      res.json({ ...message, username: user?.username || "Unknown", displayName: user?.displayName || null, avatar: user?.avatar || null, discordId: user?.discordId || null });
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.delete("/api/support/submissions/:id", isAuthenticated, async (req, res) => {
    try {
      const submission = await storage.getSupportSubmission(req.params.id as string);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const tier = req.user?.staffTier;
      const hasAccess = tier && ["manager", "executive", "director"].includes(tier);
      const isManager = await storage.isFormManager(submission.formId, req.user!.id);
      if (!hasAccess && !isManager) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteSupportSubmission(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete submission" });
    }
  });

  // ============ SUPPORT FORM MANAGERS ROUTES ============

  app.get("/api/support/forms/:id/managers", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["director", "executive"].includes(tier)) {
        return res.status(403).json({ error: "Only Directors/Executives can view form managers" });
      }
      const managers = await storage.getFormManagers(req.params.id);
      const enriched = await Promise.all(managers.map(async (m) => {
        const u = await storage.getUser(m.userId);
        return { ...m, username: u?.username || "Unknown", displayName: u?.displayName || null, avatar: u?.avatar || null, discordId: u?.discordId || "" };
      }));
      res.json({ managers: enriched });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form managers" });
    }
  });

  app.post("/api/support/forms/:id/managers", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["director", "executive"].includes(tier)) {
        return res.status(403).json({ error: "Only Directors/Executives can assign form managers" });
      }
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const existing = await storage.isFormManager(req.params.id, userId);
      if (existing) return res.status(400).json({ error: "User is already a manager for this form" });

      const form = await storage.getSupportForm(req.params.id);
      const manager = await storage.addFormManager({ formId: req.params.id, userId, assignedBy: req.user!.id });

      const targetUser = await storage.getUser(userId);
      await logAuditEvent(req.user!.id, "Assigned support form manager", "forms", `User: ${targetUser?.username || userId}, Form: ${form?.title || req.params.id}`, req.params.id, "support_form");

      res.json({ manager });
    } catch (error) {
      res.status(500).json({ error: "Failed to add form manager" });
    }
  });

  app.delete("/api/support/forms/:id/managers/:userId", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["director", "executive"].includes(tier)) {
        return res.status(403).json({ error: "Only Directors/Executives can remove form managers" });
      }
      await storage.removeFormManager(req.params.id, req.params.userId);

      const form = await storage.getSupportForm(req.params.id);
      const targetUser = await storage.getUser(req.params.userId);
      await logAuditEvent(req.user!.id, "Removed support form manager", "forms", `User: ${targetUser?.username || req.params.userId}, Form: ${form?.title || req.params.id}`, req.params.id, "support_form");

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove form manager" });
    }
  });

  // Also add endpoint for users to check which support forms they manage
  app.get("/api/support/my-managed-forms", isAuthenticated, async (req, res) => {
    try {
      const managedForms = await storage.getFormManagersByUser(req.user!.id);
      res.json({ managedFormIds: managedForms.map(m => m.formId) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch managed forms" });
    }
  });

  app.get("/api/support/my-submissions", isAuthenticated, async (req, res) => {
    try {
      const submissions = await storage.getSupportSubmissionsByUser(req.user!.id);
      const forms = await storage.getSupportForms();
      const enriched = submissions.map(sub => {
        const form = forms.find(f => f.id === sub.formId);
        return { ...sub, formTitle: form?.title || "Unknown" };
      });
      res.json({ submissions: enriched });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // ============ SUPPORT FAQ ROUTES ============
  app.get("/api/support/faqs", async (_req, res) => {
    try {
      const faqs = await storage.getSupportFaqs();
      res.json({ faqs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch FAQs" });
    }
  });

  app.post("/api/support/faqs", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["executive", "director"].includes(tier)) {
        return res.status(403).json({ error: "Executive or Director required" });
      }
      const { question, answer, category } = req.body;
      if (!question || !answer) {
        return res.status(400).json({ error: "Question and answer are required" });
      }
      const faq = await storage.createSupportFaq({ question, answer, category: category || "General", createdBy: req.user!.id });
      res.json({ faq });
    } catch (error) {
      res.status(500).json({ error: "Failed to create FAQ" });
    }
  });

  app.patch("/api/support/faqs/:id", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["executive", "director"].includes(tier)) {
        return res.status(403).json({ error: "Executive or Director required" });
      }
      const { question, answer, category, priority } = req.body;
      const updates: any = {};
      if (question !== undefined) updates.question = question;
      if (answer !== undefined) updates.answer = answer;
      if (category !== undefined) updates.category = category;
      if (priority !== undefined) updates.priority = priority;
      const faq = await storage.updateSupportFaq(req.params.id as string, updates);
      res.json({ faq });
    } catch (error) {
      res.status(500).json({ error: "Failed to update FAQ" });
    }
  });

  app.delete("/api/support/faqs/:id", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["executive", "director"].includes(tier)) {
        return res.status(403).json({ error: "Executive or Director required" });
      }
      await storage.deleteSupportFaq(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete FAQ" });
    }
  });

  // ============ SUPPORT FORM MANAGEMENT (Create/Delete) ============
  app.post("/api/support/forms", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["executive", "director"].includes(tier)) {
        return res.status(403).json({ error: "Executive or Director required" });
      }
      const { title, description, key, accessTiers } = req.body;
      if (!title || !key) {
        return res.status(400).json({ error: "Title and key are required" });
      }
      const form = await storage.createSupportForm({ title, description, key, isOpen: true, accessTiers: accessTiers || ["executive", "director"] });
      res.json({ form });
    } catch (error) {
      res.status(500).json({ error: "Failed to create form" });
    }
  });

  app.delete("/api/support/forms/:id", isAuthenticated, async (req, res) => {
    try {
      const tier = req.user?.staffTier;
      if (!tier || !["executive", "director"].includes(tier)) {
        return res.status(403).json({ error: "Executive or Director required" });
      }
      await storage.deleteSupportForm(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete form" });
    }
  });

  return httpServer;
}
