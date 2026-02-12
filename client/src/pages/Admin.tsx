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
  UserCog, Tag, Cog, Edit, X, ChevronRight
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
  { id: "users", label: "Users Overview", icon: Users },
  { id: "players", label: "Player Management", icon: UserCog },
  { id: "roles", label: "Role Management", icon: Tag },
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
  const activeTab = params?.tab || "users";
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading: userLoading } = useUser();
  const { data: authStatus, isLoading: authLoading } = useAuthStatus();
  
  const canAccessAdmin = hasPermission(user ?? null, "admin", authStatus?.isBootstrapMode);

  if (userLoading || authLoading) {
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
            {SIDEBAR_ITEMS.map((item) => {
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
            {activeTab === "users" && <UsersOverviewTab />}
            {activeTab === "players" && <PlayerManagementTab />}
            {activeTab === "roles" && <RoleManagementTab />}
            {activeTab === "settings" && <SettingsTab />}
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
          alt={user.username}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1">
        <span className="font-medium">{user.username}</span>
        <p className="text-xs text-muted-foreground">ID: {user.discordId}</p>
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
                alt={user.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-medium">{user.username}</p>
              <p className="text-xs text-muted-foreground">Discord: {user.discordId}</p>
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
                  <DialogTitle>Edit Player: {user.username}</DialogTitle>
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
            alt={user.username}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="font-bold text-lg">{user.username}</p>
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
                  {ranks.sort((a, b) => a.priority - b.priority).map(rank => (
                    <AdminRankRow
                      key={rank.id}
                      rank={rank}
                      deptColor={department.color}
                      onUpdate={(data) => updateRankMutation.mutate({ deptCode: code, rankId: rank.id, data })}
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

function AdminRankRow({ rank, deptColor, onUpdate }: { rank: DepartmentRank; deptColor: string; onUpdate: (data: Partial<DepartmentRank>) => void }) {
  const [editing, setEditing] = useState(false);
  const [discordRoleId, setDiscordRoleId] = useState(rank.discordRoleId || "");

  if (editing) {
    return (
      <div className="flex items-center gap-4 px-4 py-3 bg-zinc-900/50 border-b border-white/5">
        <div className="w-8 text-muted-foreground font-mono text-sm">{rank.priority}</div>
        <div className="flex-1 font-medium text-sm">{rank.name}</div>
        <div className="w-48">
          <Input
            placeholder="Discord Role ID"
            value={discordRoleId}
            onChange={(e) => setDiscordRoleId(e.target.value)}
            className="h-8 text-sm"
            data-testid={`input-admin-rank-discord-id-${rank.id}`}
            autoFocus
          />
        </div>
        <div className="w-20 flex gap-1">
          <Button
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              onUpdate({ discordRoleId: discordRoleId || null });
              setEditing(false);
            }}
            data-testid={`button-save-admin-rank-${rank.id}`}
          >
            <Check className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => { setEditing(false); setDiscordRoleId(rank.discordRoleId || ""); }}
            data-testid={`button-cancel-admin-rank-${rank.id}`}
          >
            <X className="w-3 h-3" />
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
      <div className="w-20">
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
