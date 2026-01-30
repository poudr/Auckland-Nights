import { motion } from "framer-motion";
import { Shield, Star, Award, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Staff() {
  const staffHierarchy = [
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

  return (
    <div className="min-h-screen bg-background pt-24 px-6 pb-12">
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

        <div className="space-y-12">
          {staffHierarchy.map((group, groupIdx) => (
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
                            <Badge variant="outline" className={`mt-2 border-current opacity-80 text-[10px] py-0 px-2`}>
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
      </div>
    </div>
  );
}
