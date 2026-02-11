import { useState, useEffect } from "react";
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
import { Shield, Flame, HeartPulse, Target, Users, FileText, ClipboardList, ChevronLeft, Lock, Settings, Plus, Trash2, GripVertical, Edit, Check, BookOpen, ChevronRight, X, Layers } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUser, getAvatarUrl, type User } from "@/lib/auth";
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
  user: { id: string; username: string; avatar: string | null; discordId: string } | null;
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
  
  const hasLeadershipAccess = accessData?.isLeadership || user?.staffTier === "director" || user?.staffTier === "executive" || false;
  
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
  const isPolice = code === "police";
  const isAos = code === "aos";
  const squads = squadsData?.squads || [];

  if (isAos && squads.length > 0) {
    return <AosSquadRoster roster={roster} allRanks={allRanks} squads={squads} deptColor={deptColor} />;
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
  const unassigned = roster.filter(m => !m.squadId || !squads.find(s => s.id === m.squadId));
  
  return (
    <div className="space-y-6" data-testid="roster-tab">
      {squads.map((squad) => {
        const squadMembers = roster.filter(m => m.squadId === squad.id);
        const rankGroups = allRanks
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

            <div className="grid items-center gap-2 px-4 py-2 bg-zinc-900/60 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ gridTemplateColumns: "2.5rem 1fr 10rem" }}
            >
              <div>#</div>
              <div>Member</div>
              <div className="text-center">Rank</div>
            </div>

            {rankGroups.length > 0 ? rankGroups.map(({ rank, members }) => (
              <div key={rank.id}>
                <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-800/30 border-b border-white/5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: rank.isLeadership ? deptColor : undefined }}>
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

          <div className="grid items-center gap-2 px-4 py-2 bg-zinc-900/60 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            style={{ gridTemplateColumns: "2.5rem 1fr 10rem" }}
          >
            <div>#</div>
            <div>Member</div>
            <div className="text-center">Rank</div>
          </div>

          {allRanks
            .map(rank => ({
              rank,
              members: unassigned.filter(m => m.rankId === rank.id),
            }))
            .filter(g => g.members.length > 0)
            .map(({ rank, members }) => (
              <div key={rank.id}>
                <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-800/30 border-b border-white/5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: rank.isLeadership ? deptColor : undefined }}>
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

function RosterTableRow({ member, deptColor, index, isPolice }: { member: RosterMember; deptColor: string; index: number; isPolice: boolean }) {
  if (!member.user) return null;

  return (
    <div
      className="grid items-center gap-2 px-4 py-2 border-b border-white/5 last:border-0 hover:bg-zinc-900/40 transition-colors"
      style={{ gridTemplateColumns: isPolice ? "2.5rem 1fr 10rem 6rem" : "2.5rem 1fr 10rem" }}
      data-testid={`roster-row-${member.user.discordId}`}
    >
      <div className="text-xs text-muted-foreground font-mono">{index}</div>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0">
          <img
            src={getAvatarUrl(member.user)}
            alt={member.user.username}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="font-medium text-sm truncate">{member.user.username}</span>
      </div>
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

  const isAos = code === "aos";

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

  if (roster.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold" style={{ color: deptColor }}>Squad Assignments</h3>
        <p className="text-muted-foreground text-sm">Assign roster members to squads</p>
      </div>

      <div className="rounded-lg border border-white/5 overflow-hidden">
        <div className="grid items-center gap-2 px-4 py-2 bg-zinc-900/60 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          style={{ gridTemplateColumns: "1fr 10rem 12rem" }}
        >
          <div>Member</div>
          <div className="text-center">Rank</div>
          <div className="text-center">Squad</div>
        </div>

        {roster.map((member) => {
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
                  <img src={getAvatarUrl(member.user)} alt={member.user.username} className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-medium truncate">{member.user.username}</span>
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
