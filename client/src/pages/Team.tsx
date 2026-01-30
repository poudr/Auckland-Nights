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
}

interface TeamData {
  team: Record<string, TeamMember[]>;
  hierarchy: string[];
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  director: { label: "Directors", color: "text-red-500 border-red-500/30" },
  executive: { label: "Executives", color: "text-orange-500 border-orange-500/30" },
  manager: { label: "Managers", color: "text-amber-500 border-amber-500/30" },
  administrator: { label: "Administrators", color: "text-yellow-500 border-yellow-500/30" },
  moderator: { label: "Moderators", color: "text-blue-500 border-blue-500/30" },
  support: { label: "Support Team", color: "text-green-500 border-green-500/30" },
  development: { label: "Development Team", color: "text-purple-500 border-purple-500/30" },
};

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
                
                const config = TIER_CONFIG[tier] || { label: tier, color: "text-gray-500 border-gray-500/30" };
                
                return (
                  <motion.section 
                    key={tier}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: tierIdx * 0.1 }}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <h2 className={`text-lg font-bold uppercase tracking-widest ${config.color.split(' ')[0]}`}>
                        {config.label}
                      </h2>
                      <div className="h-px bg-white/5 flex-1" />
                      <Badge variant="outline" className={config.color}>
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
                                  alt={member.username}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <h3 className="font-bold text-lg mb-1">{member.username}</h3>
                              <Badge variant="secondary" className={`${config.color} bg-transparent text-xs`}>
                                {config.label.replace("s", "").replace(" Team", "")}
                              </Badge>
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
