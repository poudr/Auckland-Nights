import { useState } from "react";
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
  UserCog, Tag, Cog, Edit, X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUser, useAuthStatus, hasPermission, getAvatarUrl } from "@/lib/auth";

const STAFF_HIERARCHY = ["director", "executive", "manager", "administrator", "moderator", "support", "development"] as const;

const AVAILABLE_PERMISSIONS = [
  { id: "admin", label: "Admin", description: "Full admin access" },
  { id: "police", label: "Police", description: "Auckland Police Department portal" },
  { id: "fire", label: "Fire", description: "NZ Fire & Emergency portal" },
  { id: "ems", label: "EMS", description: "St John Ambulance portal" },
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
  { id: "roles", label: "Website Roles", icon: Tag },
  { id: "mappings", label: "Discord Mappings", icon: Link2 },
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
            {activeTab === "roles" && <WebsiteRolesTab />}
            {activeTab === "mappings" && <RoleMappingsTab />}
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

function WebsiteRolesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
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
  
  const { data, isLoading } = useQuery({
    queryKey: ["websiteRoles"],
    queryFn: fetchWebsiteRoles,
  });

  const createMutation = useMutation({
    mutationFn: createWebsiteRole,
    onSuccess: () => {
      toast({ title: "Role Created" });
      queryClient.invalidateQueries({ queryKey: ["websiteRoles"] });
      setIsCreating(false);
      setNewRole({ name: "", displayName: "", description: "", color: "#6b7280", permissions: [], staffTier: "", discordRoleId: "", priority: 0 });
    },
    onError: () => {
      toast({ title: "Failed to create role", variant: "destructive" });
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

  const togglePermission = (permId: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const roles = data?.roles || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Website Roles</h2>
          <p className="text-muted-foreground">Create and manage roles that exist on the website (independent of Discord)</p>
        </div>
        <Button onClick={() => setIsCreating(true)} data-testid="button-create-role">
          <Plus className="w-4 h-4 mr-2" /> Create Role
        </Button>
      </div>

      {isCreating && (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" /> New Website Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Role Name (internal)</Label>
                <Input
                  placeholder="admin_team"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value.toLowerCase().replace(/\s/g, "_") })}
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
                placeholder="Role description..."
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
                <Label>Discord Role ID (Optional)</Label>
                <Input
                  placeholder="123456789012345678"
                  value={newRole.discordRoleId}
                  onChange={(e) => setNewRole({ ...newRole, discordRoleId: e.target.value })}
                  data-testid="input-role-discord-id"
                />
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
            </div>

            <div>
              <Label>Permissions</Label>
              <div className="flex flex-wrap gap-2 mt-2">
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
              <Button variant="outline" onClick={() => setIsCreating(false)}>
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
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: role.color || "#6b7280" }}
            />
            <div className="flex-1">
              <p className="font-medium">{role.displayName}</p>
              <p className="text-xs text-muted-foreground">{role.name}</p>
            </div>
            {role.description && (
              <p className="text-sm text-muted-foreground max-w-xs truncate">{role.description}</p>
            )}
            <div className="flex gap-1">
              {role.permissions?.map((perm) => (
                <Badge key={perm} variant="secondary" className="text-xs">
                  {perm}
                </Badge>
              ))}
            </div>
            {role.staffTier && (
              <Badge className="capitalize bg-primary text-black">{role.staffTier}</Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => deleteMutation.mutate(role.id)}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-role-${role.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        {roles.length === 0 && !isCreating && (
          <div className="text-center py-12 text-muted-foreground">
            No website roles created yet. Click "Create Role" to add one.
          </div>
        )}
      </div>
    </div>
  );
}

function RoleMappingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newMapping, setNewMapping] = useState({
    discordRoleId: "",
    discordRoleName: "",
    permissions: [] as string[],
    staffTier: "",
  });
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  
  const togglePermission = (permId: string) => {
    setNewMapping(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const { data, isLoading } = useQuery({
    queryKey: ["roleMappings"],
    queryFn: fetchRoleMappings,
  });

  const createMutation = useMutation({
    mutationFn: createRoleMapping,
    onSuccess: () => {
      toast({ title: "Mapping Created", description: "Role mapping added successfully." });
      queryClient.invalidateQueries({ queryKey: ["roleMappings"] });
      setNewMapping({ discordRoleId: "", discordRoleName: "", permissions: [], staffTier: "" });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not create role mapping.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoleMapping,
    onSuccess: () => {
      toast({ title: "Mapping Deleted" });
      queryClient.invalidateQueries({ queryKey: ["roleMappings"] });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not delete role mapping.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const mappings = data?.mappings || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Discord Role Mappings</h2>
        <p className="text-muted-foreground">Map Discord roles to website permissions automatically</p>
      </div>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Role Mapping
          </CardTitle>
          <CardDescription>
            Map a Discord role ID to website permissions and staff tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Discord Role ID</Label>
              <Input
                placeholder="123456789012345678"
                value={newMapping.discordRoleId}
                onChange={(e) => setNewMapping({ ...newMapping, discordRoleId: e.target.value })}
                data-testid="input-discord-role-id"
              />
            </div>
            <div>
              <Label>Role Name (Optional)</Label>
              <Input
                placeholder="Admin Role"
                value={newMapping.discordRoleName}
                onChange={(e) => setNewMapping({ ...newMapping, discordRoleName: e.target.value })}
                data-testid="input-mapping-role-name"
              />
            </div>
            <div>
              <Label>Website Permissions</Label>
              <Popover open={permissionsOpen} onOpenChange={setPermissionsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                    data-testid="button-permissions-dropdown"
                  >
                    {newMapping.permissions.length > 0 
                      ? `${newMapping.permissions.length} selected`
                      : "Select permissions..."}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <div className="p-2 space-y-1">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-zinc-800 cursor-pointer"
                        onClick={() => togglePermission(perm.id)}
                      >
                        <Checkbox 
                          checked={newMapping.permissions.includes(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{perm.label}</p>
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        </div>
                        {newMapping.permissions.includes(perm.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {newMapping.permissions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newMapping.permissions.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Staff Tier (Optional)</Label>
              <Select
                value={newMapping.staffTier}
                onValueChange={(v) => setNewMapping({ ...newMapping, staffTier: v })}
              >
                <SelectTrigger data-testid="select-staff-tier">
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
          </div>
          <Button
            onClick={() => createMutation.mutate({
              discordRoleId: newMapping.discordRoleId,
              discordRoleName: newMapping.discordRoleName || null,
              websitePermission: newMapping.permissions.join(","),
              staffTier: newMapping.staffTier === "none" ? null : newMapping.staffTier || null,
            })}
            disabled={!newMapping.discordRoleId || newMapping.permissions.length === 0 || createMutation.isPending}
            data-testid="button-add-mapping"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Mapping
          </Button>
        </CardContent>
      </Card>

      <section>
        <h3 className="text-lg font-bold mb-4 uppercase tracking-widest text-muted-foreground">
          Current Mappings ({mappings.length})
        </h3>
        {mappings.length > 0 ? (
          <div className="space-y-2">
            {mappings.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors"
              >
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{m.discordRoleName || m.discordRoleId}</p>
                  <p className="text-xs text-muted-foreground">ID: {m.discordRoleId}</p>
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
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => deleteMutation.mutate(m.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-mapping-${m.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No role mappings configured yet.
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    serverName: "Tamaki Makaurau RP",
    serverDescription: "Auckland-based GTA V FiveM roleplay server",
    discordInvite: "https://discord.gg/example",
    fivemConnect: "cfx.re/join/example",
    maintenanceMode: false,
    registrationOpen: true,
    applicationCooldown: "7",
  });

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Server settings have been updated." });
  };

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
            <Label>Server Description</Label>
            <Textarea
              value={settings.serverDescription}
              onChange={(e) => setSettings({ ...settings, serverDescription: e.target.value })}
              data-testid="input-server-description"
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
