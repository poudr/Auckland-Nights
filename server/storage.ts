import { 
  type User, type InsertUser, 
  type Department, type InsertDepartment,
  type Rank, type InsertRank,
  type RosterMember, type InsertRosterMember,
  type Application, type InsertApplication,
  type Sop, type InsertSop,
  type RoleMapping, type InsertRoleMapping,
  type AdminSetting, type InsertAdminSetting,
  type MenuItem, type InsertMenuItem,
  users, departments, ranks, rosterMembers, applications, sops, roleMappings, adminSettings, menuItems
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
  
  // Roster
  getRosterByDepartment(departmentCode: string): Promise<RosterMember[]>;
  getRosterMember(id: string): Promise<RosterMember | undefined>;
  getRosterMemberByUser(userId: string, departmentCode: string): Promise<RosterMember | undefined>;
  createRosterMember(member: InsertRosterMember): Promise<RosterMember>;
  updateRosterMember(id: string, updates: Partial<InsertRosterMember>): Promise<RosterMember | undefined>;
  getNextCallsignNumber(departmentCode: string, rankId: string): Promise<number>;
  
  // Applications
  getApplicationsByDepartment(departmentCode: string): Promise<Application[]>;
  getApplicationsByUser(userId: string): Promise<Application[]>;
  createApplication(app: InsertApplication): Promise<Application>;
  updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application | undefined>;
  
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

  // ============ APPLICATIONS ============
  async getApplicationsByDepartment(departmentCode: string): Promise<Application[]> {
    return await db.select().from(applications)
      .where(eq(applications.departmentCode, departmentCode))
      .orderBy(desc(applications.createdAt));
  }

  async getApplicationsByUser(userId: string): Promise<Application[]> {
    return await db.select().from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt));
  }

  async createApplication(app: InsertApplication): Promise<Application> {
    const [created] = await db.insert(applications).values(app).returning();
    return created;
  }

  async updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application | undefined> {
    const [updated] = await db.update(applications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return updated;
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
}

export const storage = new DatabaseStorage();
