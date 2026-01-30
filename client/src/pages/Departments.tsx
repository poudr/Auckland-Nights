import { motion } from "framer-motion";
import { Shield, HeartPulse, Flame, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { useUser, loginWithDiscord } from "@/lib/auth";

async function checkAccess(department: string): Promise<{ hasAccess: boolean }> {
  const res = await fetch(`/api/user/check-access/${department}`, { credentials: "include" });
  if (!res.ok) return { hasAccess: false };
  return res.json();
}

interface DepartmentConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  roles: string[];
}

const departments: DepartmentConfig[] = [
  {
    id: "police",
    name: "Auckland Police Department",
    icon: <Shield className="text-blue-500" />,
    description: "Serving and protecting the citizens of Tamaki Makaurau.",
    color: "border-blue-500/20 hover:border-blue-500/50",
    roles: ["Police", "Command"]
  },
  {
    id: "ems",
    name: "St John Ambulance",
    icon: <HeartPulse className="text-green-500" />,
    description: "Providing world-class emergency medical care.",
    color: "border-green-500/20 hover:border-green-500/50",
    roles: ["EMS", "Medical"]
  },
  {
    id: "fire",
    name: "NZ Fire & Emergency",
    icon: <Flame className="text-red-500" />,
    description: "Emergency fire response and rescue operations.",
    color: "border-red-500/20 hover:border-red-500/50",
    roles: ["Fire", "Rescue"]
  }
];

function DepartmentCard({ dept }: { dept: DepartmentConfig }) {
  const { data: user } = useUser();
  const { data: accessData } = useQuery({
    queryKey: ["access", dept.id],
    queryFn: () => checkAccess(dept.id),
    enabled: !!user,
  });

  const hasAccess = accessData?.hasAccess ?? false;

  return (
    <Card className={`h-full bg-zinc-900/50 transition-all ${dept.color} relative overflow-hidden group`}>
      <CardHeader>
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          {dept.icon}
        </div>
        <CardTitle className="text-2xl">{dept.name}</CardTitle>
        <CardDescription className="text-muted-foreground/80">{dept.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {dept.roles.map(r => (
            <Badge key={r} variant="secondary" className="bg-white/5 border-white/5">
              {r} Required
            </Badge>
          ))}
        </div>
        
        <div className="pt-4 space-y-3">
          {!user ? (
            <>
              <Button 
                className="w-full gap-2" 
                onClick={loginWithDiscord}
              >
                <Lock size={16} /> LOGIN TO ACCESS
              </Button>
              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                Connect Discord to check access
              </p>
            </>
          ) : hasAccess ? (
            <>
              <Button className="w-full gap-2 bg-primary text-black hover:bg-primary/90">
                <Unlock size={16} /> ENTER PORTAL
              </Button>
              <p className="text-[10px] text-center text-green-500 uppercase tracking-widest">
                Access Granted
              </p>
            </>
          ) : (
            <>
              <Button className="w-full gap-2 border-white/10" variant="outline" disabled>
                <Lock size={16} /> ENTER PORTAL
              </Button>
              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                Access Restricted to Personnel
              </p>
            </>
          )}
        </div>
      </CardContent>
      
      {/* Decorative background icon */}
      <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity scale-[4]">
        {dept.icon}
      </div>
    </Card>
  );
}

export default function Departments() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black gta-text-shadow mb-4"
            >
              PUBLIC <span className="text-primary">SERVICES</span>
            </motion.h1>
            <p className="text-muted-foreground text-lg">Official portals for our whitelisted departments.</p>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            {departments.map((dept, idx) => (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <DepartmentCard dept={dept} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
