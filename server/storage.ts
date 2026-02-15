import { 
  type User, type InsertUser, 
  type Department, type InsertDepartment,
  type Rank, type InsertRank,
  type RosterMember, type InsertRosterMember,
  type ApplicationForm, type InsertApplicationForm,
  type ApplicationQuestion, type InsertApplicationQuestion,
  type ApplicationSubmission, type InsertApplicationSubmission,
  type ApplicationMessage, type InsertApplicationMessage,
  type Notification, type InsertNotification,
  type Sop, type InsertSop,
  type RoleMapping, type InsertRoleMapping,
  type AdminSetting, type InsertAdminSetting,
  type MenuItem, type InsertMenuItem,
  type WebsiteRole, type InsertWebsiteRole,
  type UserRoleAssignment, type InsertUserRoleAssignment,
  type AosSquad, type InsertAosSquad,
  users, departments, ranks, rosterMembers, applicationForms, applicationQuestions, applicationSubmissions, applicationMessages, notifications, sops, roleMappings, adminSettings, menuItems, websiteRoles, userRoleAssignments, aosSquads
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(discordId: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getStaffMembers(): Promise<User[]>;
  
  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartment(code: string): Promise<Department | undefined>;
  createDepartment(dept: InsertDepartment): Promise<Department>;
  updateDepartment(code: string, updates: Partial<InsertDepartment>): Promise<Department | undefined>;
  
  // Ranks
  getRanksByDepartment(departmentCode: string): Promise<Rank[]>;
  getRank(id: string): Promise<Rank | undefined>;
  createRank(rank: InsertRank): Promise<Rank>;
  updateRank(id: string, updates: Partial<InsertRank>): Promise<Rank | undefined>;
  deleteRank(id: string): Promise<boolean>;
  
  // Roster
  getRosterByDepartment(departmentCode: string): Promise<RosterMember[]>;
  getRosterMember(id: string): Promise<RosterMember | undefined>;
  getRosterMemberByUser(userId: string, departmentCode: string): Promise<RosterMember | undefined>;
  createRosterMember(member: InsertRosterMember): Promise<RosterMember>;
  updateRosterMember(id: string, updates: Partial<InsertRosterMember>): Promise<RosterMember | undefined>;
  getNextCallsignNumber(departmentCode: string, rankId: string): Promise<number>;
  
  // Application Forms
  getApplicationFormsByDepartment(departmentCode: string): Promise<ApplicationForm[]>;
  getApplicationForm(id: string): Promise<ApplicationForm | undefined>;
  createApplicationForm(form: InsertApplicationForm): Promise<ApplicationForm>;
  updateApplicationForm(id: string, updates: Partial<InsertApplicationForm>): Promise<ApplicationForm | undefined>;
  deleteApplicationForm(id: string): Promise<void>;

  // Application Questions
  getQuestionsByForm(formId: string): Promise<ApplicationQuestion[]>;
  createApplicationQuestion(question: InsertApplicationQuestion): Promise<ApplicationQuestion>;
  updateApplicationQuestion(id: string, updates: Partial<InsertApplicationQuestion>): Promise<ApplicationQuestion | undefined>;
  deleteApplicationQuestion(id: string): Promise<void>;
  deleteQuestionsByForm(formId: string): Promise<void>;

  // Application Submissions
  getSubmissionsByDepartment(departmentCode: string): Promise<ApplicationSubmission[]>;
  getSubmissionsByUser(userId: string): Promise<ApplicationSubmission[]>;
  getSubmission(id: string): Promise<ApplicationSubmission | undefined>;
  createSubmission(submission: InsertApplicationSubmission): Promise<ApplicationSubmission>;
  updateSubmission(id: string, updates: Partial<InsertApplicationSubmission>): Promise<ApplicationSubmission | undefined>;

  // Application Messages
  getMessagesBySubmission(submissionId: string): Promise<ApplicationMessage[]>;
  createMessage(message: InsertApplicationMessage): Promise<ApplicationMessage>;

  // Notifications
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  
  // SOPs
  getSopsByDepartment(departmentCode: string): Promise<Sop[]>;
  getSop(id: string): Promise<Sop | undefined>;
  createSop(sop: InsertSop): Promise<Sop>;
  updateSop(id: string, updates: Partial<InsertSop>): Promise<Sop | undefined>;
  deleteSop(id: string): Promise<void>;
  
  // Role Mappings
  getRoleMappings(): Promise<RoleMapping[]>;
  getRoleMappingByDiscordId(discordRoleId: string): Promise<RoleMapping | undefined>;
  createRoleMapping(mapping: InsertRoleMapping): Promise<RoleMapping>;
  updateRoleMapping(id: string, updates: Partial<InsertRoleMapping>): Promise<RoleMapping | undefined>;
  deleteRoleMapping(id: string): Promise<void>;
  
  // Admin Settings
  getAdminSettings(): Promise<AdminSetting[]>;
  getAdminSetting(key: string): Promise<AdminSetting | undefined>;
  upsertAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting>;
  
  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, updates: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<void>;
  
  // Website Roles
  getWebsiteRoles(): Promise<WebsiteRole[]>;
  getWebsiteRole(id: string): Promise<WebsiteRole | undefined>;
  createWebsiteRole(role: InsertWebsiteRole): Promise<WebsiteRole>;
  updateWebsiteRole(id: string, updates: Partial<InsertWebsiteRole>): Promise<WebsiteRole | undefined>;
  deleteWebsiteRole(id: string): Promise<void>;
  
  // User Role Assignments
  getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]>;
  assignRoleToUser(assignment: InsertUserRoleAssignment): Promise<UserRoleAssignment>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;

  // AOS Squads
  getAosSquads(): Promise<AosSquad[]>;
  getAosSquad(id: string): Promise<AosSquad | undefined>;
  createAosSquad(squad: InsertAosSquad): Promise<AosSquad>;
  updateAosSquad(id: string, updates: Partial<InsertAosSquad>): Promise<AosSquad | undefined>;
  deleteAosSquad(id: string): Promise<void>;
  getUsersWithRole(roleId: string): Promise<UserRoleAssignment[]>;
}

export class DatabaseStorage implements IStorage {
  // ============ USERS ============
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(discordId: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.discordId, discordId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getStaffMembers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isStaff, true));
  }

  // ============ DEPARTMENTS ============
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).where(eq(departments.isActive, true));
  }

  async getDepartment(code: string): Promise<Department | undefined> {
    const [dept] = await db.select().from(departments).where(eq(departments.code, code));
    return dept;
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const [created] = await db.insert(departments).values(dept).returning();
    return created;
  }

  async updateDepartment(code: string, updates: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updated] = await db.update(departments).set(updates).where(eq(departments.code, code)).returning();
    return updated;
  }

  // ============ RANKS ============
  async getRanksByDepartment(departmentCode: string): Promise<Rank[]> {
    return await db.select().from(ranks)
      .where(eq(ranks.departmentCode, departmentCode))
      .orderBy(asc(ranks.priority));
  }

  async getRank(id: string): Promise<Rank | undefined> {
    const [rank] = await db.select().from(ranks).where(eq(ranks.id, id));
    return rank;
  }

  async createRank(rank: InsertRank): Promise<Rank> {
    const [created] = await db.insert(ranks).values(rank).returning();
    return created;
  }

  async updateRank(id: string, updates: Partial<InsertRank>): Promise<Rank | undefined> {
    const [updated] = await db.update(ranks).set(updates).where(eq(ranks.id, id)).returning();
    return updated;
  }

  async deleteRank(id: string): Promise<boolean> {
    const result = await db.delete(ranks).where(eq(ranks.id, id)).returning();
    return result.length > 0;
  }

  // ============ ROSTER ============
  async getRosterByDepartment(departmentCode: string): Promise<RosterMember[]> {
    return await db.select().from(rosterMembers)
      .where(and(eq(rosterMembers.departmentCode, departmentCode), eq(rosterMembers.isActive, true)));
  }

  async getRosterMember(id: string): Promise<RosterMember | undefined> {
    const [member] = await db.select().from(rosterMembers).where(eq(rosterMembers.id, id));
    return member;
  }

  async getRosterMemberByUser(userId: string, departmentCode: string): Promise<RosterMember | undefined> {
    const [member] = await db.select().from(rosterMembers)
      .where(and(eq(rosterMembers.userId, userId), eq(rosterMembers.departmentCode, departmentCode)));
    return member;
  }

  async createRosterMember(member: InsertRosterMember): Promise<RosterMember> {
    const [created] = await db.insert(rosterMembers).values(member).returning();
    return created;
  }

  async updateRosterMember(id: string, updates: Partial<InsertRosterMember>): Promise<RosterMember | undefined> {
    const [updated] = await db.update(rosterMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rosterMembers.id, id))
      .returning();
    return updated;
  }

  async getNextCallsignNumber(departmentCode: string, rankId: string): Promise<number> {
    const existing = await db.select({ callsignNumber: rosterMembers.callsignNumber })
      .from(rosterMembers)
      .where(and(
        eq(rosterMembers.departmentCode, departmentCode),
        eq(rosterMembers.rankId, rankId),
        eq(rosterMembers.isActive, true)
      ));
    
    const usedNumbers = existing.map(m => m.callsignNumber).filter(n => n !== null) as number[];
    let nextNumber = 1;
    while (usedNumbers.includes(nextNumber)) {
      nextNumber++;
    }
    return nextNumber;
  }

  // ============ APPLICATION FORMS ============
  async getApplicationFormsByDepartment(departmentCode: string): Promise<ApplicationForm[]> {
    return await db.select().from(applicationForms)
      .where(eq(applicationForms.departmentCode, departmentCode))
      .orderBy(desc(applicationForms.createdAt));
  }

  async getApplicationForm(id: string): Promise<ApplicationForm | undefined> {
    const [form] = await db.select().from(applicationForms).where(eq(applicationForms.id, id));
    return form;
  }

  async createApplicationForm(form: InsertApplicationForm): Promise<ApplicationForm> {
    const [created] = await db.insert(applicationForms).values(form).returning();
    return created;
  }

  async updateApplicationForm(id: string, updates: Partial<InsertApplicationForm>): Promise<ApplicationForm | undefined> {
    const [updated] = await db.update(applicationForms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(applicationForms.id, id))
      .returning();
    return updated;
  }

  async deleteApplicationForm(id: string): Promise<void> {
    await db.update(applicationForms).set({ isActive: false }).where(eq(applicationForms.id, id));
  }

  // ============ APPLICATION QUESTIONS ============
  async getQuestionsByForm(formId: string): Promise<ApplicationQuestion[]> {
    return await db.select().from(applicationQuestions)
      .where(eq(applicationQuestions.formId, formId))
      .orderBy(asc(applicationQuestions.priority));
  }

  async createApplicationQuestion(question: InsertApplicationQuestion): Promise<ApplicationQuestion> {
    const [created] = await db.insert(applicationQuestions).values(question).returning();
    return created;
  }

  async updateApplicationQuestion(id: string, updates: Partial<InsertApplicationQuestion>): Promise<ApplicationQuestion | undefined> {
    const [updated] = await db.update(applicationQuestions).set(updates).where(eq(applicationQuestions.id, id)).returning();
    return updated;
  }

  async deleteApplicationQuestion(id: string): Promise<void> {
    await db.delete(applicationQuestions).where(eq(applicationQuestions.id, id));
  }

  async deleteQuestionsByForm(formId: string): Promise<void> {
    await db.delete(applicationQuestions).where(eq(applicationQuestions.formId, formId));
  }

  // ============ APPLICATION SUBMISSIONS ============
  async getSubmissionsByDepartment(departmentCode: string): Promise<ApplicationSubmission[]> {
    return await db.select().from(applicationSubmissions)
      .where(eq(applicationSubmissions.departmentCode, departmentCode))
      .orderBy(desc(applicationSubmissions.createdAt));
  }

  async getSubmissionsByUser(userId: string): Promise<ApplicationSubmission[]> {
    return await db.select().from(applicationSubmissions)
      .where(eq(applicationSubmissions.userId, userId))
      .orderBy(desc(applicationSubmissions.createdAt));
  }

  async getSubmission(id: string): Promise<ApplicationSubmission | undefined> {
    const [sub] = await db.select().from(applicationSubmissions).where(eq(applicationSubmissions.id, id));
    return sub;
  }

  async createSubmission(submission: InsertApplicationSubmission): Promise<ApplicationSubmission> {
    const [created] = await db.insert(applicationSubmissions).values(submission).returning();
    return created;
  }

  async updateSubmission(id: string, updates: Partial<InsertApplicationSubmission>): Promise<ApplicationSubmission | undefined> {
    const [updated] = await db.update(applicationSubmissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(applicationSubmissions.id, id))
      .returning();
    return updated;
  }

  // ============ APPLICATION MESSAGES ============
  async getMessagesBySubmission(submissionId: string): Promise<ApplicationMessage[]> {
    return await db.select().from(applicationMessages)
      .where(eq(applicationMessages.submissionId, submissionId))
      .orderBy(asc(applicationMessages.createdAt));
  }

  async createMessage(message: InsertApplicationMessage): Promise<ApplicationMessage> {
    const [created] = await db.insert(applicationMessages).values(message).returning();
    return created;
  }

  // ============ NOTIFICATIONS ============
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  // ============ SOPs ============
  async getSopsByDepartment(departmentCode: string): Promise<Sop[]> {
    return await db.select().from(sops)
      .where(and(eq(sops.departmentCode, departmentCode), eq(sops.isActive, true)))
      .orderBy(asc(sops.title));
  }

  async getSop(id: string): Promise<Sop | undefined> {
    const [sop] = await db.select().from(sops).where(eq(sops.id, id));
    return sop;
  }

  async createSop(sop: InsertSop): Promise<Sop> {
    const [created] = await db.insert(sops).values(sop).returning();
    return created;
  }

  async updateSop(id: string, updates: Partial<InsertSop>): Promise<Sop | undefined> {
    const [updated] = await db.update(sops)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sops.id, id))
      .returning();
    return updated;
  }

  async deleteSop(id: string): Promise<void> {
    await db.update(sops).set({ isActive: false }).where(eq(sops.id, id));
  }

  // ============ ROLE MAPPINGS ============
  async getRoleMappings(): Promise<RoleMapping[]> {
    return await db.select().from(roleMappings).orderBy(asc(roleMappings.priority));
  }

  async getRoleMappingByDiscordId(discordRoleId: string): Promise<RoleMapping | undefined> {
    const [mapping] = await db.select().from(roleMappings).where(eq(roleMappings.discordRoleId, discordRoleId));
    return mapping;
  }

  async createRoleMapping(mapping: InsertRoleMapping): Promise<RoleMapping> {
    const [created] = await db.insert(roleMappings).values(mapping).returning();
    return created;
  }

  async updateRoleMapping(id: string, updates: Partial<InsertRoleMapping>): Promise<RoleMapping | undefined> {
    const [updated] = await db.update(roleMappings).set(updates).where(eq(roleMappings.id, id)).returning();
    return updated;
  }

  async deleteRoleMapping(id: string): Promise<void> {
    await db.delete(roleMappings).where(eq(roleMappings.id, id));
  }

  // ============ ADMIN SETTINGS ============
  async getAdminSettings(): Promise<AdminSetting[]> {
    return await db.select().from(adminSettings);
  }

  async getAdminSetting(key: string): Promise<AdminSetting | undefined> {
    const [setting] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    return setting;
  }

  async upsertAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting> {
    const existing = await this.getAdminSetting(setting.key);
    if (existing) {
      const [updated] = await db.update(adminSettings)
        .set({ ...setting, updatedAt: new Date() })
        .where(eq(adminSettings.key, setting.key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(adminSettings).values(setting).returning();
    return created;
  }

  // ============ MENU ITEMS ============
  async getMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems).orderBy(asc(menuItems.priority));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  async updateMenuItem(id: string, updates: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db.update(menuItems).set(updates).where(eq(menuItems.id, id)).returning();
    return updated;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // ============ WEBSITE ROLES ============
  async getWebsiteRoles(): Promise<WebsiteRole[]> {
    return await db.select().from(websiteRoles).where(eq(websiteRoles.isActive, true)).orderBy(asc(websiteRoles.priority));
  }

  async getWebsiteRole(id: string): Promise<WebsiteRole | undefined> {
    const [role] = await db.select().from(websiteRoles).where(eq(websiteRoles.id, id));
    return role;
  }

  async createWebsiteRole(role: InsertWebsiteRole): Promise<WebsiteRole> {
    const [created] = await db.insert(websiteRoles).values(role).returning();
    return created;
  }

  async updateWebsiteRole(id: string, updates: Partial<InsertWebsiteRole>): Promise<WebsiteRole | undefined> {
    const [updated] = await db.update(websiteRoles).set(updates).where(eq(websiteRoles.id, id)).returning();
    return updated;
  }

  async deleteWebsiteRole(id: string): Promise<void> {
    await db.update(websiteRoles).set({ isActive: false }).where(eq(websiteRoles.id, id));
  }

  // ============ USER ROLE ASSIGNMENTS ============
  async getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
    return await db.select().from(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));
  }

  async assignRoleToUser(assignment: InsertUserRoleAssignment): Promise<UserRoleAssignment> {
    const [created] = await db.insert(userRoleAssignments).values(assignment).returning();
    return created;
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await db.delete(userRoleAssignments).where(
      and(eq(userRoleAssignments.userId, userId), eq(userRoleAssignments.roleId, roleId))
    );
  }

  async getUsersWithRole(roleId: string): Promise<UserRoleAssignment[]> {
    return await db.select().from(userRoleAssignments).where(eq(userRoleAssignments.roleId, roleId));
  }

  // ============ AOS SQUADS ============
  async getAosSquads(): Promise<AosSquad[]> {
    return await db.select().from(aosSquads).orderBy(asc(aosSquads.priority));
  }

  async getAosSquad(id: string): Promise<AosSquad | undefined> {
    const [squad] = await db.select().from(aosSquads).where(eq(aosSquads.id, id));
    return squad;
  }

  async createAosSquad(squad: InsertAosSquad): Promise<AosSquad> {
    const [created] = await db.insert(aosSquads).values(squad).returning();
    return created;
  }

  async updateAosSquad(id: string, updates: Partial<InsertAosSquad>): Promise<AosSquad | undefined> {
    const [updated] = await db.update(aosSquads).set(updates).where(eq(aosSquads.id, id)).returning();
    return updated;
  }

  async deleteAosSquad(id: string): Promise<void> {
    await db.delete(aosSquads).where(eq(aosSquads.id, id));
  }
}

export const storage = new DatabaseStorage();
