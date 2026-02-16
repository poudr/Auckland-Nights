import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Shield, Flame, HeartPulse, Target, ChevronRight, Lock, ClipboardList, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUser, type User } from "@/lib/auth";
import { useLocation } from "wouter";

interface Department {
  id: string;
  code: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  isActive: boolean;
}

interface DepartmentsData {
  departments: Department[];
}

const ICONS: Record<string, React.ReactNode> = {
  Shield: <Shield className="w-8 h-8" />,
  Flame: <Flame className="w-8 h-8" />,
  HeartPulse: <HeartPulse className="w-8 h-8" />,
  Target: <Target className="w-8 h-8" />,
  Truck: <Truck className="w-8 h-8" />,
};

async function fetchDepartments(): Promise<DepartmentsData> {
  const res = await fetch("/api/departments");
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

async function checkAccess(code: string): Promise<boolean> {
  const res = await fetch(`/api/user/check-access/${code}`, { credentials: "include" });
  if (!res.ok) return false;
  const data = await res.json();
  return data.hasAccess;
}

export default function Departments() {
  const { data: user } = useUser();
  const { data, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
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
              <span className="text-primary">DEPARTMENT</span> PORTALS
            </motion.h1>
            <p className="text-muted-foreground text-lg">Access your department's roster, SOPs, and resources.</p>
            {!user && (
              <Badge variant="outline" className="mt-4 border-yellow-500/30 text-yellow-500">
                <Lock className="w-3 h-3 mr-1" /> Login required to access department portals
              </Badge>
            )}
          </header>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : data ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-1 text-white">Emergency Services</h2>
                <div className="h-0.5 w-16 bg-primary mb-6" />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.departments
                    .filter(d => d.isActive && ["police", "fire", "ems"].includes(d.code))
                    .sort((a, b) => {
                      const order = ["police", "fire", "ems"];
                      return order.indexOf(a.code) - order.indexOf(b.code);
                    })
                    .map((dept, idx) => (
                    <motion.div
                      key={dept.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <DepartmentCard department={dept} user={user ?? null} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {data.departments.filter(d => d.isActive && !["police", "fire", "ems", "aos"].includes(d.code)).length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-1 text-white">Other Departments</h2>
                  <div className="h-0.5 w-16 bg-primary mb-6" />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.departments
                      .filter(d => d.isActive && !["police", "fire", "ems", "aos"].includes(d.code))
                      .map((dept, idx) => (
                      <motion.div
                        key={dept.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (idx + 3) * 0.1 }}
                      >
                        <DepartmentCard department={dept} user={user ?? null} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DepartmentCard({ department, user }: { department: Department; user: User | null }) {
  const [, setLocation] = useLocation();
  const { data: hasAccess } = useQuery({
    queryKey: ["departmentAccess", department.code],
    queryFn: () => checkAccess(department.code),
    enabled: !!user,
  });

  const { data: whitelistData } = useQuery({
    queryKey: ["whitelist-form", department.code],
    queryFn: async () => {
      const res = await fetch(`/api/departments/${department.code}/whitelist-form`);
      if (!res.ok) return { form: null };
      return res.json();
    },
    enabled: !!user && hasAccess === false,
  });

  const hasWhitelistForm = !!whitelistData?.form;
  const icon = ICONS[department.icon] || <Shield className="w-8 h-8" />;

  return (
    <Card 
      className="bg-zinc-900/40 border-white/5 hover:border-white/10 transition-all h-full overflow-hidden group"
      style={{ borderColor: hasAccess ? `${department.color}40` : undefined }}
    >
      <CardHeader className="flex flex-row items-start gap-4">
        <div 
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${department.color}20`, color: department.color }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <CardTitle className="flex items-center justify-between">
            <span>{department.name}</span>
            {hasAccess && (
              <Badge style={{ backgroundColor: department.color, color: "black" }} className="text-xs">
                Access Granted
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="mt-1">
            {department.description || "No description available."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {user ? (
          hasAccess ? (
            <Link href={`/departments/${department.code}`}>
              <Button 
                className="w-full group-hover:bg-primary/90 transition-colors"
                style={{ backgroundColor: department.color, color: "black" }}
                data-testid={`button-open-${department.code}`}
              >
                Open Portal <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          ) : hasWhitelistForm ? (
            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600 text-black"
              onClick={() => setLocation(`/departments/${department.code}`)}
              data-testid={`button-apply-${department.code}`}
            >
              <ClipboardList className="w-4 h-4 mr-2" /> Apply Now
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-white/10 text-muted-foreground"
              disabled
            >
              <Lock className="w-4 h-4 mr-2" /> No Access
            </Button>
          )
        ) : (
          <Button 
            variant="outline" 
            className="w-full border-white/10 text-muted-foreground"
            disabled
          >
            <Lock className="w-4 h-4 mr-2" /> Login Required
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
