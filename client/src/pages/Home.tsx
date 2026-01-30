import { motion } from "framer-motion";
import { Users, Shield, MapPin, MessageSquareDiff as DiscordIcon, Terminal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import heroImg from "@/assets/hero-auckland.png";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Mock roles for the demo
  const mockRoles = [
    { name: "Server Whitelisted", color: "bg-orange-500" },
    { name: "Police Department", color: "bg-blue-600" },
    { name: "Auckland Resident", color: "bg-zinc-700" },
    { name: "OG Member", color: "bg-purple-600" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-display font-bold text-xl text-black">
              TM
            </div>
            <span className="font-display font-bold text-xl tracking-tighter">TAMAKI MAKAURAU RP</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">RULES</a>
            <a href="#" className="hover:text-primary transition-colors">MAP</a>
            <a href="#" className="hover:text-primary transition-colors">STAFF</a>
            <a href="#" className="hover:text-primary transition-colors">DONATE</a>
          </div>

          <Button 
            variant={isLoggedIn ? "outline" : "default"}
            onClick={() => setIsLoggedIn(!isLoggedIn)}
            className="gap-2"
            data-testid="button-discord-login"
          >
            {isLoggedIn ? (
              <>
                <User size={18} />
                PROFILE
              </>
            ) : (
              <>
                <Shield size={18} />
                CONNECT DISCORD
              </>
            )}
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImg} 
            alt="Auckland Skyline" 
            className="w-full h-full object-cover opacity-60 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary px-4 py-1 rounded-full bg-primary/5">
              NEW ZEALAND'S PREMIER ROLEPLAY
            </Badge>
            <h1 className="text-6xl md:text-8xl font-black mb-6 gta-text-shadow leading-none">
              AUCKLAND <br /> <span className="text-primary">REBORN</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Experience the most authentic NZ roleplay. From the CBD to the suburbs, write your story in the streets of Tamaki Makaurau.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-lg font-bold orange-glow" data-testid="button-join-server">
                PLAY NOW
              </Button>
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold" data-testid="button-rules">
                VIEW RULES
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-24">
        {isLoggedIn ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* User Profile Card */}
            <Card className="md:col-span-1 bg-zinc-900/50 border-white/5 overflow-hidden">
              <div className="h-24 bg-primary/20 relative">
                <div className="absolute -bottom-10 left-6">
                  <div className="w-20 h-20 rounded-xl bg-zinc-800 border-4 border-zinc-900 p-1">
                    <div className="w-full h-full rounded-lg bg-primary flex items-center justify-center text-black font-bold text-2xl">
                      JD
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="pt-12 pb-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold font-display">JohnDoe#1234</h2>
                  <p className="text-muted-foreground text-sm">Citizen ID: #45920</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-green-500 font-medium">Online</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Playtime</span>
                    <span className="text-foreground">142 Hours</span>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Synced MessageSquareDiff Roles</h3>
                  <div className="flex flex-wrap gap-2">
                    {mockRoles.map((role) => (
                      <Badge key={role.name} className={`${role.color} border-none`}>
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dashboard Stats */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Current Balance", value: "$45,200", icon: <Users className="text-primary" /> },
                { label: "Assets Owned", value: "3 Vehicles", icon: <MapPin className="text-primary" /> },
                { label: "Tickets", value: "0 Active", icon: <Shield className="text-primary" /> },
                { label: "Rank", value: "Senior Officer", icon: <Terminal className="text-primary" /> },
              ].map((stat, i) => (
                <Card key={i} className="bg-zinc-900/50 border-white/5">
                  <CardContent className="pt-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">{stat.label}</p>
                      <p className="text-xl font-bold font-display">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Card className="sm:col-span-2 bg-zinc-900/50 border-white/5">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-sm">Purchased a new vehicle from Auckland Imports</span>
                        </div>
                        <span className="text-xs text-muted-foreground">2 hours ago</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-3 gap-12 items-center">
            <div className="md:col-span-2">
              <h2 className="text-4xl font-bold mb-8 font-display italic tracking-tight">WHY JOIN TAMAKI MAKAURAU?</h2>
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Users className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Thriving Community</h3>
                  <p className="text-muted-foreground">Join hundreds of active players in a serious, high-quality roleplay environment designed for Kiwi gamers.</p>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Shield className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Whitelisted Jobs</h3>
                  <p className="text-muted-foreground">Apply for NZ Police, St John Ambulance, or run your own local business in the heart of Auckland.</p>
                </div>
              </div>
            </div>
            <Card className="bg-zinc-900/80 border-primary/20 p-8 text-center orange-glow">
              <DiscordIcon size={48} className="mx-auto mb-6 text-primary" />
              <h3 className="text-2xl font-bold mb-4">Start Your Journey</h3>
              <p className="text-muted-foreground text-sm mb-8">
                Connect your MessageSquareDiff to sync your server roles and create your character profile automatically.
              </p>
              <Button 
                className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-black" 
                onClick={() => setIsLoggedIn(true)}
                data-testid="button-cta-discord"
              >
                JOIN THE DISCORD
              </Button>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="font-display font-bold text-lg mb-2">TAMAKI MAKAURAU RP</div>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">© 2026 Auckland's Finest RP</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-muted-foreground hover:text-primary"><DiscordIcon size={20} /></a>
            <a href="#" className="text-muted-foreground hover:text-primary"><Shield size={20} /></a>
            <a href="#" className="text-muted-foreground hover:text-primary"><Terminal size={20} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
