import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User accounts linked to Discord
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  discriminator: text("discriminator"),
  avatar: text("avatar"),
  email: text("email"),
  roles: text("roles").array().default(sql`'{}'::text[]`),
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

// Staff hierarchy configuration
export const staffRoles = pgTable("staff_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discordRoleId: text("discord_role_id").notNull().unique(),
  name: text("name").notNull(),
  tier: text("tier").notNull(), // "management", "administrators", "moderators"
  priority: text("priority").notNull().default("0"),
});

export const insertStaffRoleSchema = createInsertSchema(staffRoles).omit({
  id: true,
});

export type InsertStaffRole = z.infer<typeof insertStaffRoleSchema>;
export type StaffRole = typeof staffRoles.$inferSelect;
