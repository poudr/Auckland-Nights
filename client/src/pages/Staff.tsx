import { motion } from "framer-motion";
import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";

interface StaffMember {
  user: {
    id: string;
    username: string;
    discriminator: string | null;
    avatar: string | null;
  };
  role: {
    name: string;
    tier: string;
  };
}

interface StaffData {
  staff: {
    management: StaffMember[];
    administrators: StaffMember[];
    moderators: StaffMember[];
  };
}

async function fetchStaff(): Promise<StaffData> {
  const res = await fetch("/api/staff");
  if (!res.ok) throw new Error("Failed to fetch staff");
  return res.json();
}

export default function Staff() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["staff"],
    queryFn: fetchStaff,
  });

  // Fallback mock data for when no staff are configured
  const fallbackHierarchy = [
    {
      rank: "Management",
      color: "border-red-500 text-red-500",
      members: [
        { name: "Auckland_Owner", discord: "Owner#0001", role: "Server Director" },
        { name: "TM_Admin", discord: "Admin#0001", role: "Operations Lead" }
      ]
    },
    {
      rank: "Administrators",
      color: "border-orange-500 text-orange-500",
      members: [
        { name: "Kiwiracer", discord: "Kiwi#1234", role: "Lead Admin" },
        { name: "SkyTower_Dev", discord: "Dev#9999", role: "Technical Admin" }
      ]
    },
    {
      rank: "Moderators",
      color: "border-blue-500 text-blue-500",
      members: [
        { name: "SouthAuck", discord: "Southy#4444", role: "Senior Mod" },
        { name: "HarbourBridge", discord: "HB#5555", role: "Trial Mod" }
      ]
    }
  ];

  const hasRealData = data && (
    data.staff.management.length > 0 || 
    data.staff.administrators.length > 0 || 
    data.staff.moderators.length > 0
  );

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
              SERVER <span className="text-primary">ROSTER</span>
            </motion.h1>
            <p className="text-muted-foreground text-lg">Our dedicated team keeping Auckland safe and fair.</p>
          </header>

          {isLoading ? (
            <div className="space-y-12">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <Skeleton className="h-6 w-32 mb-6" />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2].map((j) => (
                      <Skeleton key={j} className="h-24 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : hasRealData ? (
            <div className="space-y-12">
              {Object.entries({
                management: { label: "Management", color: "border-red-500 text-red-500" },
                administrators: { label: "Administrators", color: "border-orange-500 text-orange-500" },
                moderators: { label: "Moderators", color: "border-blue-500 text-blue-500" },
              }).map(([key, config], groupIdx) => {
                const members = data.staff[key as keyof typeof data.staff];
                if (members.length === 0) return null;
                
                return (
                  <section key={key}>
                    <div className="flex items-center gap-4 mb-6">
                      <h2 className={`text-xl font-bold uppercase tracking-widest ${config.color.split(' ')[1]}`}>
                        {config.label}
                      </h2>
                      <div className="h-px bg-white/5 flex-1" />
                    </div>
                    
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {members.map((staff, idx) => (
                        <motion.div
                          key={staff.user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (groupIdx * 0.2) + (idx * 0.1) }}
                        >
                          <Card className="bg-zinc-900/40 border-white/5 hover:border-primary/30 transition-all group">
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-primary transition-colors overflow-hidden">
                                  {staff.user.avatar ? (
                                    <img 
                                      src={`https://cdn.discordapp.com/avatars/${staff.user.id}/${staff.user.avatar}.png`}
                                      alt={staff.user.username}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="group-hover:text-black transition-colors" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{staff.user.username}</h3>
                                  <Badge variant="outline" className="mt-2 border-current opacity-80 text-[10px] py-0 px-2">
                                    {staff.role.name}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            // Fallback to mock data when no real staff configured
            <div className="space-y-12">
              {fallbackHierarchy.map((group, groupIdx) => (
                <section key={group.rank}>
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className={`text-xl font-bold uppercase tracking-widest ${group.color.split(' ')[1]}`}>
                      {group.rank}
                    </h2>
                    <div className="h-px bg-white/5 flex-1" />
                  </div>
                  
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.members.map((staff, idx) => (
                      <motion.div
                        key={staff.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (groupIdx * 0.2) + (idx * 0.1) }}
                      >
                        <Card className="bg-zinc-900/40 border-white/5 hover:border-primary/30 transition-all group">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-primary transition-colors">
                                <User className="group-hover:text-black transition-colors" />
                              </div>
                              <div>
                                <h3 className="font-bold text-lg">{staff.name}</h3>
                                <p className="text-xs text-muted-foreground font-mono">{staff.discord}</p>
                                <Badge variant="outline" className="mt-2 border-current opacity-80 text-[10px] py-0 px-2">
                                  {staff.role}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
