import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ USERS ============
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  discriminator: text("discriminator"),
  avatar: text("avatar"),
  email: text("email"),
  roles: text("roles").array().default(sql`'{}'::text[]`),
  websiteRoles: text("website_roles").array().default(sql`'{}'::text[]`), // Mapped website permissions
  isStaff: boolean("is_staff").default(false),
  staffTier: text("staff_tier"), // director, executive, manager, administrator, moderator, support, development
  staffTiers: text("staff_tiers").array().default(sql`'{}'::text[]`), // All staff tiers the user belongs to
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============ DEPARTMENTS ============
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // police, fire, ems, aos
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull(), // hex color for styling
  icon: text("icon"), // lucide icon name
  leadershipRoleIds: text("leadership_role_ids").array().default(sql`'{}'::text[]`), // Discord role IDs for leadership
  memberRoleIds: text("member_role_ids").array().default(sql`'{}'::text[]`), // Discord role IDs for members
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// ============ RANKS ============
export const ranks = pgTable("ranks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentCode: text("department_code").notNull(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation"),
  priority: integer("priority").notNull(), // Lower = higher rank
  isLeadership: boolean("is_leadership").default(false),
  callsignPrefix: text("callsign_prefix"), // e.g., "1-" for leadership
  discordRoleId: text("discord_role_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRankSchema = createInsertSchema(ranks).omit({
  id: true,
  createdAt: true,
});
export type InsertRank = z.infer<typeof insertRankSchema>;
export type Rank = typeof ranks.$inferSelect;

// ============ ROSTER MEMBERS ============
export const rosterMembers = pgTable("roster_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  departmentCode: text("department_code").notNull(),
  rankId: varchar("rank_id").notNull(),
  characterName: text("character_name"),
  callsign: text("callsign"),
  callsignNumber: integer("callsign_number"),
  qid: text("qid"),
  squadId: varchar("squad_id"),
  isActive: boolean("is_active").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRosterMemberSchema = createInsertSchema(rosterMembers).omit({
  id: true,
  joinedAt: true,
  updatedAt: true,
});
export type InsertRosterMember = z.infer<typeof insertRosterMemberSchema>;
export type RosterMember = typeof rosterMembers.$inferSelect;

// ============ APPLICATION FORMS ============
export const applicationForms = pgTable("application_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentCode: text("department_code").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApplicationFormSchema = createInsertSchema(applicationForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApplicationForm = z.infer<typeof insertApplicationFormSchema>;
export type ApplicationForm = typeof applicationForms.$inferSelect;

// ============ APPLICATION QUESTIONS ============
export const applicationQuestions = pgTable("application_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull(), // dropdown, short_answer, long_answer, checkbox
  options: text("options"), // JSON array for dropdown/checkbox options
  isRequired: boolean("is_required").default(true),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApplicationQuestionSchema = createInsertSchema(applicationQuestions).omit({
  id: true,
  createdAt: true,
});
export type InsertApplicationQuestion = z.infer<typeof insertApplicationQuestionSchema>;
export type ApplicationQuestion = typeof applicationQuestions.$inferSelect;

// ============ APPLICATION SUBMISSIONS ============
export const applicationSubmissions = pgTable("application_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull(),
  userId: varchar("user_id").notNull(),
  departmentCode: text("department_code").notNull(),
  status: text("status").default("pending"), // pending, under_review, accepted, denied
  answers: text("answers"), // JSON object { questionId: answer }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApplicationSubmissionSchema = createInsertSchema(applicationSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApplicationSubmission = z.infer<typeof insertApplicationSubmissionSchema>;
export type ApplicationSubmission = typeof applicationSubmissions.$inferSelect;

// ============ APPLICATION MESSAGES ============
export const applicationMessages = pgTable("application_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApplicationMessageSchema = createInsertSchema(applicationMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertApplicationMessage = z.infer<typeof insertApplicationMessageSchema>;
export type ApplicationMessage = typeof applicationMessages.$inferSelect;

// ============ NOTIFICATIONS ============
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // application_submitted, application_response, status_change
  title: text("title").notNull(),
  message: text("message"),
  link: text("link"),
  relatedId: varchar("related_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============ SOPs (Standard Operating Procedures) ============
export const sops = pgTable("sops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentCode: text("department_code").notNull(),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  sections: text("sections"), // JSON array of section titles for TOC
  uploadedBy: varchar("uploaded_by"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSopSchema = createInsertSchema(sops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSop = z.infer<typeof insertSopSchema>;
export type Sop = typeof sops.$inferSelect;

// ============ WEBSITE ROLES ============
export const websiteRoles = pgTable("website_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  color: text("color").default("#6b7280"), // hex color for badge
  permissions: text("permissions").array().default(sql`'{}'::text[]`), // admin, police, ems, fire, aos
  staffTier: text("staff_tier"), // director, executive, manager, administrator, moderator, support, development
  discordRoleId: text("discord_role_id"), // Optional mapping to Discord role
  priority: integer("priority").default(0), // Lower = higher priority
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebsiteRoleSchema = createInsertSchema(websiteRoles).omit({
  id: true,
  createdAt: true,
});
export type InsertWebsiteRole = z.infer<typeof insertWebsiteRoleSchema>;
export type WebsiteRole = typeof websiteRoles.$inferSelect;

// ============ USER ROLE ASSIGNMENTS ============
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  roleId: varchar("role_id").notNull(),
  assignedBy: varchar("assigned_by"),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments).omit({
  id: true,
  assignedAt: true,
});
export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;

// ============ ROLE MAPPINGS ============
export const roleMappings = pgTable("role_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discordRoleId: text("discord_role_id").notNull().unique(),
  discordRoleName: text("discord_role_name"),
  websitePermission: text("website_permission").notNull(), // admin, staff, police, ems, fire, aos, etc.
  staffTier: text("staff_tier"), // director, executive, manager, administrator, moderator, support, development
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoleMappingSchema = createInsertSchema(roleMappings).omit({
  id: true,
  createdAt: true,
});
export type InsertRoleMapping = z.infer<typeof insertRoleMappingSchema>;
export type RoleMapping = typeof roleMappings.$inferSelect;

// ============ AOS SQUADS ============
export const aosSquads = pgTable("aos_squads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAosSquadSchema = createInsertSchema(aosSquads).omit({
  id: true,
  createdAt: true,
});
export type InsertAosSquad = z.infer<typeof insertAosSquadSchema>;
export type AosSquad = typeof aosSquads.$inferSelect;

// ============ ADMIN SETTINGS ============
export const adminSettings = pgTable("admin_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  description: text("description"),
  isSecret: boolean("is_secret").default(false),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
export type AdminSetting = typeof adminSettings.$inferSelect;

// ============ MENU ITEMS ============
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  path: text("path").notNull(),
  icon: text("icon"),
  requiredPermission: text("required_permission"), // null = public
  priority: integer("priority").default(0),
  isVisible: boolean("is_visible").default(true),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
});
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// ============ STAFF HIERARCHY (for Meet the Team) ============
export const STAFF_HIERARCHY = [
  "director",
  "executive", 
  "manager",
  "administrator",
  "moderator",
  "support",
  "development"
] as const;

export type StaffTier = typeof STAFF_HIERARCHY[number];
