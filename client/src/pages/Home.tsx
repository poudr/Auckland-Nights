import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Shield, MessageSquareDiff as DiscordIcon, Terminal, Code, ArrowRight, Megaphone, Plus, Trash2, Calendar, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { useUser, loginWithDiscord } from "@/lib/auth";
import heroImg from "@/assets/hero-auckland.png";

async function fetchSetting(key: string): Promise<string | null> {
  const res = await fetch(`/api/settings/${key}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.value;
}

interface ServerUpdate {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorDiscordId: string | null;
  createdAt: string;
}

function ServerUpdatesSection({ user }: { user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const canPost = user?.staffTier && ["manager", "executive", "director"].includes(user.staffTier);

  const { data: updatesData, isLoading } = useQuery({
    queryKey: ["server-updates"],
    queryFn: async () => {
      const res = await fetch("/api/server-updates");
      if (!res.ok) return { updates: [] };
      return res.json() as Promise<{ updates: ServerUpdate[] }>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/server-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle, description: newDescription, imageUrl: newImageUrl || null }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Update Posted" });
      setShowCreateDialog(false);
      setNewTitle("");
      setNewDescription("");
      setNewImageUrl("");
      queryClient.invalidateQueries({ queryKey: ["server-updates"] });
    },
    onError: () => {
      toast({ title: "Failed to post update", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/server-updates/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server-updates"] });
      toast({ title: "Update deleted" });
    },
  });

  const updates = updatesData?.updates || [];
  const latestUpdate = updates[0];
  const olderUpdates = updates.slice(1);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold font-display" data-testid="text-server-updates-title">Server Updates</h2>
        </div>
        {canPost && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-update">
                <Plus className="w-4 h-4" /> New Update
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 max-w-lg">
              <DialogHeader>
                <DialogTitle>Post Server Update</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Update title..." data-testid="input-update-title" />
                </div>
                <div>
                  <Label>Description</Label>
                  <textarea
                    className="w-full bg-zinc-800 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground min-h-[120px]"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What's new..."
                    data-testid="textarea-update-description"
                  />
                </div>
                <div>
                  <Label>Image URL (optional)</Label>
                  <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="https://..." data-testid="input-update-image" />
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!newTitle || !newDescription || createMutation.isPending} className="w-full" data-testid="button-submit-update">
                  {createMutation.isPending ? "Posting..." : "Post Update"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {updates.length === 0 ? (
        <Card className="bg-zinc-900/40 border-white/5 p-8 text-center">
          <p className="text-muted-foreground">No server updates yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {latestUpdate && (
            <Card className="bg-zinc-900/40 border-white/5 overflow-hidden" data-testid={`update-latest-${latestUpdate.id}`}>
              {latestUpdate.imageUrl && (
                <div className="w-full h-64 overflow-hidden">
                  <img src={latestUpdate.imageUrl} alt={latestUpdate.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-3" data-testid="text-latest-update-title">{latestUpdate.title}</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line mb-4" data-testid="text-latest-update-description">{latestUpdate.description}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {latestUpdate.authorAvatar && latestUpdate.authorDiscordId ? (
                        <img src={`https://cdn.discordapp.com/avatars/${latestUpdate.authorDiscordId}/${latestUpdate.authorAvatar}.png?size=32`} alt="" className="w-6 h-6 rounded-full" />
                      ) : null}
                      <span>{latestUpdate.authorName}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(latestUpdate.createdAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  {canPost && (
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 shrink-0" onClick={() => deleteMutation.mutate(latestUpdate.id)} data-testid={`button-delete-update-${latestUpdate.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {olderUpdates.length > 0 && (
            <div className="space-y-3">
              {olderUpdates.map((update) => (
                <Card key={update.id} className="bg-zinc-900/30 border-white/5" data-testid={`update-${update.id}`}>
                  <CardContent className="flex items-center gap-4 py-4 px-5">
                    {update.imageUrl && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        <img src={update.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{update.title}</h4>
                      <p className="text-xs text-muted-foreground truncate">{update.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {update.authorName} · {new Date(update.createdAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {canPost && (
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 shrink-0" onClick={() => deleteMutation.mutate(update.id)} data-testid={`button-delete-update-${update.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}

export default function Home() {
  const { data: user } = useUser();
  const { data: aboutDescription, isLoading: aboutLoading } = useQuery({
    queryKey: ["setting", "about_description"],
    queryFn: () => fetchSetting("about_description"),
  });

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
              <Link href="/rules">
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold" data-testid="button-rules">
                  VIEW RULES
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-24 space-y-24">
        {user ? null : (
          <div className="grid md:grid-cols-3 gap-12 items-center">
            <div className="md:col-span-2">
              <h2 className="text-4xl font-bold mb-8 font-display italic tracking-tight" data-testid="text-why-join">WHY JOIN TAMAKI MAKAURAU?</h2>
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Users className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold" data-testid="text-community-title">Thriving Community</h3>
                  <p className="text-muted-foreground" data-testid="text-community-desc">Join hundreds of active players in a serious, high-quality roleplay environment designed for Kiwi gamers.</p>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Code className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold" data-testid="text-scripts-title">Custom Scripts</h3>
                  <p className="text-muted-foreground" data-testid="text-scripts-desc">Fun and engaging custom scripts to ensure true immersion whilst playing Tamaki Makaurau RP.</p>
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

        {/* Server Updates */}
        <ServerUpdatesSection user={user} />

        {/* About Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-zinc-900/40 border-white/5 p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6 font-display" data-testid="text-about-title">About Tamaki Makaurau RP</h2>
            {aboutLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <p className="text-muted-foreground leading-relaxed text-lg whitespace-pre-line mb-8" data-testid="text-about-description">
                {aboutDescription || "Welcome to Tamaki Makaurau RP — New Zealand's premier GTA V FiveM roleplay server. Set in the heart of Auckland, we offer a realistic and immersive roleplay experience with dedicated departments, custom scripts, and an active community of passionate roleplayers."}
              </p>
            )}
            <Link href="/join">
              <Button size="lg" className="gap-2 orange-glow" data-testid="button-get-started">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </Card>
        </motion.section>
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
