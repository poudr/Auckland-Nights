import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { getAvatarUrl } from "@/lib/auth";

interface TeamMember {
  id: string;
  username: string;
  avatar: string | null;
  discordId: string;
  staffTier: string;
  staffTiers: string[];
}

interface TeamData {
  team: Record<string, TeamMember[]>;
  hierarchy: string[];
}

const TIER_CONFIG: Record<string, { label: string; hex: string }> = {
  director: { label: "Directors", hex: "#ffde90" },
  executive: { label: "Executives", hex: "#e19fff" },
  manager: { label: "Managers", hex: "#ff4848" },
  administrator: { label: "Administrators", hex: "#3498db" },
  moderator: { label: "Moderators", hex: "#e06f0b" },
  support: { label: "Support Team", hex: "#02db3c" },
  development: { label: "Development Team", hex: "#1abc9c" },
};

function getTierBadgeLabel(tier: string): string {
  const labels: Record<string, string> = {
    director: "Director",
    executive: "Executive",
    manager: "Manager",
    administrator: "Administrator",
    moderator: "Moderator",
    support: "Support",
    development: "Development",
  };
  return labels[tier] || tier;
}

async function fetchTeam(): Promise<TeamData> {
  const res = await fetch("/api/team");
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

export default function Team() {
  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black gta-text-shadow mb-4"
            >
              MEET THE <span className="text-primary">TEAM</span>
            </motion.h1>
            <p className="text-muted-foreground text-lg">The dedicated staff keeping Tamaki Makaurau running.</p>
          </header>

          {isLoading ? (
            <div className="space-y-12">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <Skeleton className="h-6 w-32 mb-6" />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2].map((j) => (
                      <Skeleton key={j} className="h-32 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : data ? (
            <div className="space-y-12">
              {data.hierarchy.map((tier, tierIdx) => {
                const members = data.team[tier] || [];
                if (members.length === 0) return null;
                
                const config = TIER_CONFIG[tier] || { label: tier, hex: "#9ca3af" };
                
                return (
                  <motion.section 
                    key={tier}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: tierIdx * 0.1 }}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <h2 className="text-lg font-bold uppercase tracking-widest" style={{ color: config.hex }}>
                        {config.label}
                      </h2>
                      <div className="h-px bg-white/5 flex-1" />
                      <Badge variant="outline" style={{ color: config.hex, borderColor: `${config.hex}4d` }}>
                        {members.length} {members.length === 1 ? "Member" : "Members"}
                      </Badge>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {members.map((member, idx) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (tierIdx * 0.1) + (idx * 0.05) }}
                        >
                          <Card className="bg-zinc-900/40 border-white/5 hover:border-primary/30 transition-all group overflow-hidden">
                            <CardContent className="p-6 text-center">
                              <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden bg-zinc-800 ring-2 ring-white/10 group-hover:ring-primary/50 transition-all">
                                <img 
                                  src={getAvatarUrl(member)} 
                                  alt={member.displayName || member.username}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <h3 className="font-bold text-lg mb-1">{member.displayName || member.username}</h3>
                              <div className="flex flex-wrap justify-center gap-1">
                                {(member.staffTiers && member.staffTiers.length > 0 ? member.staffTiers : [member.staffTier]).map((t) => {
                                  const tierConf = TIER_CONFIG[t] || { label: t, hex: "#9ca3af" };
                                  return (
                                    <Badge key={t} variant="secondary" className="bg-transparent text-xs" style={{ color: tierConf.hex, borderColor: `${tierConf.hex}4d` }}>
                                      {getTierBadgeLabel(t)}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </motion.section>
                );
              })}
              
              {Object.values(data.team).every(arr => arr.length === 0) && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No staff members configured yet.</p>
                  <p className="text-muted-foreground/60 text-sm mt-2">Staff will appear here once role mappings are set up in the admin panel.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
