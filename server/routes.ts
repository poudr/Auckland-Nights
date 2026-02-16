import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hasPermission } from "./auth";
import { seedDatabase } from "./seed";
import { STAFF_HIERARCHY } from "@shared/schema";

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
        user: { id: string; username: string; avatar: string | null; discordId: string; createdAt: Date | null } | null;
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
                departmentCode: code,
                rankId: rank.id,
                callsign: existing.callsign,
                callsignNumber: existing.callsignNumber,
                qid: existing.qid,
                isActive: true,
                user: { id: user.id, username: user.username, avatar: user.avatar, discordId: user.discordId, createdAt: user.createdAt },
                rank,
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
              user: { id: user.id, username: user.username, avatar: user.avatar, discordId: user.discordId, createdAt: user.createdAt },
              rank,
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

      res.json({ roster: autoRoster, ranks: departmentRanks });
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
      const tier = user.staffTier;
      if (!tier || !["director", "executive", "manager"].includes(tier)) {
        return res.status(403).json({ error: "Only leadership can create forms" });
      }

      const code = req.params.code as string;
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
      const tier = user.staffTier;
      if (!tier || !["director", "executive", "manager"].includes(tier)) {
        return res.status(403).json({ error: "Only leadership can edit forms" });
      }

      const { title, description, questions, rolesOnAccept, isWhitelist, notifyRanks } = req.body;

      if (isWhitelist) {
        const existingForm = await storage.getApplicationForm(req.params.id);
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
        await storage.deleteQuestionsByForm(form.id);
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

      const updatedQuestions = await storage.getQuestionsByForm(form.id);
      res.json({ form, questions: updatedQuestions });
    } catch (error) {
      res.status(500).json({ error: "Failed to update form" });
    }
  });

  app.delete("/api/forms/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const tier = user.staffTier;
      if (!tier || !["director", "executive", "manager"].includes(tier)) {
        return res.status(403).json({ error: "Only leadership can delete forms" });
      }
      await storage.deleteApplicationForm(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete form" });
    }
  });

  // ============ APPLICATION SUBMISSION ROUTES ============

  app.get("/api/departments/:code/submissions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const code = req.params.code as string;
      const tier = user.staffTier;
      const isLeadership = tier && ["director", "executive", "manager"].includes(tier);

      if (isLeadership) {
        const submissions = await storage.getSubmissionsByDepartment(code);
        const enriched = await Promise.all(submissions.map(async (sub) => {
          const form = await storage.getApplicationForm(sub.formId);
          const submitter = await storage.getUser(sub.userId);
          return {
            ...sub,
            formTitle: form?.title || "Unknown Form",
            username: submitter?.username || "Unknown",
            avatar: submitter?.avatar || null,
            discordId: submitter?.discordId || "",
          };
        }));
        return res.json({ submissions: enriched });
      }

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
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.get("/api/submissions/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const tier = user.staffTier;
      const isLeadership = tier && ["director", "executive", "manager"].includes(tier);
      if (submission.userId !== user.id && !isLeadership) {
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
        submitter: submitter ? { username: submitter.username, avatar: submitter.avatar, discordId: submitter.discordId } : null,
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
          message: `${user.username} submitted an application for ${dept?.name || code}: ${form?.title || "Unknown"}`,
          link: `/departments/${code}/applications`,
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
      const tier = user.staffTier;
      if (!tier || !["director", "executive", "manager"].includes(tier)) {
        return res.status(403).json({ error: "Only leadership can change status" });
      }

      const { status, rolesToAssign } = req.body;
      const submission = await storage.updateSubmission(req.params.id, { status });
      if (!submission) return res.status(404).json({ error: "Submission not found" });

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

        const allowedWebsiteRoles = new Set([deptCode, ...(deptCode === "police" ? ["aos"] : [])]);

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
        link: `/departments/${submission.departmentCode}/applications`,
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

      const tier = user.staffTier;
      const isLeadership = tier && ["director", "executive", "manager"].includes(tier);
      if (submission.userId !== user.id && !isLeadership) {
        return res.status(403).json({ error: "Access denied" });
      }

      const message = await storage.createMessage({
        submissionId: submission.id,
        userId: user.id,
        content: req.body.content,
      });

      const form = await storage.getApplicationForm(submission.formId);
      const dept = await storage.getDepartment(submission.departmentCode);

      if (isLeadership && submission.userId !== user.id) {
        await storage.createNotification({
          userId: submission.userId,
          type: "application_response",
          title: "Application Response",
          message: `${user.username} responded to your ${dept?.name || submission.departmentCode} application (${form?.title || ""}).`,
          link: `/departments/${submission.departmentCode}/applications`,
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
            message: `${user.username} replied to their ${dept?.name || submission.departmentCode} application (${form?.title || ""}).`,
            link: `/departments/${submission.departmentCode}/applications`,
            relatedId: submission.id,
            isRead: false,
          });
        }
      }

      res.json({
        ...message,
        username: user.username,
        avatar: user.avatar,
        discordId: user.discordId,
        staffTier: user.staffTier,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
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
      res.status(500).json({ error: "Failed to mark all read" });
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
      const staffTier = req.user?.staffTier;
      let isLeadership = staffTier === "director" || staffTier === "executive";
      if (!isLeadership) {
        const rosterMember = await storage.getRosterMemberByUser(req.user!.id, "aos");
        if (rosterMember) {
          const rank = await storage.getRank(rosterMember.rankId);
          isLeadership = rank?.isLeadership || false;
        }
      }
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
      const staffTier = req.user?.staffTier;
      let isLeadership = staffTier === "director" || staffTier === "executive";
      if (!isLeadership) {
        const rosterMember = await storage.getRosterMemberByUser(req.user!.id, "aos");
        if (rosterMember) {
          const rank = await storage.getRank(rosterMember.rankId);
          isLeadership = rank?.isLeadership || false;
        }
      }
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
      const staffTier = req.user?.staffTier;
      let isLeadership = staffTier === "director" || staffTier === "executive";
      if (!isLeadership) {
        const rosterMember = await storage.getRosterMemberByUser(req.user!.id, "aos");
        if (rosterMember) {
          const rank = await storage.getRank(rosterMember.rankId);
          isLeadership = rank?.isLeadership || false;
        }
      }
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
      const staffTier = req.user?.staffTier;
      let isLeadership = staffTier === "director" || staffTier === "executive";
      if (!isLeadership) {
        const rosterMember = await storage.getRosterMemberByUser(req.user!.id, "aos");
        if (rosterMember) {
          const rank = await storage.getRank(rosterMember.rankId);
          isLeadership = rank?.isLeadership || false;
        }
      }
      if (!isLeadership && !req.user?.websiteRoles?.includes("admin")) {
        return res.status(403).json({ error: "Leadership access required" });
      }
      const member = await storage.updateRosterMember(req.params.memberId as string, { squadId: req.body.squadId });
      res.json({ member });
    } catch (error) {
      res.status(500).json({ error: "Failed to update squad assignment" });
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

  return httpServer;
}
