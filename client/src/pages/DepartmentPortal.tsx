import { useState, useEffect, useRef } from "react";
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
import { useUpload } from "@/hooks/use-upload";
import { Shield, Flame, HeartPulse, Target, Users, FileText, ClipboardList, ChevronLeft, Lock, Settings, Plus, Trash2, GripVertical, Edit, Check, BookOpen, ChevronRight, X, Layers, Truck, Bell, TrafficCone, Paperclip, Image as ImageIcon, Loader2, Download, ArrowUp, ArrowDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUser, getAvatarUrl, type User } from "@/lib/auth";
import policeBanner from "@assets/police_1770891742345.png";
import fireBanner from "@assets/fire_1770891742346.png";
import emsBanner from "@assets/ems_1770891742345.png";
import { fireSopSections } from "@/data/sop-fire";
import { emsSopSections } from "@/data/sop-ems";
import type { SOPSection, SOPContentBlock } from "@/data/sop-fire";

interface Department {
  id: string;
  code: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
}

const DEPARTMENT_BANNERS: Record<string, string> = {
  police: policeBanner,
  fire: fireBanner,
  ems: emsBanner,
};

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
  qid: string | null;
  squadId: string | null;
  status: string;
  user: { id: string; username: string; displayName: string | null; avatar: string | null; discordId: string; roles: string[] | null } | null;
  rank: Rank | null;
}

interface AosSquad {
  id: string;
  name: string;
  priority: number | null;
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
  Truck: <Truck className="w-6 h-6" />,
  TrafficCone: <TrafficCone className="w-6 h-6" />,
};

async function fetchDepartment(code: string): Promise<{ department: Department }> {
  const res = await fetch(`/api/departments/${code}`);
  if (!res.ok) throw new Error("Failed to fetch department");
  return res.json();
}

async function fetchRoster(code: string): Promise<{ roster: RosterMember[]; ranks: Rank[]; emsCsoRoleId?: string | null }> {
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

async function fetchAosSquads(): Promise<{ squads: AosSquad[] }> {
  const res = await fetch("/api/aos/squads");
  if (!res.ok) throw new Error("Failed to fetch squads");
  return res.json();
}

async function checkAccess(code: string): Promise<AccessData> {
  const res = await fetch(`/api/user/check-access/${code}`, { credentials: "include" });
  if (!res.ok) return { hasAccess: false, isLeadership: false, department: code };
  return res.json();
}

function AccessDeniedPage({ code, user }: { code: string; user: User }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [viewingSubmissionId, setViewingSubmissionId] = useState<string | null>(null);

  const { data: whitelistData, isLoading } = useQuery({
    queryKey: ["whitelist-form", code],
    queryFn: async () => {
      const res = await fetch(`/api/departments/${code}/whitelist-form`);
      if (!res.ok) return { form: null, questions: [] };
      return res.json() as Promise<{ form: AppForm | null; questions: AppQuestion[] }>;
    },
  });

  const { data: myAppsData } = useQuery({
    queryKey: ["my-applications", code],
    queryFn: async () => {
      const res = await fetch(`/api/user/my-applications/${code}`, { credentials: "include" });
      if (!res.ok) return { submissions: [] };
      return res.json() as Promise<{ submissions: AppSubmission[] }>;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/departments/${code}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ formId: whitelistData!.form!.id, answers }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Application Submitted", description: "Your whitelist application has been submitted for review." });
      setShowForm(false);
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not submit application.", variant: "destructive" });
    },
  });

  const whitelistForm = whitelistData?.form;
  const questions = whitelistData?.questions || [];
  const myApps = myAppsData?.submissions || [];

  if (viewingSubmissionId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-6 max-w-4xl mx-auto">
          <SubmissionThread
            submissionId={viewingSubmissionId}
            user={user}
            isLeadership={false}
            onBack={() => setViewingSubmissionId(null)}
          />
        </div>
      </div>
    );
  }

  if (showForm && whitelistForm) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-6 max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => setShowForm(false)} className="gap-2 text-muted-foreground mb-6" data-testid="button-back-whitelist">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Card className="bg-zinc-900/40 border-white/5">
            <CardHeader>
              <CardTitle>{whitelistForm.title}</CardTitle>
              {whitelistForm.description && <CardDescription>{whitelistForm.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q) => {
                const opts = q.options ? JSON.parse(q.options) : [];
                return (
                  <div key={q.id} className="space-y-1.5">
                    <Label className="text-sm">
                      {q.label} {q.isRequired && <span className="text-red-400">*</span>}
                    </Label>
                    {q.type === "short_answer" && (
                      <Input value={(answers[q.id] as string) || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} data-testid={`input-answer-${q.id}`} />
                    )}
                    {q.type === "long_answer" && (
                      <textarea className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground min-h-[100px]" value={(answers[q.id] as string) || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} data-testid={`textarea-answer-${q.id}`} />
                    )}
                    {q.type === "dropdown" && (
                      <select className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground" value={(answers[q.id] as string) || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} data-testid={`select-answer-${q.id}`}>
                        <option value="">Select...</option>
                        {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {q.type === "checkbox" && (
                      <div className="space-y-1">
                        {opts.map((o: string) => (
                          <div key={o} className="flex items-center gap-2">
                            <Checkbox
                              checked={((answers[q.id] as string[]) || []).includes(o)}
                              onCheckedChange={(checked) => {
                                const current = (answers[q.id] as string[]) || [];
                                setAnswers({ ...answers, [q.id]: checked ? [...current, o] : current.filter(v => v !== o) });
                              }}
                            />
                            <span className="text-sm">{o}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} data-testid="button-submit-whitelist">
                {submitMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-6 flex flex-col items-center justify-center">
        <Lock className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You don't have permission to access this department portal.</p>
        <div className="flex gap-3">
          <Link href="/departments">
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Departments
            </Button>
          </Link>
          {!isLoading && whitelistForm && (
            <Button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600 text-black" data-testid="button-apply-now">
              <ClipboardList className="w-4 h-4 mr-2" /> Apply Now
            </Button>
          )}
        </div>

        {myApps.length > 0 && (
          <div className="mt-10 w-full max-w-2xl">
            <h2 className="text-lg font-semibold mb-4">Your Applications</h2>
            <div className="space-y-3">
              {myApps.map((sub) => (
                <Card key={sub.id} className="bg-zinc-900/40 border-white/5 cursor-pointer hover:bg-zinc-800/60 transition-colors" onClick={() => setViewingSubmissionId(sub.id)} data-testid={`my-app-${sub.id}`}>
                  <CardContent className="flex items-center justify-between py-4 px-5">
                    <div>
                      <p className="font-medium text-sm">{(sub as any).formTitle || "Application"}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(sub.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      sub.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      sub.status === "accepted" ? "bg-green-500/20 text-green-400" :
                      sub.status === "denied" ? "bg-red-500/20 text-red-400" :
                      "bg-zinc-500/20 text-zinc-400"
                    }`}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DepartmentPortal() {
  const [, params] = useRoute("/departments/:code/:tab?");
  const rawCode = params?.code || "";
  const activeTab = params?.tab || "roster";
  
  const searchParams = new URLSearchParams(window.location.search);
  const deepLinkSubmissionId = searchParams.get("submission");
  
  const isPolicePortal = rawCode === "police";
  const [activeSection, setActiveSection] = useState<"police" | "aos">("police");
  const code = isPolicePortal ? activeSection : rawCode;
  
  const { data: user, isLoading: userLoading } = useUser();
  
  const { data: accessData, isLoading: accessLoading } = useQuery<AccessData>({
    queryKey: ["departmentAccess", code],
    queryFn: () => checkAccess(code),
    enabled: !!user && !!code,
  });

  const { data: aosAccessData } = useQuery<AccessData>({
    queryKey: ["departmentAccess", "aos"],
    queryFn: () => checkAccess("aos"),
    enabled: !!user && isPolicePortal,
  });

  const hasAosAccess = aosAccessData?.hasAccess || user?.staffTier === "director" || user?.staffTier === "executive" || false;
  
  const hasLeadershipAccess = accessData?.isLeadership || user?.staffTier === "director" || user?.staffTier === "executive" || false;
  
  const { data: deptData, isLoading: deptLoading } = useQuery({
    queryKey: ["department", code],
    queryFn: () => fetchDepartment(code),
    enabled: !!code,
  });

  const { data: aosDeptData } = useQuery({
    queryKey: ["department", "aos"],
    queryFn: () => fetchDepartment("aos"),
    enabled: isPolicePortal,
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

  if (rawCode === "aos") {
    return <Redirect to="/departments/police" />;
  }

  if (accessData?.hasAccess === false) {
    return <AccessDeniedPage code={code} user={user} />;
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
            <>
              <motion.header 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mb-4"
              >
                <div 
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: `${department.color}20`, color: department.color }}
                >
                  {icon}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-black" style={{ color: department.color }}>
                    {department.name}
                  </h1>
                  <p className="text-muted-foreground">{department.description}</p>
                </div>
              </motion.header>

              {isPolicePortal && hasAosAccess && (
                <div className="flex gap-2 mb-8" data-testid="police-aos-toggle">
                  <Button
                    variant={activeSection === "police" ? "default" : "outline"}
                    onClick={() => setActiveSection("police")}
                    className="gap-2"
                    style={activeSection === "police" ? { backgroundColor: "#3B82F6", color: "white" } : {}}
                    data-testid="toggle-police"
                  >
                    <Shield className="w-4 h-4" /> Auckland Police
                  </Button>
                  <Button
                    variant={activeSection === "aos" ? "default" : "outline"}
                    onClick={() => setActiveSection("aos")}
                    className="gap-2"
                    style={activeSection === "aos" ? { backgroundColor: "#8B5CF6", color: "white" } : {}}
                    data-testid="toggle-aos"
                  >
                    <Target className="w-4 h-4" /> Armed Offenders Squad
                  </Button>
                </div>
              )}

              {!(isPolicePortal && hasAosAccess) && <div className="mb-4" />}
            </>
          ) : null}

          {DEPARTMENT_BANNERS[code] && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 rounded-xl overflow-hidden border border-white/10"
              data-testid={`banner-${code}`}
            >
              <img
                src={DEPARTMENT_BANNERS[code]}
                alt={`${department?.name || code} banner`}
                className="w-full h-auto object-cover"
              />
            </motion.div>
          )}

          <Tabs value={activeTab} className="w-full">
            <TabsList className="bg-zinc-900/50 border border-white/5 mb-8">
              <Link href={`/departments/${rawCode}/roster`}>
                <TabsTrigger value="roster" className="gap-2" data-testid="tab-roster">
                  <Users className="w-4 h-4" /> Roster
                </TabsTrigger>
              </Link>
              <Link href={`/departments/${rawCode}/sops`}>
                <TabsTrigger value="sops" className="gap-2" data-testid="tab-sops">
                  <FileText className="w-4 h-4" /> SOPs
                </TabsTrigger>
              </Link>
              <Link href={`/departments/${rawCode}/applications`}>
                <TabsTrigger value="applications" className="gap-2" data-testid="tab-applications">
                  <ClipboardList className="w-4 h-4" /> Applications
                </TabsTrigger>
              </Link>
              {hasLeadershipAccess && (
                <Link href={`/departments/${rawCode}/leadership`}>
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
              <ApplicationsTab code={code} user={user} isLeadership={hasLeadershipAccess} deepLinkSubmissionId={deepLinkSubmissionId} />
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

  const { data: squadsData } = useQuery({
    queryKey: ["aosSquads"],
    queryFn: fetchAosSquads,
    enabled: code === "aos",
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  const roster = data?.roster || [];
  const allRanks = data?.ranks || [];
  const emsCsoRoleId = data?.emsCsoRoleId || null;
  const isPolice = code === "police";
  const isEms = code === "ems";
  const isAos = code === "aos";
  const squads = squadsData?.squads || [];

  if (isAos && squads.length > 0) {
    return <AosSquadRoster roster={roster} allRanks={allRanks} squads={squads} deptColor={deptColor} />;
  }

  if (isEms) {
    return <EmsRoster roster={roster} allRanks={allRanks} deptColor={deptColor} csoRoleId={emsCsoRoleId} />;
  }

  const rankGroups = allRanks.map(rank => ({
    rank,
    members: roster.filter(m => m.rankId === rank.id),
  }));

  const populatedGroups = rankGroups.filter(g => g.members.length > 0);
  const emptyRanks = rankGroups.filter(g => g.members.length === 0);

  return (
    <div className="space-y-1" data-testid="roster-tab">
      <div className="rounded-lg border border-white/5 overflow-hidden">
        <div className="grid items-center gap-2 px-4 py-2 bg-zinc-900/60 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          style={{ gridTemplateColumns: isPolice ? "2.5rem 1fr 10rem 6rem" : "2.5rem 1fr 10rem" }}
        >
          <div>#</div>
          <div>Member</div>
          <div className="text-center">Rank</div>
          {isPolice && <div className="text-center">QID</div>}
        </div>

        {populatedGroups.length > 0 && populatedGroups.map(({ rank, members }, groupIdx) => (
          <div key={rank.id}>
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800/40 border-b border-white/5">
              <h2
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: rank.isLeadership ? deptColor : undefined }}
              >
                {rank.name}
              </h2>
              <div className="flex-1 border-t border-white/5" />
              <span className="text-[10px] text-muted-foreground">{members.length}</span>
            </div>
            {members.map((member, idx) => (
              <RosterTableRow
                key={member.id}
                member={member}
                deptColor={deptColor}
                index={idx + 1}
                isPolice={isPolice}
              />
            ))}
          </div>
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
      </div>

      {emptyRanks.length > 0 && populatedGroups.length > 0 && (
        <div className="pt-4">
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

function AosSquadRoster({ roster, allRanks, squads, deptColor }: { roster: RosterMember[]; allRanks: Rank[]; squads: AosSquad[]; deptColor: string }) {
  const leadershipRanks = allRanks.filter(r => r.isLeadership);
  const leadershipRankIds = new Set(leadershipRanks.map(r => r.id));
  const leadershipMembers = roster.filter(m => leadershipRankIds.has(m.rankId));
  const nonLeadershipRoster = roster.filter(m => !leadershipRankIds.has(m.rankId));
  const unassigned = nonLeadershipRoster.filter(m => !m.squadId || !squads.find(s => s.id === m.squadId));

  const rosterTableHeader = (
    <div className="grid items-center gap-2 px-4 py-2 bg-zinc-900/60 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      style={{ gridTemplateColumns: "2.5rem 1fr 10rem" }}
    >
      <div>#</div>
      <div>Member</div>
      <div className="text-center">Rank</div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="roster-tab">
      {leadershipMembers.length > 0 && (
        <div className="rounded-lg border border-white/5 overflow-hidden" data-testid="squad-section-leadership">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/60 border-b border-white/10">
            <Shield className="w-4 h-4" style={{ color: deptColor }} />
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: deptColor }}>
              Leadership
            </h2>
            <div className="flex-1 border-t border-white/5" />
            <span className="text-xs text-muted-foreground">{leadershipMembers.length} members</span>
          </div>
          {rosterTableHeader}
          {leadershipRanks
            .map(rank => ({
              rank,
              members: leadershipMembers.filter(m => m.rankId === rank.id),
            }))
            .filter(g => g.members.length > 0)
            .map(({ rank, members }) => (
              <div key={rank.id}>
                <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-800/30 border-b border-white/5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: deptColor }}>
                    {rank.name}
                  </h3>
                  <div className="flex-1 border-t border-white/5" />
                  <span className="text-[10px] text-muted-foreground">{members.length}</span>
                </div>
                {members.map((member, idx) => (
                  <RosterTableRow key={member.id} member={member} deptColor={deptColor} index={idx + 1} isPolice={false} />
                ))}
              </div>
            ))}
        </div>
      )}

      {squads.map((squad) => {
        const squadMembers = nonLeadershipRoster.filter(m => m.squadId === squad.id);
        const rankGroups = allRanks
          .filter(r => !r.isLeadership)
          .map(rank => ({
            rank,
            members: squadMembers.filter(m => m.rankId === rank.id),
          }))
          .filter(g => g.members.length > 0);

        return (
          <div key={squad.id} className="rounded-lg border border-white/5 overflow-hidden" data-testid={`squad-section-${squad.id}`}>
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/60 border-b border-white/10">
              <Layers className="w-4 h-4" style={{ color: deptColor }} />
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: deptColor }}>
                {squad.name}
              </h2>
              <div className="flex-1 border-t border-white/5" />
              <span className="text-xs text-muted-foreground">{squadMembers.length} members</span>
            </div>
            {rosterTableHeader}
            {rankGroups.length > 0 ? rankGroups.map(({ rank, members }) => (
              <div key={rank.id}>
                <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-800/30 border-b border-white/5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">
                    {rank.name}
                  </h3>
                  <div className="flex-1 border-t border-white/5" />
                  <span className="text-[10px] text-muted-foreground">{members.length}</span>
                </div>
                {members.map((member, idx) => (
                  <RosterTableRow key={member.id} member={member} deptColor={deptColor} index={idx + 1} isPolice={false} />
                ))}
              </div>
            )) : (
              <div className="text-center py-6 text-sm text-muted-foreground">No members assigned to this squad.</div>
            )}
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="rounded-lg border border-white/5 overflow-hidden" data-testid="squad-section-unassigned">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/60 border-b border-white/10">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Unassigned
            </h2>
            <div className="flex-1 border-t border-white/5" />
            <span className="text-xs text-muted-foreground">{unassigned.length} members</span>
          </div>
          {rosterTableHeader}
          {allRanks
            .filter(r => !r.isLeadership)
            .map(rank => ({
              rank,
              members: unassigned.filter(m => m.rankId === rank.id),
            }))
            .filter(g => g.members.length > 0)
            .map(({ rank, members }) => (
              <div key={rank.id}>
                <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-800/30 border-b border-white/5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">
                    {rank.name}
                  </h3>
                  <div className="flex-1 border-t border-white/5" />
                  <span className="text-[10px] text-muted-foreground">{members.length}</span>
                </div>
                {members.map((member, idx) => (
                  <RosterTableRow key={member.id} member={member} deptColor={deptColor} index={idx + 1} isPolice={false} />
                ))}
              </div>
            ))}
        </div>
      )}

      {roster.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No roster members yet.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Assign Discord Role IDs to department ranks to auto-populate the roster.
          </p>
        </div>
      )}
    </div>
  );
}

const ATP_RANK_NAMES = ["Critical Care Paramedic", "Intensive Care Paramedic", "Paramedic", "Emergency Medical Technician", "First Responder"];

function EmsRoster({ roster, allRanks, deptColor, csoRoleId }: { roster: RosterMember[]; allRanks: Rank[]; deptColor: string; csoRoleId: string | null }) {
  const leadershipRanks = allRanks.filter(r => r.isLeadership);
  const atpRanks = allRanks.filter(r => ATP_RANK_NAMES.includes(r.name));
  const leadershipRankIds = new Set(leadershipRanks.map(r => r.id));

  const leadershipMembers = roster.filter(m => leadershipRankIds.has(m.rankId));
  const atpMembers = roster.filter(m => !leadershipRankIds.has(m.rankId));

  const leadershipGroups = leadershipRanks.map(rank => ({
    rank,
    members: leadershipMembers.filter(m => m.rankId === rank.id),
  })).filter(g => g.members.length > 0);

  return (
    <div className="space-y-6" data-testid="roster-tab">
      {leadershipGroups.length > 0 && (
        <div className="rounded-lg border border-white/5 overflow-hidden">
          <div className="grid items-center gap-2 px-4 py-2 bg-zinc-900/60 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            style={{ gridTemplateColumns: "2.5rem 1fr 10rem" }}
          >
            <div>#</div>
            <div>Member</div>
            <div className="text-center">Rank</div>
          </div>
          {leadershipGroups.map(({ rank, members }) => (
            <div key={rank.id}>
              <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800/40 border-b border-white/5">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: deptColor }}>{rank.name}</h2>
                <div className="flex-1 border-t border-white/5" />
                <span className="text-[10px] text-muted-foreground">{members.length}</span>
              </div>
              {members.map((member, idx) => (
                <RosterTableRow key={member.id} member={member} deptColor={deptColor} index={idx + 1} isPolice={false} />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/5 overflow-hidden">
        <div className="grid items-center gap-2 px-4 py-2 bg-zinc-900/60 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          style={{ gridTemplateColumns: "1fr 8rem 8rem 5rem" }}
        >
          <div>Name</div>
          <div className="text-center">ATP</div>
          <div className="text-center">Callsign</div>
          <div className="text-center">CSO</div>
        </div>

        {atpRanks.map(rank => {
          const members = atpMembers.filter(m => m.rankId === rank.id);
          if (members.length === 0) return null;
          return (
            <div key={rank.id}>
              <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800/40 border-b border-white/5">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: deptColor }}>{rank.name}</h2>
                <div className="flex-1 border-t border-white/5" />
                <span className="text-[10px] text-muted-foreground">{members.length}</span>
              </div>
              {members.map((member) => {
                if (!member.user) return null;
                const hasCso = csoRoleId && member.user.roles && member.user.roles.includes(csoRoleId);
                return (
                  <div
                    key={member.id}
                    className="grid items-center gap-2 px-4 py-2 border-b border-white/5 last:border-0 hover:bg-zinc-900/40 transition-colors"
                    style={{ gridTemplateColumns: "1fr 8rem 8rem 5rem" }}
                    data-testid={`roster-row-${member.user.discordId}`}
                  >
                    <Link href={`/profile/${member.user.discordId}`} className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                        <img src={getAvatarUrl(member.user)} alt={member.user.displayName || member.user.username} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-sm truncate">{member.user.displayName || member.user.username}</span>
                    </Link>
                    <div className="text-center">
                      <span className="text-xs font-medium" style={{ color: deptColor }}>
                        {rank.abbreviation || rank.name}
                      </span>
                    </div>
                    <div className="text-center">
                      {member.callsign ? (
                        <span className="text-xs font-mono font-bold" style={{ color: deptColor }}>{member.callsign}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="text-center">
                      {hasCso ? (
                        <div className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-500/20" data-testid={`cso-check-${member.user.discordId}`}>
                          <Check className="w-3 h-3 text-green-400" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {atpMembers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No roster members yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RosterTableRow({ member, deptColor, index, isPolice }: { member: RosterMember; deptColor: string; index: number; isPolice: boolean }) {
  if (!member.user) return null;

  return (
    <div
      className="grid items-center gap-2 px-4 py-2 border-b border-white/5 last:border-0 hover:bg-zinc-900/40 transition-colors"
      style={{ gridTemplateColumns: isPolice ? "2.5rem 1fr 10rem 6rem" : "2.5rem 1fr 10rem" }}
      data-testid={`roster-row-${member.user.discordId}`}
    >
      <div className="text-xs text-muted-foreground font-mono">{index}</div>
      <Link href={`/profile/${member.user.discordId}`} className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0">
          <img
            src={getAvatarUrl(member.user)}
            alt={member.user.displayName || member.user.username}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="font-medium text-sm truncate">{member.user.displayName || member.user.username}</span>
      </Link>
      <div className="text-center">
        <span className="text-xs font-medium" style={{ color: deptColor }}>
          {member.rank?.abbreviation || member.rank?.name}
        </span>
      </div>
      {isPolice && (
        <div className="text-center">
          {member.qid ? (
            <span className="text-xs font-mono font-bold" style={{ color: deptColor }}>{member.qid}</span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      )}
    </div>
  );
}

function SOPsDatabaseFallback({ code }: { code: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sops", code],
    queryFn: () => fetchSOPs(code),
  });

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  const sops = data?.sops || [];

  const categories = sops.reduce((acc, sop) => {
    if (!acc[sop.category]) acc[sop.category] = [];
    acc[sop.category].push(sop);
    return acc;
  }, {} as Record<string, SOP[]>);

  return (
    <div className="space-y-8">
      {Object.entries(categories).map(([category, categorySOPs]) => (
        <section key={category}>
          <h2 className="text-lg font-bold mb-4 uppercase tracking-widest text-muted-foreground">{category}</h2>
          <div className="space-y-4">
            {categorySOPs.map((sop) => (
              <Card key={sop.id} className="bg-zinc-900/40 border-white/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{sop.title}</CardTitle>
                      <CardDescription>Version {sop.version}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">{new Date(sop.createdAt).toLocaleDateString()}</Badge>
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
          <p className="text-muted-foreground" data-testid="text-no-sops">No SOPs published yet.</p>
        </div>
      )}
    </div>
  );
}

function SOPContentRenderer({ block, index }: { block: SOPContentBlock; index: number }) {
  switch (block.type) {
    case "paragraph":
      return <p className="text-sm text-muted-foreground leading-relaxed mb-3" data-testid={`text-sop-paragraph-${index}`}>{block.text}</p>;
    case "heading":
      return <h4 className="font-semibold text-sm text-foreground mt-4 mb-2" data-testid={`text-sop-heading-${index}`}>{block.text}</h4>;
    case "note":
      return (
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mb-3" data-testid={`text-sop-note-${index}`}>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{block.text}</p>
        </div>
      );
    case "list":
      return (
        <ul className="space-y-1.5 mb-3 ml-4" data-testid={`list-sop-${index}`}>
          {block.items?.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2" data-testid={`list-sop-item-${index}-${i}`}>
              <span className="text-primary/60 shrink-0 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto mb-3 rounded-lg border border-white/5" data-testid={`table-sop-${index}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5">
                {block.headers?.map((h, i) => (
                  <th key={i} className="text-left px-4 py-2.5 font-semibold text-foreground text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows?.map((row, i) => (
                <tr key={i} className="border-t border-white/5">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 text-muted-foreground">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

function SOPsTab({ code }: { code: string }) {
  const sopSections: SOPSection[] | null =
    code === "fire" ? fireSopSections :
    code === "ems" ? emsSopSections :
    null;

  const [activeSection, setActiveSection] = useState(sopSections?.[0]?.id || "");

  useEffect(() => {
    if (!sopSections) return;
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of sopSections) {
        const element = document.getElementById(`sop-${section.id}`);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sopSections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`sop-${sectionId}`);
    if (element) {
      const offset = 120;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  if (!sopSections) {
    return <SOPsDatabaseFallback code={code} />;
  }

  return (
    <div>
      <div className="lg:hidden mb-6">
        <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3 overflow-x-auto sticky top-20 z-40">
          <div className="flex gap-2 min-w-max">
            {sopSections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                  data-testid={`button-sop-section-${section.id}`}
                >
                  {section.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-28">
            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
                Jump To
              </h3>
              <nav className="space-y-1" data-testid="nav-sop-sections">
                {sopSections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                      data-testid={`button-sop-nav-${section.id}`}
                    >
                      <ChevronRight size={14} className={`shrink-0 transition-transform ${isActive ? "text-primary rotate-90" : ""}`} />
                      <span className="flex-1 truncate">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="space-y-10">
            {sopSections.map((section, sectionIndex) => (
              <motion.section
                key={section.id}
                id={`sop-${section.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: sectionIndex * 0.05 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{section.number}</span>
                  </div>
                  <h2 className="text-xl font-bold" data-testid={`text-sop-title-${section.id}`}>
                    {section.title}
                  </h2>
                </div>

                <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-5">
                  {section.content.map((block, blockIdx) => (
                    <SOPContentRenderer key={blockIdx} block={block} index={blockIdx} />
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

interface RolesOnAccept {
  discordRoleIds: string[];
  websiteRoles: string[];
}

interface AppForm {
  id: string;
  title: string;
  description: string | null;
  departmentCode: string;
  isActive: boolean;
  isWhitelist: boolean;
  rolesOnAccept: string | null;
  notifyRanks: string | null;
  createdAt: string;
}

interface AppQuestion {
  id: string;
  formId: string;
  label: string;
  type: string;
  options: string | null;
  isRequired: boolean;
  priority: number;
}

interface AppSubmission {
  id: string;
  formId: string;
  userId: string;
  departmentCode: string;
  status: string;
  answers: string | null;
  createdAt: string;
  formTitle: string;
  username: string;
  avatar: string | null;
  discordId: string;
}

interface AppMessage {
  id: string;
  submissionId: string;
  userId: string;
  content: string;
  createdAt: string;
  username: string;
  avatar: string | null;
  discordId: string;
  staffTier: string | null;
}

function ApplicationsTab({ code, user, isLeadership, deepLinkSubmissionId }: { code: string; user: User; isLeadership: boolean; deepLinkSubmissionId?: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "create-form" | "edit-form" | "fill-form" | "submission">(deepLinkSubmissionId ? "submission" : "list");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<AppForm | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(deepLinkSubmissionId || null);

  const { data: formsData } = useQuery({
    queryKey: ["forms", code],
    queryFn: async () => {
      const res = await fetch(`/api/departments/${code}/forms`, { credentials: "include" });
      if (!res.ok) return { forms: [] };
      return res.json() as Promise<{ forms: AppForm[] }>;
    },
  });

  const { data: submissionsData, isLoading: subsLoading } = useQuery({
    queryKey: ["submissions", code],
    queryFn: async () => {
      const res = await fetch(`/api/departments/${code}/submissions`, { credentials: "include" });
      if (!res.ok) return { submissions: [] };
      return res.json() as Promise<{ submissions: AppSubmission[] }>;
    },
  });

  const forms = formsData?.forms || [];
  const submissions = submissionsData?.submissions || [];

  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      const res = await fetch(`/api/forms/${formId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Form deleted" });
      queryClient.invalidateQueries({ queryKey: ["forms", code] });
    },
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (subId: string) => {
      const res = await fetch(`/api/submissions/${subId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Application deleted" });
      queryClient.invalidateQueries({ queryKey: ["submissions", code] });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not delete application.", variant: "destructive" });
    },
  });

  if (view === "create-form") {
    return <FormBuilder code={code} onBack={() => { setView("list"); queryClient.invalidateQueries({ queryKey: ["forms", code] }); }} />;
  }

  if (view === "edit-form" && editingForm) {
    return <FormBuilder code={code} editForm={editingForm} onBack={() => { setEditingForm(null); setView("list"); queryClient.invalidateQueries({ queryKey: ["forms", code] }); }} />;
  }

  if (view === "fill-form" && selectedFormId) {
    return <FormFiller formId={selectedFormId} code={code} user={user} onBack={() => { setView("list"); queryClient.invalidateQueries({ queryKey: ["submissions", code] }); }} />;
  }

  if (view === "submission" && selectedSubmissionId) {
    return <SubmissionThread submissionId={selectedSubmissionId} user={user} isLeadership={isLeadership} onBack={() => { setView("list"); queryClient.invalidateQueries({ queryKey: ["submissions", code] }); }} />;
  }

  return (
    <div className="space-y-8">
      {isLeadership && (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Application Forms</CardTitle>
                <CardDescription>Create and manage application forms for this department.</CardDescription>
              </div>
              <Button onClick={() => setView("create-form")} data-testid="button-create-form">
                <Plus className="w-4 h-4 mr-2" /> Create Form
              </Button>
            </div>
          </CardHeader>
          {forms.length > 0 && (
            <CardContent className="space-y-2">
              {forms.map((form) => (
                <div key={form.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors" data-testid={`form-${form.id}`}>
                  <div>
                    <span className="font-medium text-sm">{form.title}</span>
                    {form.isWhitelist && <Badge variant="outline" className="ml-2 text-[10px] border-orange-500/30 text-orange-400">Whitelist</Badge>}
                    {form.description && <p className="text-xs text-muted-foreground mt-0.5">{form.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setEditingForm(form); setView("edit-form"); }} data-testid={`button-edit-form-${form.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => deleteFormMutation.mutate(form.id)} data-testid={`button-delete-form-${form.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {!isLeadership && forms.length > 0 && (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader>
            <CardTitle>Apply to This Department</CardTitle>
            <CardDescription>Select an application form to fill out and submit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {forms.map((form) => (
              <div key={form.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors cursor-pointer" onClick={() => { setSelectedFormId(form.id); setView("fill-form"); }} data-testid={`form-apply-${form.id}`}>
                <div>
                  <span className="font-medium text-sm">{form.title}</span>
                  {form.description && <p className="text-xs text-muted-foreground mt-0.5">{form.description}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle>{isLeadership ? "All Applications" : "My Applications"}</CardTitle>
          <CardDescription>{isLeadership ? "Review and respond to submitted applications." : "View the status of your submitted applications."}</CardDescription>
        </CardHeader>
        <CardContent>
          {subsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{isLeadership ? "No applications submitted yet." : "You haven't submitted any applications yet."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                  onClick={() => { setSelectedSubmissionId(sub.id); setView("submission"); }}
                  data-testid={`submission-${sub.id}`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                    <img src={sub.avatar ? `https://cdn.discordapp.com/avatars/${sub.discordId}/${sub.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(sub.discordId) % 5}.png`} alt={sub.displayName || sub.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{sub.displayName || sub.username}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{sub.formTitle}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(sub.createdAt).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="outline" className={`text-xs ${sub.status === "accepted" ? "border-green-500/50 text-green-400" : sub.status === "denied" ? "border-red-500/50 text-red-400" : sub.status === "under_review" ? "border-yellow-500/50 text-yellow-400" : "border-white/20"}`}>
                    {sub.status.replace("_", " ")}
                  </Badge>
                  {isLeadership && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300 shrink-0"
                      onClick={(e) => { e.stopPropagation(); deleteSubmissionMutation.mutate(sub.id); }}
                      data-testid={`button-delete-submission-${sub.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!isLeadership && forms.length === 0 && submissions.length === 0 && (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardContent className="py-8">
            <div className="text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No application forms available yet.</p>
              <p className="text-sm text-muted-foreground/60">Contact department leadership on Discord for now.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FormBuilder({ code, editForm, onBack }: { code: string; editForm?: AppForm; onBack: () => void }) {
  const { toast } = useToast();
  const isEditing = !!editForm;
  const [title, setTitle] = useState(editForm?.title || "");
  const [description, setDescription] = useState(editForm?.description || "");
  const [isWhitelist, setIsWhitelist] = useState(editForm?.isWhitelist || false);
  const [questions, setQuestions] = useState<Array<{ label: string; type: string; options: string[]; isRequired: boolean }>>([]);
  const [selectedDiscordRoles, setSelectedDiscordRoles] = useState<string[]>([]);
  const [selectedWebsiteRoles, setSelectedWebsiteRoles] = useState<string[]>([]);
  const [selectedNotifyRanks, setSelectedNotifyRanks] = useState<string[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(!isEditing);

  const { data: ranksData } = useQuery({
    queryKey: ["ranks", code],
    queryFn: async () => {
      const res = await fetch(`/api/departments/${code}/ranks`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.ranks || data) as Array<{ id: string; name: string; discordRoleId: string | null; departmentCode: string }>;
    },
  });

  const { data: editFormData } = useQuery({
    queryKey: ["form", editForm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/forms/${editForm!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ form: AppForm; questions: AppQuestion[] }>;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (isEditing && editFormData && !questionsLoaded) {
      const qs = editFormData.questions.map(q => ({
        label: q.label,
        type: q.type,
        options: q.options ? JSON.parse(q.options) : [],
        isRequired: q.isRequired,
      }));
      setQuestions(qs);
      if (editForm?.rolesOnAccept) {
        try {
          const roles: RolesOnAccept = JSON.parse(editForm.rolesOnAccept);
          setSelectedDiscordRoles(roles.discordRoleIds || []);
          setSelectedWebsiteRoles(roles.websiteRoles || []);
        } catch {}
      }
      if (editForm?.notifyRanks) {
        try {
          const ranks: string[] = JSON.parse(editForm.notifyRanks);
          setSelectedNotifyRanks(ranks);
        } catch {}
      }
      setQuestionsLoaded(true);
    }
  }, [editFormData, isEditing, questionsLoaded]);

  const deptRanks = ranksData || [];
  const ranksWithDiscordRole = deptRanks.filter(r => r.discordRoleId);
  const websiteRoleOptions = [code, ...(code === "police" ? ["aos"] : [])];

  const toggleDiscordRole = (roleId: string) => {
    setSelectedDiscordRoles(prev => prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]);
  };

  const toggleWebsiteRole = (role: string) => {
    setSelectedWebsiteRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const toggleNotifyRank = (rankId: string) => {
    setSelectedNotifyRanks(prev => prev.includes(rankId) ? prev.filter(r => r !== rankId) : [...prev, rankId]);
  };

  const addQuestion = () => {
    setQuestions([...questions, { label: "", type: "short_answer", options: [], isRequired: true }]);
  };

  const updateQuestion = (idx: number, updates: Partial<typeof questions[0]>) => {
    const copy = [...questions];
    copy[idx] = { ...copy[idx], ...updates };
    setQuestions(copy);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx: number, direction: "up" | "down") => {
    const copy = [...questions];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= copy.length) return;
    [copy[idx], copy[swapIdx]] = [copy[swapIdx], copy[idx]];
    setQuestions(copy);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rolesOnAccept: RolesOnAccept = { discordRoleIds: selectedDiscordRoles, websiteRoles: selectedWebsiteRoles };
      const url = isEditing ? `/api/forms/${editForm!.id}` : `/api/departments/${code}/forms`;
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, description, questions, rolesOnAccept, isWhitelist, notifyRanks: selectedNotifyRanks }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: isEditing ? "Form Updated" : "Form Created" });
      onBack();
    },
    onError: () => {
      toast({ title: "Failed", description: `Could not ${isEditing ? "update" : "create"} form.`, variant: "destructive" });
    },
  });

  if (isEditing && !questionsLoaded) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to Applications
        </Button>
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground" data-testid="button-back-forms">
        <ChevronLeft className="w-4 h-4" /> Back to Applications
      </Button>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Application Form" : "Create Application Form"}</CardTitle>
          <CardDescription>{isEditing ? "Update the form questions and settings." : "Design the questions players will answer when applying."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Form Title</Label>
              <Input placeholder="e.g. Patrol Officer Application" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-form-title" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input placeholder="Brief description of this form" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-form-description" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={isWhitelist} onCheckedChange={(checked) => setIsWhitelist(checked as boolean)} id="is-whitelist" data-testid="checkbox-is-whitelist" />
            <Label htmlFor="is-whitelist" className="text-sm cursor-pointer">Whitelist Application</Label>
            <span className="text-xs text-muted-foreground">(shown to users without portal access as an "Apply Now" form)</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Questions</h3>
              <Button variant="outline" size="sm" onClick={addQuestion} data-testid="button-add-question">
                <Plus className="w-4 h-4 mr-1" /> Add Question
              </Button>
            </div>

            {questions.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-white/10 rounded-lg">
                No questions added yet. Click "Add Question" to start.
              </div>
            )}

            {questions.map((q, idx) => (
              <Card key={idx} className="bg-zinc-800/40 border-white/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-muted-foreground font-mono mt-2">Q{idx + 1}</span>
                    <div className="flex-1 space-y-3">
                      <Input placeholder="Question text" value={q.label} onChange={(e) => updateQuestion(idx, { label: e.target.value })} data-testid={`input-question-${idx}`} />
                      <div className="flex gap-3 items-center">
                        <select value={q.type} onChange={(e) => updateQuestion(idx, { type: e.target.value })} className="bg-zinc-900 border border-white/10 rounded-md px-3 py-1.5 text-sm text-foreground" data-testid={`select-type-${idx}`}>
                          <option value="short_answer">Short Answer</option>
                          <option value="long_answer">Long Answer</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="checkbox">Checkbox / Multiple Choice</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <Checkbox checked={q.isRequired} onCheckedChange={(checked) => updateQuestion(idx, { isRequired: checked as boolean })} id={`req-${idx}`} />
                          <Label htmlFor={`req-${idx}`} className="text-xs">Required</Label>
                        </div>
                      </div>
                      {(q.type === "dropdown" || q.type === "checkbox") && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Options (one per line)</Label>
                          <textarea className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground min-h-[80px]" placeholder={"Option 1\nOption 2\nOption 3"} value={q.options.join("\n")} onChange={(e) => updateQuestion(idx, { options: e.target.value.split("\n") })} data-testid={`textarea-options-${idx}`} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => moveQuestion(idx, "up")} disabled={idx === 0} data-testid={`button-move-up-question-${idx}`}>
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => moveQuestion(idx, "down")} disabled={idx === questions.length - 1} data-testid={`button-move-down-question-${idx}`}>
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 shrink-0" onClick={() => removeQuestion(idx)} data-testid={`button-remove-question-${idx}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Roles to Assign on Accept</h3>
            <CardDescription>Select which Discord roles and website permissions to automatically grant when an application is accepted. These can be tweaked per-application when accepting.</CardDescription>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Discord Roles (from department ranks)</Label>
                {ranksWithDiscordRole.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">No ranks have Discord Role IDs configured. Set them in Leadership Settings.</p>
                ) : (
                  <div className="space-y-1.5">
                    {ranksWithDiscordRole.map((rank) => (
                      <div key={rank.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedDiscordRoles.includes(rank.discordRoleId!)}
                          onCheckedChange={() => toggleDiscordRole(rank.discordRoleId!)}
                          id={`discord-role-${rank.id}`}
                          data-testid={`checkbox-discord-role-${rank.id}`}
                        />
                        <Label htmlFor={`discord-role-${rank.id}`} className="text-sm cursor-pointer">
                          {rank.name}
                          <span className="text-[10px] text-muted-foreground ml-1">({rank.discordRoleId})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Website Portal Access</Label>
                <div className="space-y-1.5">
                  {websiteRoleOptions.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedWebsiteRoles.includes(role)}
                        onCheckedChange={() => toggleWebsiteRole(role)}
                        id={`website-role-${role}`}
                        data-testid={`checkbox-website-role-${role}`}
                      />
                      <Label htmlFor={`website-role-${role}`} className="text-sm capitalize cursor-pointer">{role} Portal Access</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400" />
              <h3 className="font-semibold">Notification Recipients</h3>
            </div>
            <CardDescription>Choose which department ranks get notified when someone submits this form. If none are selected, all server leadership (Directors, Executives, Managers) will be notified.</CardDescription>

            {deptRanks.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">No ranks configured for this department yet. All leadership will be notified by default.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-1.5">
                {deptRanks
                  .sort((a, b) => ((a as any).priority || 0) - ((b as any).priority || 0))
                  .map((rank) => (
                  <div key={rank.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedNotifyRanks.includes(rank.id)}
                      onCheckedChange={() => toggleNotifyRank(rank.id)}
                      id={`notify-rank-${rank.id}`}
                      data-testid={`checkbox-notify-rank-${rank.id}`}
                    />
                    <Label htmlFor={`notify-rank-${rank.id}`} className="text-sm cursor-pointer">
                      {rank.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {selectedNotifyRanks.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Only roster members with the selected rank{selectedNotifyRanks.length > 1 ? "s" : ""} will receive notifications.
              </p>
            )}
            {selectedNotifyRanks.length === 0 && deptRanks.length > 0 && (
              <p className="text-xs text-muted-foreground">
                No ranks selected — all server leadership will be notified.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={!title.trim() || questions.length === 0 || saveMutation.isPending} data-testid="button-save-form">
              {saveMutation.isPending ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Form")}
            </Button>
            <Button variant="outline" onClick={onBack}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FormFiller({ formId, code, user, onBack }: { formId: string; code: string; user: User; onBack: () => void }) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["form", formId],
    queryFn: async () => {
      const res = await fetch(`/api/forms/${formId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ form: AppForm; questions: AppQuestion[] }>;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/departments/${code}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ formId, answers }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Application Submitted", description: "Your application has been sent to the department leadership." });
      onBack();
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not submit application.", variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  const form = data?.form;
  const questions = data?.questions || [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground" data-testid="button-back-apply">
        <ChevronLeft className="w-4 h-4" /> Back to Applications
      </Button>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle>{form?.title}</CardTitle>
          {form?.description && <CardDescription>{form.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((q) => {
            const opts: string[] = q.options ? JSON.parse(q.options) : [];
            return (
              <div key={q.id} className="space-y-2">
                <Label className="flex items-center gap-1">
                  {q.label}
                  {q.isRequired && <span className="text-red-400">*</span>}
                </Label>
                {q.type === "short_answer" && (
                  <Input value={(answers[q.id] as string) || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} data-testid={`answer-${q.id}`} />
                )}
                {q.type === "long_answer" && (
                  <textarea className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground min-h-[100px]" value={(answers[q.id] as string) || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} data-testid={`answer-${q.id}`} />
                )}
                {q.type === "dropdown" && (
                  <select value={(answers[q.id] as string) || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground" data-testid={`answer-${q.id}`}>
                    <option value="">Select an option...</option>
                    {opts.filter(o => o.trim()).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
                {q.type === "checkbox" && (
                  <div className="space-y-2">
                    {opts.filter(o => o.trim()).map((opt) => {
                      const selected = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                      return (
                        <div key={opt} className="flex items-center gap-2">
                          <Checkbox checked={selected.includes(opt)} onCheckedChange={(checked) => {
                            const current = Array.isArray(answers[q.id]) ? [...(answers[q.id] as string[])] : [];
                            if (checked) current.push(opt); else current.splice(current.indexOf(opt), 1);
                            setAnswers({ ...answers, [q.id]: current });
                          }} />
                          <Label className="text-sm">{opt}</Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex gap-2">
            <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} data-testid="button-submit-application">
              {submitMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
            <Button variant="outline" onClick={onBack}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\[attachment:[^\]]*\]\([^)]+\))/g);
  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        const match = part.match(/\[attachment:([^\]]*)\]\(([^)]+)\)/);
        if (match) {
          const [, fileName, filePath] = match;
          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
          if (isImage) {
            return (
              <div key={i} className="mt-1">
                <a href={filePath} target="_blank" rel="noopener noreferrer">
                  <img src={filePath} alt={fileName} className="max-w-xs max-h-48 rounded border border-white/10" />
                </a>
                <span className="text-[10px] text-muted-foreground">{fileName}</span>
              </div>
            );
          }
          return (
            <a key={i} href={filePath} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-xs mt-1 bg-zinc-800/40 rounded px-2 py-1.5 w-fit">
              <Download className="w-3 h-3" />
              {fileName}
            </a>
          );
        }
        return part ? <span key={i}>{part}</span> : null;
      })}
    </div>
  );
}

function SubmissionThread({ submissionId, user, isLeadership, onBack }: { submissionId: string; user: User; isLeadership: boolean; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setAttachmentPath(response.objectPath);
      setAttachmentName(response.metadata.name);
    },
    onError: () => {
      toast({ title: "Failed to upload file", variant: "destructive" });
    },
  });
  const [showAcceptPanel, setShowAcceptPanel] = useState(false);
  const [acceptDiscordRoles, setAcceptDiscordRoles] = useState<string[]>([]);
  const [acceptWebsiteRoles, setAcceptWebsiteRoles] = useState<string[]>([]);
  const [rolesInitialized, setRolesInitialized] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: async () => {
      const res = await fetch(`/api/submissions/${submissionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        submission: AppSubmission;
        form: (AppForm & { rolesOnAccept?: string | null }) | null;
        questions: AppQuestion[];
        messages: AppMessage[];
        submitter: { username: string; avatar: string | null; discordId: string } | null;
      }>;
    },
    refetchInterval: 10000,
  });

  const deptCode = data?.submission?.departmentCode || "";
  const { data: ranksData } = useQuery({
    queryKey: ["ranks-for-accept", deptCode],
    queryFn: async () => {
      if (!deptCode) return [];
      const res = await fetch(`/api/departments/${deptCode}/ranks`, { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return (d.ranks || d) as Array<{ id: string; name: string; discordRoleId: string | null; departmentCode: string }>;
    },
    enabled: !!deptCode && isLeadership,
  });

  const deptRanks = ranksData || [];
  const ranksWithDiscordRole = deptRanks.filter(r => r.discordRoleId);
  const websiteRoleOptions = [deptCode, ...(deptCode === "police" ? ["aos"] : [])];

  useEffect(() => {
    if (data?.form?.rolesOnAccept && !rolesInitialized) {
      try {
        const defaults: RolesOnAccept = JSON.parse(data.form.rolesOnAccept);
        setAcceptDiscordRoles(defaults.discordRoleIds || []);
        setAcceptWebsiteRoles(defaults.websiteRoles || []);
      } catch { /* ignore */ }
      setRolesInitialized(true);
    }
  }, [data?.form?.rolesOnAccept, rolesInitialized]);

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      let content = newMessage;
      if (attachmentPath) {
        const attachLine = `[attachment:${attachmentName || "file"}](${attachmentPath})`;
        content = content ? `${content}\n${attachLine}` : attachLine;
      }
      const res = await fetch(`/api/submissions/${submissionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      setAttachmentPath(null);
      setAttachmentName(null);
      if (attachFileRef.current) attachFileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["submission", submissionId] });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not send message.", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, rolesToAssign }: { status: string; rolesToAssign?: { discordRoleIds: string[]; websiteRoles: string[] } }) => {
      const res = await fetch(`/api/submissions/${submissionId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, rolesToAssign }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data: { roleAssignment?: { discordRoles: string[]; websiteRoles: string[]; errors: string[] } }) => {
      const ra = data?.roleAssignment;
      if (ra && (ra.discordRoles.length > 0 || ra.websiteRoles.length > 0)) {
        const parts: string[] = [];
        if (ra.discordRoles.length > 0) parts.push(`${ra.discordRoles.length} Discord role(s)`);
        if (ra.websiteRoles.length > 0) parts.push(`${ra.websiteRoles.length} website role(s)`);
        toast({ title: "Application Accepted", description: `Assigned ${parts.join(" and ")}.${ra.errors.length > 0 ? ` ${ra.errors.length} role(s) failed.` : ""}` });
      } else {
        toast({ title: "Status Updated" });
      }
      setShowAcceptPanel(false);
      queryClient.invalidateQueries({ queryKey: ["submission", submissionId] });
    },
  });

  const handleAcceptWithRoles = () => {
    statusMutation.mutate({
      status: "accepted",
      rolesToAssign: { discordRoleIds: acceptDiscordRoles, websiteRoles: acceptWebsiteRoles },
    });
  };

  if (isLoading) return <Skeleton className="h-48" />;

  const submission = data?.submission;
  const form = data?.form;
  const questions = data?.questions || [];
  const messages = data?.messages || [];
  const submitter = data?.submitter;
  const parsedAnswers: Record<string, string | string[]> = submission?.answers ? JSON.parse(submission.answers) : {};

  const statusColor = submission?.status === "accepted" ? "text-green-400 border-green-500/50" : submission?.status === "denied" ? "text-red-400 border-red-500/50" : submission?.status === "under_review" ? "text-yellow-400 border-yellow-500/50" : "border-white/20";

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground" data-testid="button-back-submission">
        <ChevronLeft className="w-4 h-4" /> Back to Applications
      </Button>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {submitter && (
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                  <img src={submitter.avatar ? `https://cdn.discordapp.com/avatars/${submitter.discordId}/${submitter.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(submitter.discordId) % 5}.png`} alt={submitter.displayName || submitter.username} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <CardTitle>{form?.title || "Application"}</CardTitle>
                <CardDescription>by {submitter?.displayName || submitter?.username || "Unknown"} • {submission ? new Date(submission.createdAt).toLocaleDateString() : ""}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`capitalize ${statusColor}`}>{submission?.status?.replace("_", " ")}</Badge>
              {isLeadership && (
                <div className="flex gap-1">
                  {submission?.status !== "accepted" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => { setShowAcceptPanel(!showAcceptPanel); if (!rolesInitialized && form?.rolesOnAccept) { try { const d: RolesOnAccept = JSON.parse(form.rolesOnAccept); setAcceptDiscordRoles(d.discordRoleIds || []); setAcceptWebsiteRoles(d.websiteRoles || []); } catch {} setRolesInitialized(true); } }} data-testid="button-accept">Accept</Button>
                  )}
                  {submission?.status !== "denied" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => statusMutation.mutate({ status: "denied" })} data-testid="button-deny">Deny</Button>
                  )}
                  {submission?.status !== "under_review" && submission?.status === "pending" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" onClick={() => statusMutation.mutate({ status: "under_review" })} data-testid="button-review">Under Review</Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {showAcceptPanel && isLeadership && (
          <div className="mx-6 mb-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20 space-y-4" data-testid="accept-roles-panel">
            <h4 className="font-semibold text-green-400 text-sm">Roles to Assign on Accept</h4>
            <p className="text-xs text-muted-foreground">Select which roles to give to <span className="font-medium text-foreground">{submitter?.displayName || submitter?.username}</span>. Defaults are pre-filled from the form configuration.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Discord Roles</Label>
                {ranksWithDiscordRole.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">No ranks with Discord Role IDs found.</p>
                ) : (
                  <div className="space-y-1.5">
                    {ranksWithDiscordRole.map((rank) => (
                      <div key={rank.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={acceptDiscordRoles.includes(rank.discordRoleId!)}
                          onCheckedChange={(checked) => {
                            if (checked) setAcceptDiscordRoles(prev => [...prev, rank.discordRoleId!]);
                            else setAcceptDiscordRoles(prev => prev.filter(r => r !== rank.discordRoleId!));
                          }}
                          id={`accept-discord-${rank.id}`}
                          data-testid={`accept-discord-role-${rank.id}`}
                        />
                        <Label htmlFor={`accept-discord-${rank.id}`} className="text-sm cursor-pointer">
                          {rank.name}
                          <span className="text-[10px] text-muted-foreground ml-1">({rank.discordRoleId})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Website Portal Access</Label>
                <div className="space-y-1.5">
                  {websiteRoleOptions.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      <Checkbox
                        checked={acceptWebsiteRoles.includes(role)}
                        onCheckedChange={(checked) => {
                          if (checked) setAcceptWebsiteRoles(prev => [...prev, role]);
                          else setAcceptWebsiteRoles(prev => prev.filter(r => r !== role));
                        }}
                        id={`accept-website-${role}`}
                        data-testid={`accept-website-role-${role}`}
                      />
                      <Label htmlFor={`accept-website-${role}`} className="text-sm capitalize cursor-pointer">{role} Portal Access</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAcceptWithRoles} disabled={statusMutation.isPending} data-testid="button-confirm-accept">
                {statusMutation.isPending ? "Accepting..." : "Confirm Accept & Assign Roles"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAcceptPanel(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <CardContent className="space-y-4">
          {questions.map((q) => {
            const answer = parsedAnswers[q.id];
            return (
              <div key={q.id} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{q.label}</p>
                <p className="text-sm">{Array.isArray(answer) ? answer.join(", ") : answer || <span className="text-muted-foreground italic">No answer</span>}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle className="text-base">Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start a conversation below.</p>
          )}
          {messages.map((msg) => {
            const isMe = msg.userId === user.id;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`} data-testid={`message-${msg.id}`}>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                  <img src={msg.avatar ? `https://cdn.discordapp.com/avatars/${msg.discordId}/${msg.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(msg.discordId) % 5}.png`} alt={msg.displayName || msg.username} className="w-full h-full object-cover" />
                </div>
                <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? "justify-end" : ""}`}>
                    <span className="text-xs font-medium">{msg.displayName || msg.username}</span>
                    {msg.staffTier && <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">{msg.staffTier}</Badge>}
                    <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-sm ${isMe ? "bg-primary/20 text-foreground" : "bg-zinc-800/60"}`}>
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-white/5 space-y-2">
            {attachmentPath && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-zinc-800/60 rounded px-3 py-1.5">
                <Paperclip className="w-3 h-3" />
                <span className="truncate flex-1">{attachmentName}</span>
                <button onClick={() => { setAttachmentPath(null); setAttachmentName(null); if (attachFileRef.current) attachFileRef.current.value = ""; }} className="hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={attachFileRef} type="file" className="hidden" onChange={handleAttachFile} data-testid="input-attach-file" />
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => attachFileRef.current?.click()} disabled={isUploading} data-testid="button-attach-file">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </Button>
              <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (newMessage.trim() || attachmentPath)) sendMessageMutation.mutate(); }} className="flex-1" data-testid="input-message" />
              <Button onClick={() => sendMessageMutation.mutate()} disabled={(!newMessage.trim() && !attachmentPath) || sendMessageMutation.isPending || isUploading} data-testid="button-send-message">
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RankRow({ rank, deptColor, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: { 
  rank: Rank; deptColor: string; 
  onUpdate: (data: Record<string, unknown>) => void; 
  onDelete: () => void; 
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
      <Card className="bg-zinc-900/50 border-white/10">
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Rank Name</Label>
              <Input
                placeholder="Rank Name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="h-8 text-sm"
                data-testid={`input-edit-rank-name-${rank.id}`}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Abbreviation</Label>
              <Input
                placeholder="ABBR"
                value={editData.abbreviation}
                onChange={(e) => setEditData({ ...editData, abbreviation: e.target.value })}
                className="h-8 text-sm"
                data-testid={`input-edit-rank-abbrev-${rank.id}`}
              />
            </div>
            <div>
              <Label className="text-xs">Callsign Prefix</Label>
              <Input
                placeholder="1-"
                value={editData.callsignPrefix}
                onChange={(e) => setEditData({ ...editData, callsignPrefix: e.target.value })}
                className="h-8 text-sm"
                data-testid={`input-edit-rank-prefix-${rank.id}`}
              />
            </div>
            <div>
              <Label className="text-xs">Discord Role ID</Label>
              <Input
                placeholder="123456789012345678"
                value={editData.discordRoleId}
                onChange={(e) => setEditData({ ...editData, discordRoleId: e.target.value })}
                className="h-8 text-sm"
                data-testid={`input-rank-discord-id-${rank.id}`}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Checkbox
                checked={editData.isLeadership}
                onCheckedChange={(checked) => setEditData({ ...editData, isLeadership: checked as boolean })}
                id={`edit-leadership-${rank.id}`}
              />
              <Label htmlFor={`edit-leadership-${rank.id}`} className="text-xs">Command/Leadership Position</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8"
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
              data-testid={`button-save-rank-${rank.id}`}
            >
              <Check className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
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
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
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
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onMoveUp} disabled={isFirst} data-testid={`button-move-up-rank-${rank.id}`}>
          <ArrowUp className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onMoveDown} disabled={isLast} data-testid={`button-move-down-rank-${rank.id}`}>
          <ArrowDown className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setEditing(true)}
          data-testid={`button-edit-rank-${rank.id}`}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-400 hover:text-red-300"
          onClick={onDelete}
          data-testid={`button-delete-rank-${rank.id}`}
        >
          <Trash2 className="w-4 h-4" />
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

  const [editingAccessRole, setEditingAccessRole] = useState(false);
  const [accessRoleId, setAccessRoleId] = useState("");

  const isAos = code === "aos";

  const { data: ranksData, isLoading } = useQuery({
    queryKey: ["departmentRanks", code],
    queryFn: async () => {
      const res = await fetch(`/api/departments/${code}/ranks`);
      if (!res.ok) throw new Error("Failed to fetch ranks");
      return res.json() as Promise<{ ranks: Rank[] }>;
    },
  });

  const { data: accessRoleData } = useQuery({
    queryKey: ["departmentAccessRole", code],
    queryFn: async () => {
      const res = await fetch(`/api/settings/${code}_access_discord_role_id`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.value || null;
    },
  });

  useEffect(() => {
    if (accessRoleData) {
      setAccessRoleId(accessRoleData);
    }
  }, [accessRoleData]);

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

  const deleteRankMutation = useMutation({
    mutationFn: async (rankId: string) => {
      const res = await fetch(`/api/departments/${code}/ranks/${rankId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete rank");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rank Deleted", description: "The rank has been removed." });
      queryClient.invalidateQueries({ queryKey: ["departmentRanks", code] });
      queryClient.invalidateQueries({ queryKey: ["roster", code] });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot Delete", description: error.message, variant: "destructive" });
    },
  });

  const reorderRankMutation = useMutation({
    mutationFn: async ({ rankId, direction }: { rankId: string; direction: "up" | "down" }) => {
      const sortedRanks = [...(ranksData?.ranks || [])].sort((a, b) => a.priority - b.priority);
      const currentIndex = sortedRanks.findIndex(r => r.id === rankId);
      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= sortedRanks.length) return;

      const currentPriority = sortedRanks[currentIndex].priority;
      const swapPriority = sortedRanks[swapIndex].priority;

      await fetch(`/api/departments/${code}/ranks/${sortedRanks[currentIndex].id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ priority: swapPriority }),
      });
      await fetch(`/api/departments/${code}/ranks/${sortedRanks[swapIndex].id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ priority: currentPriority }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departmentRanks", code] });
    },
  });

  const updateAccessRoleMutation = useMutation({
    mutationFn: async (newRoleId: string) => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: `${code}_access_discord_role_id`, value: newRoleId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Portal Access Role Updated" });
      setEditingAccessRole(false);
      queryClient.invalidateQueries({ queryKey: ["departmentAccessRole", code] });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const ranks = ranksData?.ranks || [];

  return (
    <div className="space-y-8">
      <Card className="bg-zinc-900/40 border-white/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: deptColor }}>General Portal Access Role</h3>
              <p className="text-xs text-muted-foreground">The Discord Role ID that grants users access to this department's website portal</p>
            </div>
            <div className="flex items-center gap-2">
              {editingAccessRole ? (
                <>
                  <Input
                    placeholder="Discord Role ID"
                    value={accessRoleId}
                    onChange={(e) => setAccessRoleId(e.target.value)}
                    className="h-8 text-sm w-56"
                    data-testid="input-access-role-id"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => updateAccessRoleMutation.mutate(accessRoleId)}
                    disabled={updateAccessRoleMutation.isPending}
                    data-testid="button-save-access-role"
                  >
                    <Check className="w-3 h-3 mr-1" /> Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => { setEditingAccessRole(false); setAccessRoleId(accessRoleData || ""); }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-mono">
                    {accessRoleData ? (
                      <span className="text-green-400">{accessRoleData}</span>
                    ) : (
                      <span className="text-muted-foreground">Not configured</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingAccessRole(true)}
                    data-testid="button-edit-access-role"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div className="w-20"></div>
        </div>
        
        {ranks.map((rank, idx) => (
          <RankRow key={rank.id} rank={rank} deptColor={deptColor} 
            onUpdate={(data) => updateRankMutation.mutate({ rankId: rank.id, data })} 
            onDelete={() => deleteRankMutation.mutate(rank.id)}
            onMoveUp={() => reorderRankMutation.mutate({ rankId: rank.id, direction: "up" })}
            onMoveDown={() => reorderRankMutation.mutate({ rankId: rank.id, direction: "down" })}
            isFirst={idx === 0}
            isLast={idx === ranks.length - 1}
          />
        ))}
        
        {ranks.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No ranks configured. Add your first rank above.</p>
          </div>
        )}
      </div>

      {isAos && <AosSquadManagement deptColor={deptColor} />}
    </div>
  );
}

function AosSquadManagement({ deptColor }: { deptColor: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: squadsData, isLoading } = useQuery({
    queryKey: ["aosSquads"],
    queryFn: fetchAosSquads,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const squads = squadsData?.squads || [];
      const res = await fetch("/api/aos/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, priority: squads.length }),
      });
      if (!res.ok) throw new Error("Failed to create squad");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Squad Created" });
      queryClient.invalidateQueries({ queryKey: ["aosSquads"] });
      setIsAdding(false);
      setNewSquadName("");
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not create squad.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/aos/squads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update squad");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Squad Updated" });
      queryClient.invalidateQueries({ queryKey: ["aosSquads"] });
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not update squad.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/aos/squads/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete squad");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Squad Deleted" });
      queryClient.invalidateQueries({ queryKey: ["aosSquads"] });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not delete squad.", variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  const squads = squadsData?.squads || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: deptColor }}>Squad Management</h2>
          <p className="text-muted-foreground">Create and manage AOS squads. Members can be assigned to squads on the roster.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding} data-testid="button-add-squad">
          <Plus className="w-4 h-4 mr-2" /> Add Squad
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Squad name (e.g. Alpha Squad)"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                className="flex-1"
                data-testid="input-squad-name"
                autoFocus
              />
              <Button
                onClick={() => createMutation.mutate(newSquadName)}
                disabled={!newSquadName.trim() || createMutation.isPending}
                data-testid="button-save-squad"
              >
                <Check className="w-4 h-4 mr-1" /> Create
              </Button>
              <Button variant="outline" onClick={() => { setIsAdding(false); setNewSquadName(""); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {squads.map((squad) => (
          <div key={squad.id} className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors" data-testid={`squad-row-${squad.id}`}>
            <Layers className="w-5 h-5" style={{ color: deptColor }} />
            {editingId === squad.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 h-8"
                  data-testid={`input-edit-squad-${squad.id}`}
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => updateMutation.mutate({ id: squad.id, name: editName })}
                  disabled={!editName.trim()}
                  data-testid={`button-save-edit-squad-${squad.id}`}
                >
                  <Check className="w-3 h-3 mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium">{squad.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setEditingId(squad.id); setEditName(squad.name); }}
                  data-testid={`button-edit-squad-${squad.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                  onClick={() => deleteMutation.mutate(squad.id)}
                  data-testid={`button-delete-squad-${squad.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        ))}

        {squads.length === 0 && !isAdding && (
          <div className="text-center py-8">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No squads created yet.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Create squads to organize your AOS roster by operational teams.
            </p>
          </div>
        )}
      </div>

      {squads.length > 0 && <AosSquadAssignments squads={squads} deptColor={deptColor} />}
    </div>
  );
}

function AosSquadAssignments({ squads, deptColor }: { squads: AosSquad[]; deptColor: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rosterData, isLoading } = useQuery({
    queryKey: ["roster", "aos"],
    queryFn: () => fetchRoster("aos"),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ memberId, squadId }: { memberId: string; squadId: string | null }) => {
      const res = await fetch(`/api/departments/aos/roster/${memberId}/squad`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ squadId }),
      });
      if (!res.ok) throw new Error("Failed to assign squad");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Squad Assignment Updated" });
      queryClient.invalidateQueries({ queryKey: ["roster", "aos"] });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not update squad assignment.", variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  const roster = rosterData?.roster || [];
  const allRanks = rosterData?.ranks || [];
  const leadershipRankIds = new Set(allRanks.filter(r => r.isLeadership).map(r => r.id));
  const nonLeadershipRoster = roster.filter(m => !leadershipRankIds.has(m.rankId));

  if (nonLeadershipRoster.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold" style={{ color: deptColor }}>Squad Assignments</h3>
        <p className="text-muted-foreground text-sm">Assign non-leadership roster members to squads</p>
      </div>

      <div className="rounded-lg border border-white/5 overflow-hidden">
        <div className="grid items-center gap-2 px-4 py-2 bg-zinc-900/60 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          style={{ gridTemplateColumns: "1fr 10rem 12rem" }}
        >
          <div>Member</div>
          <div className="text-center">Rank</div>
          <div className="text-center">Squad</div>
        </div>

        {nonLeadershipRoster.map((member) => {
          const rank = allRanks.find(r => r.id === member.rankId);
          if (!member.user) return null;
          return (
            <div key={member.id}
              className="grid items-center gap-2 px-4 py-2 border-b border-white/5 last:border-0 hover:bg-zinc-900/40 transition-colors"
              style={{ gridTemplateColumns: "1fr 10rem 12rem" }}
              data-testid={`squad-assign-row-${member.id}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                  <img src={getAvatarUrl(member.user)} alt={member.user.displayName || member.user.username} className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-medium truncate">{member.user.displayName || member.user.username}</span>
              </div>
              <div className="text-center">
                <span className="text-xs font-medium" style={{ color: deptColor }}>{rank?.name || "Unknown"}</span>
              </div>
              <div className="text-center">
                <select
                  value={member.squadId || ""}
                  onChange={(e) => assignMutation.mutate({ memberId: member.id, squadId: e.target.value || null })}
                  className="bg-zinc-800 border border-white/10 rounded-md px-2 py-1 text-xs w-full text-foreground"
                  data-testid={`select-squad-${member.id}`}
                >
                  <option value="">Unassigned</option>
                  {squads.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
