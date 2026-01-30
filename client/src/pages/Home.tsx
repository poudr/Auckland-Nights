import { motion } from "framer-motion";
import { Users, Shield, MessageSquareDiff as DiscordIcon, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import { useUser, loginWithDiscord } from "@/lib/auth";
import heroImg from "@/assets/hero-auckland.png";

export default function Home() {
  const { data: user } = useUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

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
              <Link href="/join">
                <Button size="lg" className="h-14 px-8 text-lg font-bold orange-glow" data-testid="button-join-server">
                  PLAY NOW
                </Button>
              </Link>
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold" data-testid="button-rules">
                VIEW RULES
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-24">
        {user ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <h2 className="text-3xl font-bold mb-4 font-display">Welcome back, {user.username}!</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              You're connected to the Tamaki Makaurau RP community. Explore departments, meet the team, or learn how to join.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/departments">
                <Button size="lg" className="gap-2">
                  <Shield className="w-4 h-4" /> Explore Departments
                </Button>
              </Link>
              <Link href="/team">
                <Button size="lg" variant="outline" className="gap-2">
                  <Users className="w-4 h-4" /> Meet the Team
                </Button>
              </Link>
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
                Connect your Discord to sync your server roles and create your character profile automatically.
              </p>
              <Button 
                className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-black" 
                onClick={loginWithDiscord}
                data-testid="button-cta-discord"
              >
                CONNECT DISCORD
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
