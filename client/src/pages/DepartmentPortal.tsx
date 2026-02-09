import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Shield, Flame, HeartPulse, Target, Users, FileText, ClipboardList, ChevronLeft, Lock, Settings, Plus, Trash2, GripVertical, Edit, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUser, getAvatarUrl, type User } from "@/lib/auth";

interface Department {
  id: string;
  code: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
}

interface Rank {
  id: string;
  name: string;
  abbreviation: string;
  priority: number;
  isLeadership: boolean;
  callsignPrefix: string | null;
  discordRoleId: string | null;
}

interface RosterMember {
  id: string;
  userId: string;
  rankId: string;
  callsign: string | null;
  status: string;
  user: { id: string; username: string; avatar: string | null; discordId: string } | null;
  rank: Rank | null;
}

interface SOP {
  id: string;
  title: string;
  category: string;
  content: string;
  version: string;
  createdAt: string;
}

const ICONS: Record<string, React.ReactNode> = {
  Shield: <Shield className="w-6 h-6" />,
  Flame: <Flame className="w-6 h-6" />,
  HeartPulse: <HeartPulse className="w-6 h-6" />,
  Target: <Target className="w-6 h-6" />,
};

async function fetchDepartment(code: string): Promise<{ department: Department }> {
  const res = await fetch(`/api/departments/${code}`);
  if (!res.ok) throw new Error("Failed to fetch department");
  return res.json();
}

async function fetchRoster(code: string): Promise<{ roster: RosterMember[]; ranks: Rank[] }> {
  const res = await fetch(`/api/departments/${code}/roster`);
  if (!res.ok) throw new Error("Failed to fetch roster");
  return res.json();
}

async function fetchSOPs(code: string): Promise<{ sops: SOP[] }> {
  const res = await fetch(`/api/departments/${code}/sops`);
  if (!res.ok) throw new Error("Failed to fetch SOPs");
  return res.json();
}

interface AccessData {
  hasAccess: boolean;
  isLeadership: boolean;
  department: string;
}

async function checkAccess(code: string): Promise<AccessData> {
  const res = await fetch(`/api/user/check-access/${code}`, { credentials: "include" });
  if (!res.ok) return { hasAccess: false, isLeadership: false, department: code };
  return res.json();
}

export default function DepartmentPortal() {
  const [, params] = useRoute("/departments/:code/:tab?");
  const code = params?.code || "";
  const activeTab = params?.tab || "roster";
  
  const { data: user, isLoading: userLoading } = useUser();
  
  const { data: accessData, isLoading: accessLoading } = useQuery<AccessData>({
    queryKey: ["departmentAccess", code],
    queryFn: () => checkAccess(code),
    enabled: !!user && !!code,
  });
  
  const hasLeadershipAccess = accessData?.isLeadership || false;
  
  const { data: deptData, isLoading: deptLoading } = useQuery({
    queryKey: ["department", code],
    queryFn: () => fetchDepartment(code),
    enabled: !!code,
  });

  if (userLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-6 flex justify-center">
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/departments" />;
  }

  if (accessData?.hasAccess === false) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-6 flex flex-col items-center justify-center">
          <Lock className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to access this department portal.</p>
          <Link href="/departments">
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Departments
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const department = deptData?.department;
  const icon = department ? (ICONS[department.icon] || <Shield className="w-6 h-6" />) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <Link href="/departments">
            <Button variant="ghost" className="mb-6 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Departments
            </Button>
          </Link>

          {deptLoading ? (
            <Skeleton className="h-20 mb-8" />
          ) : department ? (
            <motion.header 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-8"
            >
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: `${department.color}20`, color: department.color }}
              >
                {icon}
              </div>
              <div>
                <h1 className="text-3xl font-black" style={{ color: department.color }}>
                  {department.name}
                </h1>
                <p className="text-muted-foreground">{department.description}</p>
              </div>
            </motion.header>
          ) : null}

          <Tabs value={activeTab} className="w-full">
            <TabsList className="bg-zinc-900/50 border border-white/5 mb-8">
              <Link href={`/departments/${code}/roster`}>
                <TabsTrigger value="roster" className="gap-2" data-testid="tab-roster">
                  <Users className="w-4 h-4" /> Roster
                </TabsTrigger>
              </Link>
              <Link href={`/departments/${code}/sops`}>
                <TabsTrigger value="sops" className="gap-2" data-testid="tab-sops">
                  <FileText className="w-4 h-4" /> SOPs
                </TabsTrigger>
              </Link>
              <Link href={`/departments/${code}/applications`}>
                <TabsTrigger value="applications" className="gap-2" data-testid="tab-applications">
                  <ClipboardList className="w-4 h-4" /> Applications
                </TabsTrigger>
              </Link>
              {hasLeadershipAccess && (
                <Link href={`/departments/${code}/leadership`}>
                  <TabsTrigger value="leadership" className="gap-2" data-testid="tab-leadership">
                    <Settings className="w-4 h-4" /> Leadership Settings
                  </TabsTrigger>
                </Link>
              )}
            </TabsList>

            <TabsContent value="roster">
              <RosterTab code={code} deptColor={department?.color || "#f97316"} />
            </TabsContent>
            
            <TabsContent value="sops">
              <SOPsTab code={code} />
            </TabsContent>
            
            <TabsContent value="applications">
              <ApplicationsTab code={code} user={user} />
            </TabsContent>
            
            {hasLeadershipAccess && (
              <TabsContent value="leadership">
                <LeadershipSettingsTab code={code} deptColor={department?.color || "#f97316"} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function RosterTab({ code, deptColor }: { code: string; deptColor: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["roster", code],
    queryFn: () => fetchRoster(code),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const roster = data?.roster || [];
  const allRanks = data?.ranks || [];

  const rankGroups = allRanks.map(rank => ({
    rank,
    members: roster.filter(m => m.rankId === rank.id),
  }));

  const populatedGroups = rankGroups.filter(g => g.members.length > 0);
  const emptyRanks = rankGroups.filter(g => g.members.length === 0);

  return (
    <div className="space-y-6" data-testid="roster-tab">
      {populatedGroups.length > 0 && populatedGroups.map(({ rank, members }) => (
        <section key={rank.id}>
          <div className="flex items-center gap-3 mb-3">
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: rank.isLeadership ? deptColor : undefined }}
            >
              {rank.name}
            </h2>
            <div className="flex-1 border-t border-white/5" />
            <span className="text-xs text-muted-foreground">{members.length}</span>
          </div>
          {rank.isLeadership ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <RosterCard key={member.id} member={member} deptColor={deptColor} isLeadership />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <RosterRow key={member.id} member={member} deptColor={deptColor} />
              ))}
            </div>
          )}
        </section>
      ))}

      {populatedGroups.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No roster members yet.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Assign Discord Role IDs to department ranks to auto-populate the roster.
          </p>
        </div>
      )}

      {emptyRanks.length > 0 && populatedGroups.length > 0 && (
        <div className="border-t border-white/5 pt-4">
          <p className="text-xs text-muted-foreground mb-2">Ranks with no members:</p>
          <div className="flex flex-wrap gap-2">
            {emptyRanks.map(({ rank }) => (
              <Badge key={rank.id} variant="outline" className="text-xs text-muted-foreground">
                {rank.name} {!rank.discordRoleId && "(no Discord role linked)"}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RosterCard({ member, deptColor, isLeadership }: { member: RosterMember; deptColor: string; isLeadership?: boolean }) {
  if (!member.user) return null;
  
  return (
    <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 ring-2 ring-primary" style={{ borderColor: deptColor, border: `2px solid ${deptColor}` }}>
          <img 
            src={getAvatarUrl(member.user)} 
            alt={member.user.username}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-bold">{member.user.username}</h3>
          <p className="text-sm" style={{ color: deptColor }}>{member.rank?.name}</p>
          {member.callsign && (
            <Badge variant="outline" className="mt-1 text-xs">
              {member.callsign}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RosterRow({ member, deptColor }: { member: RosterMember; deptColor: string }) {
  if (!member.user) return null;
  
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800">
        <img 
          src={getAvatarUrl(member.user)} 
          alt={member.user.username}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1">
        <span className="font-medium">{member.user.username}</span>
      </div>
      <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${deptColor}20`, color: deptColor }}>
        {member.rank?.abbreviation || member.rank?.name}
      </Badge>
      {member.callsign && (
        <Badge variant="outline" className="text-xs">
          {member.callsign}
        </Badge>
      )}
    </div>
  );
}

function SOPsTab({ code }: { code: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sops", code],
    queryFn: () => fetchSOPs(code),
  });

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  const sops = data?.sops || [];

  // Group by category
  const categories = sops.reduce((acc, sop) => {
    if (!acc[sop.category]) acc[sop.category] = [];
    acc[sop.category].push(sop);
    return acc;
  }, {} as Record<string, SOP[]>);

  return (
    <div className="space-y-8">
      {Object.entries(categories).map(([category, categorySOPs]) => (
        <section key={category}>
          <h2 className="text-lg font-bold mb-4 uppercase tracking-widest text-muted-foreground">
            {category}
          </h2>
          <div className="space-y-4">
            {categorySOPs.map((sop) => (
              <Card key={sop.id} className="bg-zinc-900/40 border-white/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{sop.title}</CardTitle>
                      <CardDescription>Version {sop.version}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {new Date(sop.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-muted-foreground whitespace-pre-wrap">{sop.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {sops.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No SOPs published yet.</p>
        </div>
      )}
    </div>
  );
}

function ApplicationsTab({ code, user }: { code: string; user: User }) {
  return (
    <div className="space-y-8">
      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle>Join This Department</CardTitle>
          <CardDescription>
            Submit an application to join this department's roster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Application forms coming soon.</p>
            <p className="text-sm text-muted-foreground/60">
              Contact department leadership on Discord for now.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RankRow({ rank, deptColor, onUpdate }: { rank: Rank; deptColor: string; onUpdate: (data: Record<string, unknown>) => void }) {
  const [editing, setEditing] = useState(false);
  const [discordRoleId, setDiscordRoleId] = useState(rank.discordRoleId || "");

  if (editing) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/50 border border-white/10">
        <div className="w-8 text-muted-foreground font-mono">{rank.priority}</div>
        <div className="flex-1 font-medium">{rank.name}</div>
        <div className="flex-1">
          <Input
            placeholder="Discord Role ID (e.g. 123456789012345678)"
            value={discordRoleId}
            onChange={(e) => setDiscordRoleId(e.target.value)}
            className="h-8 text-sm"
            data-testid={`input-rank-discord-id-${rank.id}`}
            autoFocus
          />
        </div>
        <Button
          size="sm"
          className="h-8"
          onClick={() => {
            onUpdate({ discordRoleId: discordRoleId || null });
            setEditing(false);
          }}
          data-testid={`button-save-rank-${rank.id}`}
        >
          <Check className="w-3 h-3 mr-1" /> Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => { setEditing(false); setDiscordRoleId(rank.discordRoleId || ""); }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors">
      <div className="w-8 text-muted-foreground font-mono">{rank.priority}</div>
      <div className="flex-1 font-medium">{rank.name}</div>
      <div className="w-24 text-center">
        <Badge variant="secondary" style={{ backgroundColor: `${deptColor}20`, color: deptColor }}>
          {rank.abbreviation || "-"}
        </Badge>
      </div>
      <div className="w-24 text-center text-muted-foreground">
        {rank.callsignPrefix || "-"}
      </div>
      <div className="w-40 text-center text-xs font-mono">
        {rank.discordRoleId ? (
          <span className="text-green-400">{rank.discordRoleId.slice(-8)}</span>
        ) : (
          <span className="text-red-400/60">Not linked</span>
        )}
      </div>
      <div className="w-24 text-center">
        {rank.isLeadership ? (
          <Badge className="bg-primary text-black">Command</Badge>
        ) : (
          <Badge variant="outline">Personnel</Badge>
        )}
      </div>
      <div className="w-16 flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setEditing(true)}
          data-testid={`button-edit-rank-${rank.id}`}
        >
          <Edit className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function LeadershipSettingsTab({ code, deptColor }: { code: string; deptColor: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingRank, setIsAddingRank] = useState(false);
  const [newRank, setNewRank] = useState({
    name: "",
    abbreviation: "",
    priority: 10,
    isLeadership: false,
    callsignPrefix: "",
    discordRoleId: "",
  });

  const { data: ranksData, isLoading } = useQuery({
    queryKey: ["departmentRanks", code],
    queryFn: async () => {
      const res = await fetch(`/api/departments/${code}/ranks`);
      if (!res.ok) throw new Error("Failed to fetch ranks");
      return res.json() as Promise<{ ranks: Rank[] }>;
    },
  });

  const createRankMutation = useMutation({
    mutationFn: async (rankData: typeof newRank) => {
      const res = await fetch(`/api/departments/${code}/ranks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(rankData),
      });
      if (!res.ok) throw new Error("Failed to create rank");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rank Created", description: "New rank has been added." });
      queryClient.invalidateQueries({ queryKey: ["departmentRanks", code] });
      setIsAddingRank(false);
      setNewRank({ name: "", abbreviation: "", priority: 10, isLeadership: false, callsignPrefix: "", discordRoleId: "" });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not create rank.", variant: "destructive" });
    },
  });

  const updateRankMutation = useMutation({
    mutationFn: async ({ rankId, data }: { rankId: string; data: Partial<Rank> }) => {
      const res = await fetch(`/api/departments/${code}/ranks/${rankId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update rank");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rank Updated" });
      queryClient.invalidateQueries({ queryKey: ["departmentRanks", code] });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not update rank.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const ranks = ranksData?.ranks || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: deptColor }}>Hierarchy Management</h2>
          <p className="text-muted-foreground">Manage department ranks and Discord role mappings</p>
        </div>
        <Button onClick={() => setIsAddingRank(true)} disabled={isAddingRank} data-testid="button-add-rank">
          <Plus className="w-4 h-4 mr-2" /> Add Rank
        </Button>
      </div>

      {isAddingRank && (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> New Rank
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Rank Name</Label>
                <Input
                  placeholder="Commissioner"
                  value={newRank.name}
                  onChange={(e) => setNewRank({ ...newRank, name: e.target.value })}
                  data-testid="input-rank-name"
                />
              </div>
              <div>
                <Label>Abbreviation</Label>
                <Input
                  placeholder="COMM"
                  value={newRank.abbreviation}
                  onChange={(e) => setNewRank({ ...newRank, abbreviation: e.target.value })}
                  data-testid="input-rank-abbrev"
                />
              </div>
              <div>
                <Label>Priority (Lower = Higher Rank)</Label>
                <Input
                  type="number"
                  value={newRank.priority}
                  onChange={(e) => setNewRank({ ...newRank, priority: parseInt(e.target.value) || 0 })}
                  data-testid="input-rank-priority"
                />
              </div>
              <div>
                <Label>Callsign Prefix</Label>
                <Input
                  placeholder="1-"
                  value={newRank.callsignPrefix}
                  onChange={(e) => setNewRank({ ...newRank, callsignPrefix: e.target.value })}
                  data-testid="input-callsign-prefix"
                />
              </div>
              <div>
                <Label>Discord Role ID</Label>
                <Input
                  placeholder="123456789012345678"
                  value={newRank.discordRoleId}
                  onChange={(e) => setNewRank({ ...newRank, discordRoleId: e.target.value })}
                  data-testid="input-rank-discord-id"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox 
                  checked={newRank.isLeadership}
                  onCheckedChange={(checked) => setNewRank({ ...newRank, isLeadership: checked as boolean })}
                  id="is-leadership"
                />
                <Label htmlFor="is-leadership">Command/Leadership Position</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createRankMutation.mutate(newRank)}
                disabled={!newRank.name || createRankMutation.isPending}
                data-testid="button-save-rank"
              >
                Create Rank
              </Button>
              <Button variant="outline" onClick={() => setIsAddingRank(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="w-8">#</div>
          <div className="flex-1">Rank Name</div>
          <div className="w-24 text-center">Abbreviation</div>
          <div className="w-24 text-center">Prefix</div>
          <div className="w-40 text-center">Discord Role ID</div>
          <div className="w-24 text-center">Type</div>
          <div className="w-16"></div>
        </div>
        
        {ranks.map((rank) => (
          <RankRow key={rank.id} rank={rank} deptColor={deptColor} onUpdate={(data) => updateRankMutation.mutate({ rankId: rank.id, data })} />
        ))}
        
        {ranks.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No ranks configured. Add your first rank above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
