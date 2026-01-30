import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Settings, Users, Link2, RefreshCw, Shield, Trash2, Plus, ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUser, hasPermission, getAvatarUrl, type User } from "@/lib/auth";

const STAFF_HIERARCHY = ["director", "executive", "manager", "administrator", "moderator", "support", "development"] as const;

interface RoleMapping {
  id: string;
  discordRoleId: string;
  discordRoleName: string | null;
  websitePermission: string;
  staffTier: string | null;
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

export default function Admin() {
  const [, params] = useRoute("/admin/:tab?");
  const activeTab = params?.tab || "users";
  
  const { data: user, isLoading: userLoading } = useUser();

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-6 flex justify-center">
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      </div>
    );
  }

  if (!user || !hasPermission(user, "admin")) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-6 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>

          <motion.header 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <div className="p-4 rounded-xl bg-primary/20 text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-primary">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users, roles, and server configuration.</p>
            </div>
          </motion.header>

          <Tabs value={activeTab} className="w-full">
            <TabsList className="bg-zinc-900/50 border border-white/5 mb-8">
              <Link href="/admin/users">
                <TabsTrigger value="users" className="gap-2" data-testid="tab-admin-users">
                  <Users className="w-4 h-4" /> Users
                </TabsTrigger>
              </Link>
              <Link href="/admin/mappings">
                <TabsTrigger value="mappings" className="gap-2" data-testid="tab-admin-mappings">
                  <Link2 className="w-4 h-4" /> Role Mappings
                </TabsTrigger>
              </Link>
            </TabsList>

            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
            
            <TabsContent value="mappings">
              <RoleMappingsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
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
          <h2 className="text-xl font-bold">All Users ({users.length})</h2>
          <p className="text-sm text-muted-foreground">{staffUsers.length} staff members</p>
        </div>
        <Button 
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-roles"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sync All Roles
        </Button>
      </div>

      {staffUsers.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-4 uppercase tracking-widest text-primary">
            Staff Members
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
            Regular Users
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
        <Badge className="capitalize">{user.staffTier}</Badge>
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

function RoleMappingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newMapping, setNewMapping] = useState({
    discordRoleId: "",
    discordRoleName: "",
    websitePermission: "",
    staffTier: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["roleMappings"],
    queryFn: fetchRoleMappings,
  });

  const createMutation = useMutation({
    mutationFn: createRoleMapping,
    onSuccess: () => {
      toast({ title: "Mapping Created", description: "Role mapping added successfully." });
      queryClient.invalidateQueries({ queryKey: ["roleMappings"] });
      setNewMapping({ discordRoleId: "", discordRoleName: "", websitePermission: "", staffTier: "" });
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
                data-testid="input-role-name"
              />
            </div>
            <div>
              <Label>Website Permission</Label>
              <Input
                placeholder="admin, police, ems..."
                value={newMapping.websitePermission}
                onChange={(e) => setNewMapping({ ...newMapping, websitePermission: e.target.value })}
                data-testid="input-permission"
              />
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
              websitePermission: newMapping.websitePermission,
              staffTier: newMapping.staffTier === "none" ? null : newMapping.staffTier || null,
            })}
            disabled={!newMapping.discordRoleId || !newMapping.websitePermission || createMutation.isPending}
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
                <Badge variant="secondary">{m.websitePermission}</Badge>
                {m.staffTier && (
                  <Badge className="capitalize">{m.staffTier}</Badge>
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
