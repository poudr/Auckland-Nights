import { type User, type InsertUser, type StaffRole, type InsertStaffRole, users, staffRoles } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(discordId: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllStaff(): Promise<User[]>;
  getStaffRoles(): Promise<StaffRole[]>;
  upsertStaffRole(role: InsertStaffRole): Promise<StaffRole>;
}

export class DatabaseStorage implements IStorage {
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

  async getAllStaff(): Promise<User[]> {
    // Return all users who have staff-related roles
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async getStaffRoles(): Promise<StaffRole[]> {
    return await db.select().from(staffRoles);
  }

  async upsertStaffRole(role: InsertStaffRole): Promise<StaffRole> {
    const existing = await db.select().from(staffRoles).where(eq(staffRoles.discordRoleId, role.discordRoleId));
    if (existing.length > 0) {
      const [updated] = await db
        .update(staffRoles)
        .set(role)
        .where(eq(staffRoles.discordRoleId, role.discordRoleId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(staffRoles).values(role).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
