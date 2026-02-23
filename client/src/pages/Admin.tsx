import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, Users, Link2, RefreshCw, Shield, Trash2, Plus, ChevronLeft, ChevronDown, Check, 
  UserCog, Tag, Cog, Edit, X, ChevronRight, ArrowUp, ArrowDown,
  LayoutDashboard, Lock, Globe, ClipboardList, Activity, FileText, Eye
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUser, useAuthStatus, hasPermission, getAvatarUrl } from "@/lib/auth";

const STAFF_HIERARCHY = ["director", "executive", "manager", "administrator", "moderator", "support", "development"] as const;

const AVAILABLE_PERMISSIONS = [
  { id: "admin", label: "Admin", description: "Full admin access" },
  { id: "police", label: "Police", description: "Auckland Police Department portal" },
  { id: "fire", label: "Fire", description: "NZ Fire & Emergency portal" },
  { id: "ems", label: "EMS", description: "Emergency Ambulance Service portal" },
  { id: "aos", label: "AOS", description: "Armed Offenders Squad portal" },
] as const;

interface RoleMapping {
  id: string;
  discordRoleId: string;
  discordRoleName: string | null;
  websitePermission: string;
  staffTier: string | null;
}

interface WebsiteRole {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  color: string | null;
  permissions: string[] | null;
  staffTier: string | null;
  discordRoleId: string | null;
  priority: number | null;
}

interface AdminUser {
  id: string;
  discordId: string;
  username: string;
  avatar: string | null;
  isStaff: boolean | null;
  staffTier: string | null;
  websiteRoles: string[] | null;
  roles: string[] | null;
  updatedAt: string | null;
}

const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users Overview", icon: Users },
  { id: "players", label: "Player Management", icon: UserCog },
  { id: "roles", label: "Role Management", icon: Tag },
  { id: "access", label: "Access Control", icon: Lock },
  { id: "seo", label: "SEO Management", icon: Globe },
  { id: "audit", label: "Audit Log", icon: ClipboardList },
  { id: "settings", label: "Settings", icon: Cog },
];

async function fetchUsers(): Promise<{ users: AdminUser[] }> {
  const res = await fetch("/api/admin/users", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function fetchRoleMappings(): Promise<{ mappings: RoleMapping[] }> {
  const res = await fetch("/api/admin/role-mappings", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch mappings");
  return res.json();
}

async function fetchWebsiteRoles(): Promise<{ roles: WebsiteRole[] }> {
  const res = await fetch("/api/admin/website-roles", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch website roles");
  return res.json();
}

async function createRoleMapping(data: Partial<RoleMapping>): Promise<{ mapping: RoleMapping }> {
  const res = await fetch("/api/admin/role-mappings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create mapping");
  return res.json();
}

async function deleteRoleMapping(id: string): Promise<void> {
  const res = await fetch(`/api/admin/role-mappings/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete mapping");
}

async function syncAllRoles(): Promise<{ synced: number; failed: number; total: number }> {
  const res = await fetch("/api/admin/sync-all-roles", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to sync roles");
  return res.json();
}

async function createWebsiteRole(data: Partial<WebsiteRole>): Promise<{ role: WebsiteRole }> {
  const res = await fetch("/api/admin/website-roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create website role");
  return res.json();
}

async function updateWebsiteRole(id: string, data: Partial<WebsiteRole>): Promise<{ role: WebsiteRole }> {
  const res = await fetch(`/api/admin/website-roles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update website role");
  return res.json();
}

async function deleteWebsiteRole(id: string): Promise<void> {
  const res = await fetch(`/api/admin/website-roles/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete website role");
}

async function updateUser(userId: string, data: Partial<AdminUser>): Promise<{ user: AdminUser }> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ roleId }),
  });
  if (!res.ok) throw new Error("Failed to assign role");
}

async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/roles/${roleId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to remove role");
}

async function fetchUserRoles(userId: string): Promise<{ roles: WebsiteRole[], assignments: any[] }> {
  const res = await fetch(`/api/admin/users/${userId}/roles`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch user roles");
  return res.json();
}

interface DepartmentRank {
  id: string;
  name: string;
  abbreviation: string | null;
  priority: number;
  discordRoleId: string | null;
  callsignPrefix: string | null;
  isLeadership: boolean;
  departmentCode: string;
}

interface DepartmentInfo {
  id: string;
  code: string;
  name: string;
  color: string;
  icon: string;
}

async function fetchDepartmentRanks(): Promise<{ departments: Record<string, { department: DepartmentInfo; ranks: DepartmentRank[] }> }> {
  const res = await fetch("/api/admin/department-ranks", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch department ranks");
  return res.json();
}

async function updateDepartmentRank(deptCode: string, rankId: string, data: Partial<DepartmentRank>): Promise<any> {
  const res = await fetch(`/api/departments/${deptCode}/ranks/${rankId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update rank");
  return res.json();
}

export default function Admin() {
  const [, params] = useRoute("/admin/:tab?");
  const activeTab = params?.tab || "dashboard";
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading: userLoading } = useUser();
  const { data: authStatus, isLoading: authLoading } = useAuthStatus();
  
  const canAccessAdmin = hasPermission(user ?? null, "admin", authStatus?.isBootstrapMode);

  const { data: accessibleTabs, isLoading: tabsLoading } = useQuery({
    queryKey: ["adminAccessibleTabs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/accessible-tabs", { credentials: "include" });
      if (!res.ok) return null;
      return res.json() as Promise<{ tabs: Record<string, boolean> }>;
    },
    enabled: !!user && canAccessAdmin,
  });

  if (userLoading || authLoading || tabsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-6 flex justify-center">
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      </div>
    );
  }

  if (!user || !canAccessAdmin) {
    return <Redirect to="/" />;
  }

  const tabAccess = accessibleTabs?.tabs || {};
  const visibleSidebarItems = SIDEBAR_ITEMS.filter((item) => tabAccess[item.id] !== false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-20 flex">
        <aside className="w-64 min-h-screen bg-zinc-900/50 border-r border-white/5 p-4 fixed left-0 top-20">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground mb-4">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-primary">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">Server Management</p>
              </div>
            </div>
          </div>
          
          <nav className="space-y-1">
            {visibleSidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Link key={item.id} href={`/admin/${item.id}`}>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      isActive 
                        ? "bg-primary/20 text-primary" 
                        : "text-muted-foreground hover:bg-zinc-800 hover:text-foreground"
                    }`}
                    data-testid={`nav-admin-${item.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 ml-64 p-8">
          <div className="max-w-5xl">
            {activeTab === "dashboard" && tabAccess.dashboard !== false && <DashboardTab />}
            {activeTab === "users" && tabAccess.users !== false && <UsersOverviewTab />}
            {activeTab === "players" && tabAccess.players !== false && <PlayerManagementTab />}
            {activeTab === "roles" && tabAccess.roles !== false && <RoleManagementTab />}
            {activeTab === "access" && tabAccess.access !== false && <AccessControlTab />}
            {activeTab === "seo" && tabAccess.seo !== false && <SeoManagementTab />}
            {activeTab === "audit" && tabAccess.audit !== false && <AuditLogTab />}
            {activeTab === "settings" && tabAccess.settings !== false && <SettingsTab />}
            {tabAccess[activeTab] === false && (
              <div className="text-center py-20">
                <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                <p className="text-muted-foreground">You don't have permission to access this section.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function UsersOverviewTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: fetchUsers,
  });

  const syncMutation = useMutation({
    mutationFn: syncAllRoles,
    onSuccess: (result) => {
      toast({
        title: "Roles Synced",
        description: `Successfully synced ${result.synced} users. ${result.failed} failed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync user roles from Discord.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const users = data?.users || [];
  const staffUsers = users.filter(u => u.isStaff);
  const regularUsers = users.filter(u => !u.isStaff);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Users Overview</h2>
          <p className="text-muted-foreground">{users.length} total users, {staffUsers.length} staff members</p>
        </div>
        <Button 
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-roles"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sync All Discord Roles
        </Button>
      </div>

      {staffUsers.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-4 uppercase tracking-widest text-primary">
            Staff Members ({staffUsers.length})
          </h3>
          <div className="space-y-2">
            {staffUsers.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </div>
        </section>
      )}

      {regularUsers.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-4 uppercase tracking-widest text-muted-foreground">
            Regular Users ({regularUsers.length})
          </h3>
          <div className="space-y-2">
            {regularUsers.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800">
        <img 
          src={getAvatarUrl({ discordId: user.discordId, avatar: user.avatar })} 
          alt={user.displayName || user.username}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1">
        <span className="font-medium">{user.displayName || user.username}</span>
        <p className="text-xs text-muted-foreground">@{user.username} • {user.discordId}</p>
      </div>
      {user.staffTier && (
        <Badge className="capitalize bg-primary text-black">{user.staffTier}</Badge>
      )}
      <div className="flex gap-1">
        {user.websiteRoles?.slice(0, 3).map((role) => (
          <Badge key={role} variant="outline" className="text-xs">
            {role}
          </Badge>
        ))}
        {(user.websiteRoles?.length || 0) > 3 && (
          <Badge variant="outline" className="text-xs">
            +{(user.websiteRoles?.length || 0) - 3}
          </Badge>
        )}
      </div>
    </div>
  );
}

function PlayerManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: fetchUsers,
  });
  
  const { data: rolesData } = useQuery({
    queryKey: ["websiteRoles"],
    queryFn: fetchWebsiteRoles,
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<AdminUser> }) => 
      updateUser(userId, data),
    onSuccess: () => {
      toast({ title: "User Updated", description: "Player data has been updated." });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Update Failed", variant: "destructive" });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => 
      assignRoleToUser(userId, roleId),
    onSuccess: () => {
      toast({ title: "Role Assigned" });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: () => {
      toast({ title: "Failed to assign role", variant: "destructive" });
    },
  });

  if (usersLoading) {
    return <Skeleton className="h-96" />;
  }

  const users = usersData?.users || [];
  const roles = rolesData?.roles || [];
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    u.discordId.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Player Management</h2>
        <p className="text-muted-foreground">Edit player profiles and assign website roles</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search by username or Discord ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
          data-testid="input-search-players"
        />
      </div>

      <div className="space-y-2">
        {filteredUsers.map((user) => (
          <div 
            key={user.id}
            className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800">
              <img 
                src={getAvatarUrl({ discordId: user.discordId, avatar: user.avatar })} 
                alt={user.displayName || user.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-medium">{user.displayName || user.username}</p>
              <p className="text-xs text-muted-foreground">@{user.username} • {user.discordId}</p>
            </div>
            <div className="flex gap-1 flex-wrap max-w-xs">
              {user.staffTier && (
                <Badge className="capitalize bg-primary text-black">{user.staffTier}</Badge>
              )}
              {user.websiteRoles?.map((role) => (
                <Badge key={role} variant="outline" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid={`button-edit-user-${user.id}`}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Player: {user.displayName || user.username}</DialogTitle>
                  <DialogDescription>
                    Modify player settings and assign website roles
                  </DialogDescription>
                </DialogHeader>
                <EditPlayerForm 
                  user={user} 
                  roles={roles}
                  onSave={(data) => updateMutation.mutate({ userId: user.id, data })}
                  onAssignRole={(roleId) => assignRoleMutation.mutate({ userId: user.id, roleId })}
                />
              </DialogContent>
            </Dialog>
          </div>
        ))}
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No players found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}

function EditPlayerForm({ 
  user, 
  roles,
  onSave,
  onAssignRole 
}: { 
  user: AdminUser; 
  roles: WebsiteRole[];
  onSave: (data: Partial<AdminUser>) => void;
  onAssignRole: (roleId: string) => void;
}) {
  const [staffTier, setStaffTier] = useState(user.staffTier || "");
  const [isStaff, setIsStaff] = useState(user.isStaff || false);
  const [selectedRole, setSelectedRole] = useState("");

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800">
          <img 
            src={getAvatarUrl({ discordId: user.discordId, avatar: user.avatar })} 
            alt={user.displayName || user.username}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="font-bold text-lg">{user.displayName || user.username}</p>
          <p className="text-sm text-muted-foreground">{user.discordId}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox 
          checked={isStaff} 
          onCheckedChange={(checked) => setIsStaff(checked as boolean)}
          id="is-staff"
        />
        <Label htmlFor="is-staff">Is Staff Member</Label>
      </div>

      {isStaff && (
        <div>
          <Label>Staff Tier</Label>
          <Select value={staffTier} onValueChange={setStaffTier}>
            <SelectTrigger>
              <SelectValue placeholder="Select staff tier..." />
            </SelectTrigger>
            <SelectContent>
              {STAFF_HIERARCHY.map((tier) => (
                <SelectItem key={tier} value={tier} className="capitalize">
                  {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="border-t border-white/10 pt-4">
        <Label>Assign Website Role</Label>
        <div className="flex gap-2 mt-2">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => { 
              if (selectedRole) {
                onAssignRole(selectedRole);
                setSelectedRole("");
              }
            }}
            disabled={!selectedRole}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button 
        className="w-full mt-4" 
        onClick={() => onSave({ isStaff, staffTier: staffTier || null })}
      >
        Save Changes
      </Button>
    </div>
  );
}

function RoleManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<WebsiteRole | null>(null);
  const [newRole, setNewRole] = useState({
    name: "",
    displayName: "",
    description: "",
    color: "#6b7280",
    permissions: [] as string[],
    staffTier: "",
    discordRoleId: "",
    priority: 0,
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["websiteRoles"],
    queryFn: fetchWebsiteRoles,
  });

  const { data: mappingsData, isLoading: mappingsLoading } = useQuery({
    queryKey: ["roleMappings"],
    queryFn: fetchRoleMappings,
  });

  const createMutation = useMutation({
    mutationFn: createWebsiteRole,
    onSuccess: () => {
      toast({ title: "Role Created" });
      queryClient.invalidateQueries({ queryKey: ["websiteRoles"] });
      setIsCreating(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create role", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WebsiteRole> }) => updateWebsiteRole(id, data),
    onSuccess: () => {
      toast({ title: "Role Updated" });
      queryClient.invalidateQueries({ queryKey: ["websiteRoles"] });
      setEditingRole(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebsiteRole,
    onSuccess: () => {
      toast({ title: "Role Deleted" });
      queryClient.invalidateQueries({ queryKey: ["websiteRoles"] });
    },
    onError: () => {
      toast({ title: "Failed to delete role", variant: "destructive" });
    },
  });

  const createMappingMutation = useMutation({
    mutationFn: createRoleMapping,
    onSuccess: () => {
      toast({ title: "Quick Mapping Added" });
      queryClient.invalidateQueries({ queryKey: ["roleMappings"] });
    },
    onError: () => {
      toast({ title: "Failed to add mapping", variant: "destructive" });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: deleteRoleMapping,
    onSuccess: () => {
      toast({ title: "Mapping Removed" });
      queryClient.invalidateQueries({ queryKey: ["roleMappings"] });
    },
    onError: () => {
      toast({ title: "Failed to remove mapping", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewRole({ name: "", displayName: "", description: "", color: "#6b7280", permissions: [], staffTier: "", discordRoleId: "", priority: 0 });
  };

  const togglePermission = (permId: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const startEditing = (role: WebsiteRole) => {
    setEditingRole(role);
    setNewRole({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      color: role.color || "#6b7280",
      permissions: role.permissions || [],
      staffTier: role.staffTier || "",
      discordRoleId: role.discordRoleId || "",
      priority: role.priority || 0,
    });
    setIsCreating(true);
  };

  if (rolesLoading || mappingsLoading) {
    return <Skeleton className="h-96" />;
  }

  const roles = rolesData?.roles || [];
  const legacyMappings = mappingsData?.mappings || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">Create roles, set permissions, and optionally link them to Discord roles for auto-sync</p>
        </div>
        <Button 
          onClick={() => { setEditingRole(null); resetForm(); setIsCreating(true); }} 
          disabled={isCreating}
          data-testid="button-create-role"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Role
        </Button>
      </div>

      {isCreating && (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" /> {editingRole ? "Edit Role" : "New Role"}
            </CardTitle>
            <CardDescription>
              {editingRole 
                ? "Update this role's settings and Discord mapping"
                : "Create a new role. Add a Discord Role ID to automatically assign this role when users have that Discord role."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Role Name (internal)</Label>
                <Input
                  placeholder="admin_team"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value.toLowerCase().replace(/\s/g, "_") })}
                  disabled={!!editingRole}
                  data-testid="input-role-name"
                />
              </div>
              <div>
                <Label>Display Name</Label>
                <Input
                  placeholder="Admin Team"
                  value={newRole.displayName}
                  onChange={(e) => setNewRole({ ...newRole, displayName: e.target.value })}
                  data-testid="input-role-display-name"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="What this role is for..."
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                data-testid="input-role-description"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={newRole.color}
                    onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={newRole.color}
                    onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                    placeholder="#6b7280"
                  />
                </div>
              </div>
              <div>
                <Label>Staff Tier (Optional)</Label>
                <Select
                  value={newRole.staffTier}
                  onValueChange={(v) => setNewRole({ ...newRole, staffTier: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Staff Tier</SelectItem>
                    {STAFF_HIERARCHY.map((tier) => (
                      <SelectItem key={tier} value={tier} className="capitalize">
                        {tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={newRole.priority}
                  onChange={(e) => setNewRole({ ...newRole, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-zinc-800/50 border border-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <Label className="text-primary font-semibold">Discord Role Mapping (Optional)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Link a Discord role ID so this role gets automatically assigned when a user has that Discord role.
              </p>
              <Input
                placeholder="Discord Role ID (e.g. 123456789012345678)"
                value={newRole.discordRoleId}
                onChange={(e) => setNewRole({ ...newRole, discordRoleId: e.target.value })}
                data-testid="input-role-discord-id"
              />
            </div>

            <div>
              <Label>Permissions</Label>
              <p className="text-xs text-muted-foreground mb-2">Select what this role grants access to</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <div
                    key={perm.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                      newRole.permissions.includes(perm.id)
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    onClick={() => togglePermission(perm.id)}
                  >
                    <Checkbox
                      checked={newRole.permissions.includes(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                    />
                    <span className="text-sm">{perm.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {editingRole ? (
                <Button
                  onClick={() => updateMutation.mutate({
                    id: editingRole.id,
                    data: {
                      ...newRole,
                      staffTier: newRole.staffTier === "none" ? null : newRole.staffTier || null,
                      discordRoleId: newRole.discordRoleId || null,
                    },
                  })}
                  disabled={!newRole.displayName || updateMutation.isPending}
                  data-testid="button-save-role"
                >
                  <Check className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              ) : (
                <Button
                  onClick={() => createMutation.mutate({
                    ...newRole,
                    staffTier: newRole.staffTier === "none" ? null : newRole.staffTier || null,
                    discordRoleId: newRole.discordRoleId || null,
                  })}
                  disabled={!newRole.name || !newRole.displayName || createMutation.isPending}
                  data-testid="button-save-role"
                >
                  <Check className="w-4 h-4 mr-2" /> Create Role
                </Button>
              )}
              <Button variant="outline" onClick={() => { setIsCreating(false); setEditingRole(null); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors"
          >
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: role.color || "#6b7280" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium">{role.displayName}</p>
                {role.discordRoleId && (
                  <Badge variant="outline" className="text-xs gap-1 border-blue-500/30 text-blue-400">
                    <Link2 className="w-3 h-3" /> Discord Linked
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {role.name}
                {role.discordRoleId && ` · Discord ID: ${role.discordRoleId}`}
              </p>
            </div>
            <div className="flex gap-1 flex-wrap">
              {role.permissions?.map((perm) => (
                <Badge key={perm} variant="secondary" className="text-xs">
                  {perm}
                </Badge>
              ))}
            </div>
            {role.staffTier && (
              <Badge className="capitalize bg-primary text-black">{role.staffTier}</Badge>
            )}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => startEditing(role)}
                data-testid={`button-edit-role-${role.id}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                onClick={() => deleteMutation.mutate(role.id)}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-role-${role.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {roles.length === 0 && !isCreating && (
          <div className="text-center py-12 text-muted-foreground">
            No roles created yet. Click "Create Role" to add your first role.
          </div>
        )}
      </div>

      {legacyMappings.length > 0 && (
        <section className="border-t border-white/5 pt-8">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-muted-foreground">Legacy Discord Mappings</h3>
            <p className="text-sm text-muted-foreground">
              These are older standalone Discord mappings. Consider creating a unified role above with a Discord Role ID instead.
            </p>
          </div>
          <div className="space-y-2">
            {legacyMappings.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/20 border border-white/5"
              >
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{m.discordRoleName || m.discordRoleId}</p>
                  <p className="text-xs text-muted-foreground">Discord ID: {m.discordRoleId}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.websitePermission.split(",").map((perm, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {perm.trim()}
                    </Badge>
                  ))}
                </div>
                {m.staffTier && (
                  <Badge className="capitalize bg-primary text-black">{m.staffTier}</Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                  onClick={() => deleteMappingMutation.mutate(m.id)}
                  disabled={deleteMappingMutation.isPending}
                  data-testid={`button-delete-mapping-${m.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <DepartmentRolesSection />
    </div>
  );
}

function DepartmentRolesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const { data: deptRanksData, isLoading } = useQuery({
    queryKey: ["adminDepartmentRanks"],
    queryFn: fetchDepartmentRanks,
  });

  const updateRankMutation = useMutation({
    mutationFn: ({ deptCode, rankId, data }: { deptCode: string; rankId: string; data: Partial<DepartmentRank> }) =>
      updateDepartmentRank(deptCode, rankId, data),
    onSuccess: () => {
      toast({ title: "Rank Updated" });
      queryClient.invalidateQueries({ queryKey: ["adminDepartmentRanks"] });
      queryClient.invalidateQueries({ queryKey: ["departmentRanks"] });
    },
    onError: () => {
      toast({ title: "Failed to update rank", variant: "destructive" });
    },
  });

  const reorderRankMutation = useMutation({
    mutationFn: async ({ deptCode, rankId, direction, ranks }: { deptCode: string; rankId: string; direction: "up" | "down"; ranks: DepartmentRank[] }) => {
      const sortedRanks = [...ranks].sort((a, b) => a.priority - b.priority);
      const currentIndex = sortedRanks.findIndex(r => r.id === rankId);
      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= sortedRanks.length) return;

      const currentPriority = sortedRanks[currentIndex].priority;
      const swapPriority = sortedRanks[swapIndex].priority;

      await updateDepartmentRank(deptCode, sortedRanks[currentIndex].id, { priority: swapPriority });
      await updateDepartmentRank(deptCode, sortedRanks[swapIndex].id, { priority: currentPriority });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDepartmentRanks"] });
      queryClient.invalidateQueries({ queryKey: ["departmentRanks"] });
    },
  });

  const toggleDept = (code: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  if (isLoading) {
    return (
      <section className="border-t border-white/5 pt-8">
        <Skeleton className="h-48" />
      </section>
    );
  }

  const departments = deptRanksData?.departments || {};

  return (
    <section className="border-t border-white/5 pt-8">
      <div className="mb-4">
        <h3 className="text-lg font-bold">Department Roles</h3>
        <p className="text-sm text-muted-foreground">
          Manage Discord Role IDs for each department rank. Changes here are reflected in Leadership Settings and vice versa.
        </p>
      </div>
      <div className="space-y-2">
        {Object.entries(departments).map(([code, { department, ranks }]) => {
          const isExpanded = expandedDepts.has(code);
          const linkedCount = ranks.filter(r => r.discordRoleId).length;
          return (
            <div key={code} className="rounded-lg border border-white/5 overflow-hidden" data-testid={`dept-roles-${code}`}>
              <button
                className="w-full flex items-center gap-4 p-4 hover:bg-zinc-900/50 transition-colors text-left"
                onClick={() => toggleDept(code)}
                data-testid={`button-toggle-dept-${code}`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: department.color }} />
                <div className="flex-1">
                  <p className="font-medium">{department.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ranks.length} ranks · {linkedCount} linked to Discord
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {linkedCount}/{ranks.length}
                </Badge>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </button>
              {isExpanded && (
                <div className="border-t border-white/5 bg-zinc-900/20">
                  <div className="px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground border-b border-white/5">
                    <div className="w-8">#</div>
                    <div className="flex-1">Rank Name</div>
                    <div className="w-48 text-center">Discord Role ID</div>
                    <div className="w-20" />
                  </div>
                  {ranks.sort((a, b) => a.priority - b.priority).map((rank, idx) => (
                    <AdminRankRow
                      key={rank.id}
                      rank={rank}
                      deptColor={department.color}
                      onUpdate={(data) => updateRankMutation.mutate({ deptCode: code, rankId: rank.id, data })}
                      onMoveUp={() => reorderRankMutation.mutate({ deptCode: code, rankId: rank.id, direction: "up", ranks })}
                      onMoveDown={() => reorderRankMutation.mutate({ deptCode: code, rankId: rank.id, direction: "down", ranks })}
                      isFirst={idx === 0}
                      isLast={idx === ranks.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AdminRankRow({ rank, deptColor, onUpdate, onMoveUp, onMoveDown, isFirst, isLast }: { 
  rank: DepartmentRank; deptColor: string; 
  onUpdate: (data: Partial<DepartmentRank>) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: rank.name,
    abbreviation: rank.abbreviation || "",
    callsignPrefix: rank.callsignPrefix || "",
    isLeadership: rank.isLeadership ?? false,
    discordRoleId: rank.discordRoleId || "",
  });

  if (editing) {
    return (
      <div className="px-4 py-3 bg-zinc-900/50 border-b border-white/5 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              placeholder="Rank Name"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="h-7 text-sm"
              data-testid={`input-admin-rank-name-${rank.id}`}
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Abbreviation</Label>
            <Input
              placeholder="ABBR"
              value={editData.abbreviation}
              onChange={(e) => setEditData({ ...editData, abbreviation: e.target.value })}
              className="h-7 text-sm"
              data-testid={`input-admin-rank-abbrev-${rank.id}`}
            />
          </div>
          <div>
            <Label className="text-xs">Callsign Prefix</Label>
            <Input
              placeholder="1-"
              value={editData.callsignPrefix}
              onChange={(e) => setEditData({ ...editData, callsignPrefix: e.target.value })}
              className="h-7 text-sm"
              data-testid={`input-admin-rank-prefix-${rank.id}`}
            />
          </div>
          <div>
            <Label className="text-xs">Discord Role ID</Label>
            <Input
              placeholder="Discord Role ID"
              value={editData.discordRoleId}
              onChange={(e) => setEditData({ ...editData, discordRoleId: e.target.value })}
              className="h-7 text-sm"
              data-testid={`input-admin-rank-discord-id-${rank.id}`}
            />
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Checkbox
              checked={editData.isLeadership}
              onCheckedChange={(checked) => setEditData({ ...editData, isLeadership: checked as boolean })}
              id={`admin-edit-leadership-${rank.id}`}
            />
            <Label htmlFor={`admin-edit-leadership-${rank.id}`} className="text-xs">Leadership</Label>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              onUpdate({
                name: editData.name,
                abbreviation: editData.abbreviation || null,
                callsignPrefix: editData.callsignPrefix || null,
                isLeadership: editData.isLeadership,
                discordRoleId: editData.discordRoleId || null,
              });
              setEditing(false);
            }}
            disabled={!editData.name}
            data-testid={`button-save-admin-rank-${rank.id}`}
          >
            <Check className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setEditing(false);
              setEditData({
                name: rank.name,
                abbreviation: rank.abbreviation || "",
                callsignPrefix: rank.callsignPrefix || "",
                isLeadership: rank.isLeadership ?? false,
                discordRoleId: rank.discordRoleId || "",
              });
            }}
            data-testid={`button-cancel-admin-rank-${rank.id}`}
          >
            <X className="w-3 h-3 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-900/30 transition-colors border-b border-white/5 last:border-0">
      <div className="w-8 text-muted-foreground font-mono text-sm">{rank.priority}</div>
      <div className="flex-1 text-sm">
        <span className="font-medium">{rank.name}</span>
        {rank.isLeadership && (
          <Badge variant="outline" className="ml-2 text-[10px] py-0" style={{ borderColor: `${deptColor}50`, color: deptColor }}>
            Leadership
          </Badge>
        )}
      </div>
      <div className="w-48 text-center text-xs font-mono">
        {rank.discordRoleId ? (
          <span className="text-green-400" title={rank.discordRoleId}>...{rank.discordRoleId.slice(-8)}</span>
        ) : (
          <span className="text-red-400/60">Not linked</span>
        )}
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onMoveUp} disabled={isFirst} data-testid={`button-move-up-admin-rank-${rank.id}`}>
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onMoveDown} disabled={isLast} data-testid={`button-move-down-admin-rank-${rank.id}`}>
          <ArrowDown className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setEditing(true)}
          data-testid={`button-edit-admin-rank-${rank.id}`}
        >
          <Edit className="w-3 h-3 mr-1" /> Edit
        </Button>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["adminDashboardStats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard-stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Server overview and quick statistics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/40 border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold text-primary">{stats?.totalUsers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/40 border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Staff Members</p>
                <p className="text-3xl font-bold text-green-400">{stats?.staffCount || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-green-400/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/40 border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-3xl font-bold text-blue-400">{stats?.departmentCount || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/40 border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Actions</p>
                <p className="text-3xl font-bold text-purple-400">{stats?.recentActivity?.length || 0}</p>
              </div>
              <ClipboardList className="w-8 h-8 text-purple-400/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.recentActivity?.length > 0 && (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30" data-testid={`activity-${log.id}`}>
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.category} {log.details ? `· ${log.details}` : ""}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const ACCESS_CONTROL_PERMISSIONS = [
  { key: "access_view_applications", label: "View Applications", description: "Who can view submitted applications in department portals", defaultTier: "manager" },
  { key: "access_manage_sops", label: "Manage SOPs", description: "Who can upload and manage Standard Operating Procedures", defaultTier: "manager" },
  { key: "access_post_updates", label: "Post Server Updates", description: "Who can create server updates on the home page", defaultTier: "manager" },
  { key: "access_manage_roster", label: "Manage Roster", description: "Who can add/remove members from department rosters", defaultTier: "manager" },
  { key: "access_manage_forms", label: "Manage Application Forms", description: "Who can create and edit application forms", defaultTier: "executive" },
  { key: "access_accept_applications", label: "Accept/Deny Applications", description: "Who can accept or deny submitted applications", defaultTier: "manager" },
  { key: "access_manage_faqs", label: "Manage FAQs", description: "Who can create and edit FAQ entries", defaultTier: "executive" },
  { key: "access_manage_ranks", label: "Manage Department Ranks", description: "Who can edit rank names, priorities, and Discord IDs", defaultTier: "executive" },
];

const STAFF_SETTINGS_PERMISSIONS = [
  { key: "staff_access_admin_panel", label: "Access Admin Panel", description: "Who can open the Admin Panel at all (view Dashboard)", defaultTier: "director" },
  { key: "staff_manage_users", label: "Manage Users", description: "Who can view and edit user accounts, assign roles, and modify staff tiers", defaultTier: "director" },
  { key: "staff_manage_players", label: "Manage Players", description: "Who can view and search player profiles and linked accounts", defaultTier: "executive" },
  { key: "staff_manage_roles", label: "Manage Roles", description: "Who can create, edit, and delete website roles and Discord role mappings", defaultTier: "director" },
  { key: "staff_manage_access_control", label: "Manage Access Control", description: "Who can change these permission settings (this section)", defaultTier: "director" },
  { key: "staff_manage_seo", label: "Manage SEO Settings", description: "Who can edit page titles, descriptions, and meta tags", defaultTier: "executive" },
  { key: "staff_view_audit_log", label: "View Audit Log", description: "Who can view the audit log of all administrative actions", defaultTier: "executive" },
  { key: "staff_manage_settings", label: "Manage Server Settings", description: "Who can edit general server settings (Discord URL, FiveM URL, about text)", defaultTier: "director" },
  { key: "staff_sync_roles", label: "Sync Discord Roles", description: "Who can trigger bulk Discord role synchronisation for all users", defaultTier: "director" },
  { key: "staff_manage_leadership", label: "Manage Leadership Settings", description: "Who can edit department leadership settings, squads, and roster assignments", defaultTier: "executive" },
  { key: "staff_delete_applications", label: "Delete Applications", description: "Who can permanently delete submitted applications", defaultTier: "director" },
];

function AccessControlTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["adminSettings"],
    queryFn: fetchAdminSettings,
  });

  useEffect(() => {
    if (savedSettings && !initialized) {
      const settings: Record<string, string> = {};
      for (const perm of ACCESS_CONTROL_PERMISSIONS) {
        settings[perm.key] = savedSettings[perm.key] || perm.defaultTier;
      }
      for (const perm of STAFF_SETTINGS_PERMISSIONS) {
        settings[perm.key] = savedSettings[perm.key] || perm.defaultTier;
      }
      setLocalSettings(settings);
      setInitialized(true);
    }
  }, [savedSettings, initialized]);

  const handleSave = async () => {
    for (const [key, value] of Object.entries(localSettings)) {
      await saveSetting(key, value);
    }
    queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
    toast({ title: "Access Control Saved", description: "Permission settings have been updated." });
  };

  if (isLoading) return <Skeleton className="h-96" />;

  const tiers = ["director", "executive", "manager", "administrator", "moderator", "support", "development"];

  const renderPermissionRow = (perm: { key: string; label: string; description: string; defaultTier: string }) => (
    <div key={perm.key} className="flex items-center justify-between p-4 rounded-lg hover:bg-zinc-800/30 transition-colors" data-testid={`access-control-${perm.key}`}>
      <div className="flex-1">
        <p className="font-medium text-sm">{perm.label}</p>
        <p className="text-xs text-muted-foreground">{perm.description}</p>
      </div>
      <select
        value={localSettings[perm.key] || perm.defaultTier}
        onChange={(e) => setLocalSettings(prev => ({ ...prev, [perm.key]: e.target.value }))}
        className="bg-zinc-800 border border-white/10 rounded-md px-3 py-1.5 text-sm text-foreground"
        data-testid={`select-access-${perm.key}`}
      >
        {tiers.map((tier) => (
          <option key={tier} value={tier}>{tier.charAt(0).toUpperCase() + tier.slice(1)}+</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Access Control</h2>
        <p className="text-muted-foreground">Configure the minimum staff tier required for each action. Directors always have full access regardless of settings.</p>
      </div>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            Staff Settings
          </CardTitle>
          <p className="text-xs text-muted-foreground">Control who can access admin panel sections and perform staff-level actions</p>
        </CardHeader>
        <CardContent className="space-y-1">
          {STAFF_SETTINGS_PERMISSIONS.map(renderPermissionRow)}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            Department Permissions
          </CardTitle>
          <p className="text-xs text-muted-foreground">Control who can perform actions within department portals and content areas</p>
        </CardHeader>
        <CardContent className="space-y-1">
          {ACCESS_CONTROL_PERMISSIONS.map(renderPermissionRow)}
        </CardContent>
      </Card>

      <Button onClick={handleSave} data-testid="button-save-access-control">
        <Check className="w-4 h-4 mr-2" /> Save Access Control Settings
      </Button>
    </div>
  );
}

function SeoManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);

  const pages = [
    { key: "home", label: "Home Page", path: "/" },
    { key: "team", label: "Team Page", path: "/team" },
    { key: "join", label: "Join Page", path: "/join" },
    { key: "support", label: "Support Page", path: "/support" },
    { key: "departments", label: "Departments Page", path: "/departments" },
  ];

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["adminSettings"],
    queryFn: fetchAdminSettings,
  });

  const [seoSettings, setSeoSettings] = useState<Record<string, { title: string; description: string }>>({});

  useEffect(() => {
    if (savedSettings && !initialized) {
      const settings: Record<string, { title: string; description: string }> = {};
      for (const page of pages) {
        settings[page.key] = {
          title: savedSettings[`seo_${page.key}_title`] || "",
          description: savedSettings[`seo_${page.key}_description`] || "",
        };
      }
      setSeoSettings(settings);
      setInitialized(true);
    }
  }, [savedSettings, initialized]);

  const handleSave = async () => {
    for (const [key, values] of Object.entries(seoSettings)) {
      await saveSetting(`seo_${key}_title`, values.title);
      await saveSetting(`seo_${key}_description`, values.description);
    }
    queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
    toast({ title: "SEO Settings Saved", description: "Page meta information has been updated." });
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">SEO Management</h2>
        <p className="text-muted-foreground">Customize page titles and descriptions for search engines and social media sharing</p>
      </div>

      {pages.map((page) => (
        <Card key={page.key} className="bg-zinc-900/40 border-white/5" data-testid={`seo-card-${page.key}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              {page.label}
              <Badge variant="outline" className="text-xs font-mono">{page.path}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Page Title</Label>
              <Input
                placeholder={`${page.label} | Tamaki Makaurau RP`}
                value={seoSettings[page.key]?.title || ""}
                onChange={(e) => setSeoSettings(prev => ({
                  ...prev,
                  [page.key]: { ...prev[page.key], title: e.target.value },
                }))}
                data-testid={`input-seo-title-${page.key}`}
              />
            </div>
            <div>
              <Label className="text-xs">Meta Description</Label>
              <Textarea
                placeholder="Brief description for search engine results..."
                value={seoSettings[page.key]?.description || ""}
                onChange={(e) => setSeoSettings(prev => ({
                  ...prev,
                  [page.key]: { ...prev[page.key], description: e.target.value },
                }))}
                rows={2}
                data-testid={`input-seo-description-${page.key}`}
              />
            </div>
            {seoSettings[page.key]?.title && (
              <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/5">
                <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                <p className="text-blue-400 text-sm font-medium">{seoSettings[page.key].title}</p>
                <p className="text-xs text-green-400 font-mono">{page.path}</p>
                <p className="text-xs text-muted-foreground mt-1">{seoSettings[page.key].description || "No description set"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSave} data-testid="button-save-seo">
        <Check className="w-4 h-4 mr-2" /> Save SEO Settings
      </Button>
    </div>
  );
}

function AuditLogTab() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["auditLogs", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-logs?limit=${limit}&offset=${page * limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ logs: any[]; total: number; users: Record<string, any> }>;
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const users = data?.users || {};
  const totalPages = Math.ceil(total / limit);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "roles": return "text-blue-400";
      case "settings": return "text-yellow-400";
      case "users": return "text-green-400";
      case "sync": return "text-purple-400";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audit Log</h2>
        <p className="text-muted-foreground">Track all administrative actions performed on the server ({total} total entries)</p>
      </div>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardContent className="pt-6">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>No audit log entries yet.</p>
              <p className="text-sm">Actions will be recorded as admins make changes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const user = log.userId ? users[log.userId] : null;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors" data-testid={`audit-log-${log.id}`}>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 mt-0.5">
                      {user ? (
                        <img src={getAvatarUrl({ discordId: user.discordId, avatar: user.avatar })} alt={user.displayName || user.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Settings className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{user ? (user.displayName || user.username) : "System"}</span>
                        <Badge variant="outline" className={`text-[10px] py-0 ${getCategoryColor(log.category)}`}>
                          {log.category}
                        </Badge>
                      </div>
                      <p className="text-sm">{log.action}</p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 mt-1">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} data-testid="button-audit-prev">
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} data-testid="button-audit-next">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function fetchAdminSettings(): Promise<Record<string, string>> {
  const res = await fetch("/api/admin/settings", { credentials: "include" });
  if (!res.ok) return {};
  const data = await res.json();
  const map: Record<string, string> = {};
  for (const s of data.settings || []) {
    map[s.key] = s.value || "";
  }
  return map;
}

async function saveSetting(key: string, value: string): Promise<void> {
  await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ key, value }),
  });
}

function SettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["adminSettings"],
    queryFn: fetchAdminSettings,
  });

  const [settings, setSettings] = useState({
    serverName: "",
    about_description: "",
    discordInvite: "",
    fivemConnect: "",
    maintenanceMode: false,
    registrationOpen: true,
    applicationCooldown: "7",
  });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (savedSettings && !initialized) {
      setSettings({
        serverName: savedSettings["server_name"] || "Tamaki Makaurau RP",
        about_description: savedSettings["about_description"] || "",
        discordInvite: savedSettings["discord_invite"] || "",
        fivemConnect: savedSettings["fivem_connect"] || "",
        maintenanceMode: savedSettings["maintenance_mode"] === "true",
        registrationOpen: savedSettings["registration_open"] !== "false",
        applicationCooldown: savedSettings["application_cooldown"] || "7",
      });
      setInitialized(true);
    }
  }, [savedSettings, initialized]);

  const handleSave = async () => {
    const entries: [string, string][] = [
      ["server_name", settings.serverName],
      ["about_description", settings.about_description],
      ["discord_invite", settings.discordInvite],
      ["fivem_connect", settings.fivemConnect],
      ["maintenance_mode", String(settings.maintenanceMode)],
      ["registration_open", String(settings.registrationOpen)],
      ["application_cooldown", settings.applicationCooldown],
    ];
    for (const [key, value] of entries) {
      await saveSetting(key, value);
    }
    queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
    queryClient.invalidateQueries({ queryKey: ["setting"] });
    toast({ title: "Settings Saved", description: "Server settings have been updated." });
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Server Settings</h2>
        <p className="text-muted-foreground">Configure your server's website settings</p>
      </div>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Server Name</Label>
              <Input
                value={settings.serverName}
                onChange={(e) => setSettings({ ...settings, serverName: e.target.value })}
                data-testid="input-server-name"
              />
            </div>
            <div>
              <Label>Discord Invite Link</Label>
              <Input
                value={settings.discordInvite}
                onChange={(e) => setSettings({ ...settings, discordInvite: e.target.value })}
                data-testid="input-discord-invite"
              />
            </div>
          </div>
          
          <div>
            <Label>About Description</Label>
            <p className="text-xs text-muted-foreground mb-2">
              This appears in the "About Tamaki Makaurau RP" section on the home page
            </p>
            <Textarea
              rows={5}
              value={settings.about_description}
              onChange={(e) => setSettings({ ...settings, about_description: e.target.value })}
              placeholder="Welcome to Tamaki Makaurau RP — New Zealand's premier GTA V FiveM roleplay server..."
              data-testid="input-about-description"
            />
          </div>

          <div>
            <Label>FiveM Connect URL</Label>
            <Input
              value={settings.fivemConnect}
              onChange={(e) => setSettings({ ...settings, fivemConnect: e.target.value })}
              data-testid="input-fivem-connect"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle>Server Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">Temporarily disable website access for non-staff</p>
            </div>
            <Checkbox
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked as boolean })}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
            <div>
              <p className="font-medium">Open Registration</p>
              <p className="text-sm text-muted-foreground">Allow new users to register via Discord</p>
            </div>
            <Checkbox
              checked={settings.registrationOpen}
              onCheckedChange={(checked) => setSettings({ ...settings, registrationOpen: checked as boolean })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Application Cooldown (days)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              How long users must wait before submitting another application after rejection
            </p>
            <Input
              type="number"
              value={settings.applicationCooldown}
              onChange={(e) => setSettings({ ...settings, applicationCooldown: e.target.value })}
              className="max-w-xs"
              data-testid="input-application-cooldown"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full sm:w-auto" data-testid="button-save-settings">
        <Check className="w-4 h-4 mr-2" /> Save Settings
      </Button>
    </div>
  );
}
