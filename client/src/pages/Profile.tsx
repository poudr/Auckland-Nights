import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { Shield, Flame, HeartPulse, Target, Truck, Users, FileText, Clock, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { useUser, getAvatarUrl } from "@/lib/auth";

const DEPT_ICONS: Record<string, React.ReactNode> = {
  Shield: <Shield className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  HeartPulse: <HeartPulse className="w-5 h-5" />,
  Target: <Target className="w-5 h-5" />,
  Truck: <Truck className="w-5 h-5" />,
};

interface ProfileData {
  user: {
    id: string;
    discordId: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isStaff: boolean | null;
    staffTier: string | null;
    staffTiers: string[] | null;
    createdAt: string | null;
  };
  memberships: Array<{
    department: { code: string; name: string; color: string; icon: string | null };
    rank: { name: string; abbreviation: string | null; isLeadership: boolean; priority: number } | null;
    callsign: string | null;
    qid: string | null;
  }>;
  openApplications: Array<{
    id: string;
    status: string;
    formTitle: string;
    departmentName: string | null;
    departmentCode: string | null;
    createdAt: string;
  }>;
}

const TIER_LABELS: Record<string, string> = {
  director: "Director",
  executive: "Executive",
  manager: "Manager",
  administrator: "Administrator",
  moderator: "Moderator",
  support: "Support",
  development: "Development",
};

export default function Profile() {
  const [, params] = useRoute("/profile/:discordId");
  const discordId = params?.discordId;
  const { data: currentUser } = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile", discordId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${discordId}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) throw new Error("not_found");
        throw new Error("Failed to fetch profile");
      }
      return res.json() as Promise<ProfileData>;
    },
    enabled: !!discordId,
  });

  if (!discordId) return null;

  const profileUser = data?.user;
  const memberships = data?.memberships || [];
  const openApplications = data?.openApplications || [];
  const isStaffViewer = currentUser?.staffTier && ["director", "executive", "manager", "administrator"].includes(currentUser.staffTier);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="pt-28 pb-6 px-6 relative">
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="flex items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                <h2 className="text-2xl font-bold mb-2" data-testid="text-profile-not-found">Player Not Found</h2>
                <p className="text-muted-foreground">This player hasn't logged in to the website yet.</p>
              </div>
            ) : profileUser ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center sm:items-start gap-6"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 ring-4 ring-primary/20 shrink-0">
                  <img
                    src={getAvatarUrl({ discordId: profileUser.discordId, avatar: profileUser.avatar })}
                    alt={profileUser.displayName || profileUser.username}
                    className="w-full h-full object-cover"
                    data-testid="img-profile-avatar"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-3xl font-black font-display" data-testid="text-profile-displayname">
                    {profileUser.displayName || profileUser.username}
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1" data-testid="text-profile-username">
                    @{profileUser.username}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                    {profileUser.staffTiers && profileUser.staffTiers.length > 0 ? (
                      profileUser.staffTiers.map(tier => (
                        <Badge key={tier} className="bg-primary/10 text-primary border-primary/20" data-testid={`badge-tier-${tier}`}>
                          {TIER_LABELS[tier] || tier}
                        </Badge>
                      ))
                    ) : null}
                    {profileUser.createdAt && (
                      <Badge variant="outline" className="text-muted-foreground border-white/10">
                        <Clock className="w-3 h-3 mr-1" />
                        Joined {new Date(profileUser.createdAt).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>

      {profileUser && (
        <div className="px-6 pb-16">
          <div className="max-w-4xl mx-auto space-y-8 mt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2" data-testid="text-departments-heading">
                <Shield className="w-5 h-5 text-primary" />
                Departments & Ranks
              </h2>

              {memberships.length === 0 ? (
                <Card className="bg-zinc-900/30 border-white/5">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    This player is not currently in any departments.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {memberships.map((m, idx) => (
                    <motion.div
                      key={m.department.code}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + idx * 0.05 }}
                    >
                      <Link href={`/departments/${m.department.code}`}>
                        <Card
                          className="bg-zinc-900/40 border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                          data-testid={`card-department-${m.department.code}`}
                        >
                          <CardContent className="flex items-center gap-4 py-5 px-5">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${m.department.color}15`, color: m.department.color }}
                            >
                              {m.department.icon && DEPT_ICONS[m.department.icon] ? DEPT_ICONS[m.department.icon] : <Shield className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm">{m.department.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium" style={{ color: m.department.color }}>
                                  {m.rank?.name || "Member"}
                                </span>
                                {m.rank?.isLeadership && (
                                  <Badge className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20 py-0 px-1.5">
                                    Leadership
                                  </Badge>
                                )}
                              </div>
                              {(m.callsign || m.qid) && (
                                <div className="flex gap-3 mt-1">
                                  {m.callsign && <span className="text-xs text-muted-foreground">Callsign: <span className="font-mono font-medium text-foreground">{m.callsign}</span></span>}
                                  {m.qid && <span className="text-xs text-muted-foreground">QID: <span className="font-mono font-medium text-foreground">{m.qid}</span></span>}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {isStaffViewer && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2" data-testid="text-applications-heading">
                  <FileText className="w-5 h-5 text-primary" />
                  Open Applications
                  {openApplications.length > 0 && (
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 ml-1">
                      {openApplications.length}
                    </Badge>
                  )}
                </h2>

                {openApplications.length === 0 ? (
                  <Card className="bg-zinc-900/30 border-white/5">
                    <CardContent className="py-6 text-center text-muted-foreground text-sm">
                      No open applications.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {openApplications.map((app) => (
                      <Link
                        key={app.id}
                        href={app.departmentCode ? `/departments/${app.departmentCode}/applications` : `/support?submission=${app.id}`}
                      >
                        <Card
                          className="bg-zinc-900/40 border-white/5 hover:bg-zinc-800/50 transition-all cursor-pointer"
                          data-testid={`card-application-${app.id}`}
                        >
                          <CardContent className="flex items-center gap-4 py-3 px-5">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{app.formTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                {app.departmentName || "Support"} &middot; {new Date(app.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className={`text-xs shrink-0 ${
                              app.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-blue-500/20 text-blue-400"
                            }`}>
                              {app.status === "under_review" ? "Under Review" : app.status}
                            </Badge>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
