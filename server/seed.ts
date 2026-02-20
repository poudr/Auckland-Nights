import { db } from "./db";
import { departments, ranks, menuItems, websiteRoles, roleMappings, supportForms } from "@shared/schema";

export async function seedDatabase() {
  // Check if already seeded
  const existingDepts = await db.select().from(departments);
  if (existingDepts.length > 0) {
    console.log("Database already seeded");
    return;
  }

  console.log("Seeding database...");

  // Seed Departments
  await db.insert(departments).values([
    { code: "police", name: "Auckland Police Department", color: "#3B82F6", icon: "Shield", description: "Serving and protecting the citizens of Tamaki Makaurau." },
    { code: "fire", name: "NZ Fire & Emergency", color: "#EF4444", icon: "Flame", description: "Emergency fire response and rescue operations." },
    { code: "ems", name: "Emergency Ambulance Service", color: "#22C55E", icon: "HeartPulse", description: "Providing world-class emergency medical care." },
    { code: "aos", name: "Armed Offenders Squad (AOS)", color: "#8B5CF6", icon: "Target", description: "Special operations and tactical response unit." },
    { code: "towing", name: "Auckland Towing", color: "#F59E0B", icon: "Truck", description: "Vehicle recovery and towing services for Tamaki Makaurau." },
    { code: "traffic", name: "Auckland Traffic Control", color: "#F97316", icon: "TrafficCone", description: "Traffic management and control services for Tamaki Makaurau." },
  ]);

  // Seed Police Ranks
  await db.insert(ranks).values([
    // Leadership
    { departmentCode: "police", name: "Commissioner", abbreviation: "COMM", priority: 1, isLeadership: true, callsignPrefix: "1-" },
    { departmentCode: "police", name: "Deputy Commissioner", abbreviation: "D/COMM", priority: 2, isLeadership: true, callsignPrefix: "1-" },
    { departmentCode: "police", name: "Assistant Commissioner", abbreviation: "A/COMM", priority: 3, isLeadership: true, callsignPrefix: "1-" },
    { departmentCode: "police", name: "Superintendent (Executive)", abbreviation: "SUPT-E", priority: 4, isLeadership: true, callsignPrefix: "1-" },
    { departmentCode: "police", name: "Superintendent (Non-Executive)", abbreviation: "SUPT", priority: 5, isLeadership: true, callsignPrefix: "1-" },
    // Non-Leadership
    { departmentCode: "police", name: "Inspector", abbreviation: "INSP", priority: 6, isLeadership: false, callsignPrefix: "2-" },
    { departmentCode: "police", name: "Senior Sergeant", abbreviation: "S/SGT", priority: 7, isLeadership: false, callsignPrefix: "2-" },
    { departmentCode: "police", name: "Sergeant", abbreviation: "SGT", priority: 8, isLeadership: false, callsignPrefix: "3-" },
    { departmentCode: "police", name: "Senior Constable", abbreviation: "S/CONST", priority: 9, isLeadership: false, callsignPrefix: "4-" },
    { departmentCode: "police", name: "Constable", abbreviation: "CONST", priority: 10, isLeadership: false, callsignPrefix: "5-" },
    { departmentCode: "police", name: "Recruit", abbreviation: "REC", priority: 11, isLeadership: false, callsignPrefix: "6-" },
  ]);

  // Seed Fire Ranks
  await db.insert(ranks).values([
    // Leadership
    { departmentCode: "fire", name: "District Manager", abbreviation: "DM", priority: 1, isLeadership: true, callsignPrefix: "1-" },
    { departmentCode: "fire", name: "Group Manager", abbreviation: "GM", priority: 2, isLeadership: true, callsignPrefix: "1-" },
    // Non-Leadership
    { departmentCode: "fire", name: "Senior Station Officer", abbreviation: "SSO", priority: 3, isLeadership: false, callsignPrefix: "2-" },
    { departmentCode: "fire", name: "Station Officer", abbreviation: "SO", priority: 4, isLeadership: false, callsignPrefix: "2-" },
    { departmentCode: "fire", name: "Senior Firefighter", abbreviation: "SFF", priority: 5, isLeadership: false, callsignPrefix: "3-" },
    { departmentCode: "fire", name: "Qualified Firefighter", abbreviation: "QFF", priority: 6, isLeadership: false, callsignPrefix: "4-" },
    { departmentCode: "fire", name: "Firefighter", abbreviation: "FF", priority: 7, isLeadership: false, callsignPrefix: "5-" },
    { departmentCode: "fire", name: "Recruit", abbreviation: "REC", priority: 8, isLeadership: false, callsignPrefix: "6-" },
  ]);

  // Seed EMS Ranks
  await db.insert(ranks).values([
    // Leadership
    { departmentCode: "ems", name: "District Operations Manager", abbreviation: "DOM", priority: 1, isLeadership: true, callsignPrefix: "1-" },
    { departmentCode: "ems", name: "Group Operations Manager", abbreviation: "GOM", priority: 2, isLeadership: true, callsignPrefix: "1-" },
    { departmentCode: "ems", name: "Watch Operations Manager", abbreviation: "WOM", priority: 3, isLeadership: true, callsignPrefix: "1-" },
    // Non-Leadership
    { departmentCode: "ems", name: "Critical Care Paramedic", abbreviation: "CCP", priority: 4, isLeadership: false, callsignPrefix: "2-" },
    { departmentCode: "ems", name: "Intensive Care Paramedic", abbreviation: "ICP", priority: 5, isLeadership: false, callsignPrefix: "2-" },
    { departmentCode: "ems", name: "Paramedic", abbreviation: "PM", priority: 6, isLeadership: false, callsignPrefix: "3-" },
    { departmentCode: "ems", name: "Emergency Medical Technician", abbreviation: "EMT", priority: 7, isLeadership: false, callsignPrefix: "4-" },
    { departmentCode: "ems", name: "First Responder", abbreviation: "FR", priority: 8, isLeadership: false, callsignPrefix: "5-" },
  ]);

  // Seed Department Access Role Mappings
  await db.insert(roleMappings).values([
    { discordRoleId: "1027902719010279445", discordRoleName: "Auckland Police", websitePermission: "police", staffTier: null, priority: 100 },
    { discordRoleId: "1027908734804037702", discordRoleName: "Fire Rescue Service", websitePermission: "fire", staffTier: null, priority: 100 },
    { discordRoleId: "1027902716665663488", discordRoleName: "Emergency Ambulance Service", websitePermission: "ems", staffTier: null, priority: 100 },
    { discordRoleId: "1410115394399633408", discordRoleName: "AOS", websitePermission: "aos", staffTier: null, priority: 100 },
    { discordRoleId: "1404050461581115453", discordRoleName: "Auckland Towing", websitePermission: "towing", staffTier: null, priority: 100 },
  ]);

  // Seed Staff Roles
  await db.insert(websiteRoles).values([
    { name: "director", displayName: "Director", description: "Server Director - Full access", color: "#f97316", permissions: ["admin", "police", "fire", "ems", "aos", "towing", "traffic"], staffTier: "director", priority: 1 },
    { name: "executive", displayName: "Executive", description: "Server Executive - Full access", color: "#f59e0b", permissions: ["admin", "police", "fire", "ems", "aos", "towing", "traffic"], staffTier: "executive", priority: 2 },
    { name: "manager", displayName: "Manager", description: "Server Manager", color: "#eab308", permissions: ["admin", "police", "fire", "ems", "aos", "towing", "traffic"], staffTier: "manager", priority: 3 },
    { name: "administrator", displayName: "Administrator", description: "Server Administrator", color: "#84cc16", permissions: ["admin"], staffTier: "administrator", priority: 4 },
    { name: "moderator", displayName: "Moderator", description: "Server Moderator", color: "#22c55e", permissions: [], staffTier: "moderator", priority: 5 },
    { name: "support", displayName: "Support", description: "Support Staff", color: "#06b6d4", permissions: [], staffTier: "support", priority: 6 },
  ]);

  // Seed Menu Items
  await db.insert(menuItems).values([
    { label: "Home", path: "/", priority: 0, isVisible: true },
    { label: "How to Join", path: "/join", priority: 1, isVisible: true },
    { label: "Meet the Team", path: "/team", priority: 2, isVisible: true },
    { label: "Departments", path: "/departments", priority: 3, isVisible: true },
    { label: "Support", path: "/support", priority: 4, isVisible: true },
    { label: "Admin", path: "/admin", priority: 10, isVisible: true, requiredPermission: "admin" },
  ]);

  // Seed Support Forms
  await db.insert(supportForms).values([
    { key: "staff_applications", title: "Staff Applications", description: "Apply to join our staff team and help manage the server.", accessTiers: ["executive", "director"] },
    { key: "ban_appeals", title: "Ban Appeals", description: "Appeal a ban or punishment you've received.", accessTiers: ["manager", "executive", "director"] },
    { key: "events_staff", title: "Events Staff Applications", description: "Apply to help organize and run community events.", accessTiers: ["manager", "executive", "director"] },
    { key: "social_media", title: "Social Media Applications", description: "Apply to manage our social media presence.", accessTiers: ["manager", "executive", "director"] },
    { key: "civx_applications", title: "CivX Applications", description: "Apply for CivX roles and activities.", accessTiers: ["manager", "executive", "director"] },
    { key: "gang_applications", title: "Gang Applications", description: "Apply to register or manage a gang.", accessTiers: ["manager", "executive", "director"] },
    { key: "development_applications", title: "Development Applications", description: "Apply to join the development team.", accessTiers: ["manager", "executive", "director"] },
  ]);

  console.log("Database seeded successfully!");
}
