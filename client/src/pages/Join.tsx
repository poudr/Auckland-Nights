import { motion } from "framer-motion";
import { Shield, ExternalLink, MessageSquare, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function Join() {
  return (
    <div className="min-h-screen bg-background pt-24 px-6 pb-12">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black gta-text-shadow mb-4"
          >
            HOW TO <span className="text-primary">JOIN</span>
          </motion.h1>
          <p className="text-muted-foreground text-lg">Follow these steps to start your life in Auckland.</p>
        </header>

        <div className="space-y-8">
          {/* Step 1: Discord */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-zinc-900/50 border-primary/20 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <MessageSquare size={120} />
              </div>
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center font-bold shrink-0">1</div>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold font-display">JOIN OUR DISCORD</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Essential for all players. You must join our Discord to receive your whitelist roles, read the rules, and stay updated with server announcements.
                    </p>
                    <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white gap-2" size="lg" data-testid="button-join-discord-external">
                      <MessageSquare size={18} /> JOIN DISCORD SERVER
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 2: Game Server */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-zinc-900/50 border-white/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <PlayCircle size={120} />
              </div>
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 text-foreground flex items-center justify-center font-bold shrink-0">2</div>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold font-display">CONNECT TO SERVER</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Once you have your roles in Discord, you can connect directly to the game server. Make sure you have FiveM installed and updated.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button className="bg-primary text-black gap-2" size="lg" data-testid="button-join-game-direct">
                        <PlayCircle size={18} /> JOIN GAME SERVER
                      </Button>
                      <Button variant="outline" className="gap-2" data-testid="button-f8-connect">
                        F8 CONNECT COMMAND
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/">
            <Button variant="link" className="text-muted-foreground hover:text-primary">
              ← BACK TO HOME
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
