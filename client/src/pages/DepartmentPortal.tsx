import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Flame, HeartPulse, Target, Users, FileText, ClipboardList, ChevronLeft, Lock } from "lucide-react";
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

async function checkAccess(code: string): Promise<boolean> {
  const res = await fetch(`/api/user/check-access/${code}`, { credentials: "include" });
  if (!res.ok) return false;
  const data = await res.json();
  return data.hasAccess;
}

export default function DepartmentPortal() {
  const [, params] = useRoute("/departments/:code/:tab?");
  const code = params?.code || "";
  const activeTab = params?.tab || "roster";
  
  const { data: user, isLoading: userLoading } = useUser();
  
  const { data: accessData, isLoading: accessLoading } = useQuery({
    queryKey: ["departmentAccess", code],
    queryFn: () => checkAccess(code),
    enabled: !!user && !!code,
  });
  
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

  if (accessData === false) {
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
  const ranks = data?.ranks || [];

  // Group by leadership vs non-leadership
  const leadership = roster.filter(m => m.rank?.isLeadership);
  const personnel = roster.filter(m => !m.rank?.isLeadership);

  return (
    <div className="space-y-8">
      {leadership.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4 uppercase tracking-widest" style={{ color: deptColor }}>
            Command Staff
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leadership.map((member) => (
              <RosterCard key={member.id} member={member} deptColor={deptColor} isLeadership />
            ))}
          </div>
        </section>
      )}

      {personnel.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4 uppercase tracking-widest text-muted-foreground">
            Personnel
          </h2>
          <div className="space-y-2">
            {personnel.map((member) => (
              <RosterRow key={member.id} member={member} deptColor={deptColor} />
            ))}
          </div>
        </section>
      )}

      {roster.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No roster members yet.</p>
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
