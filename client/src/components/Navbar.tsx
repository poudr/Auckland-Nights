import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Shield, User, LogOut, RefreshCw, Menu, X, Settings, Home, Bell, CheckCheck, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useUser, useLogout, useSyncRoles, useAuthStatus, getAvatarUrl, loginWithDiscord, hasPermission } from "@/lib/auth";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import tmrpLogo from "@/assets/tmrp-logo.jpg";

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function NotificationBell() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return res.json() as Promise<{ notifications: NotificationData[]; unreadCount: number }>;
    },
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "POST", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/clear-all", { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = data?.unreadCount || 0;
  const notifs = data?.notifications || [];

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" data-testid="notification-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold text-sm">Notifications</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => markAllReadMutation.mutate()} data-testid="button-mark-all-read">
                <CheckCheck className="w-3 h-3" /> Mark all read
              </Button>
            )}
            {notifs.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-400 hover:text-red-300" onClick={() => clearAllMutation.mutate()} data-testid="button-clear-all-notifications">
                <Trash2 className="w-3 h-3" /> Clear all
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        {notifs.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          notifs.slice(0, 20).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex flex-col items-start gap-1 px-3 py-2 cursor-pointer ${!n.isRead ? "bg-primary/5" : ""}`}
              onClick={() => {
                if (!n.isRead) markReadMutation.mutate(n.id);
                if (n.link) setLocation(n.link);
              }}
              data-testid={`notification-${n.id}`}
            >
              <div className="flex items-center gap-2 w-full">
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                <span className="font-medium text-sm truncate flex-1">{n.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
              </div>
              {n.message && <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{n.message}</p>}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navbar() {
  const { data: user, isLoading } = useUser();
  const { data: authStatus } = useAuthStatus();
  const logoutMutation = useLogout();
  const syncRolesMutation = useSyncRoles();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const canAccessAdmin = hasPermission(user ?? null, "admin", authStatus?.isBootstrapMode);

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/80 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <img src={tmrpLogo} alt="TMRP Logo" className="w-10 h-10 rounded-full object-cover" />
          <span className="font-display font-bold text-xl tracking-tighter hidden sm:inline">TAMAKI MAKAURAU RP</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
            <Home size={14} /> HOME
          </Link>
          <Link href="/rules" className="hover:text-primary transition-colors cursor-pointer">RULES</Link>
          <Link href="/join" className="hover:text-primary transition-colors cursor-pointer">HOW TO JOIN</Link>
          <Link href="/team" className="hover:text-primary transition-colors cursor-pointer">MEET THE TEAM</Link>
          <Link href="/departments" className="hover:text-primary transition-colors cursor-pointer">DEPARTMENTS</Link>
          <Link href="/support" className="hover:text-primary transition-colors cursor-pointer">SUPPORT</Link>
          <a href="https://tamaki-makaurau-roleplay.tebex.io/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">SHOP</a>
          {user && canAccessAdmin && (
            <Link href="/admin" className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
              <Settings size={14} /> ADMIN
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isLoading && user && <NotificationBell />}
          {isLoading ? (
            <Button variant="outline" disabled>
              <RefreshCw className="animate-spin" size={18} />
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-user-menu">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={getAvatarUrl(user)} alt={user.displayName || user.username} />
                    <AvatarFallback>{(user.displayName || user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user.displayName || user.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 p-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getAvatarUrl(user)} alt={user.displayName || user.username} />
                      <AvatarFallback>{(user.displayName || user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.displayName || user.username}</span>
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.staffTier && (
                  <>
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-muted-foreground mb-1">Staff Tier</p>
                      <Badge className="capitalize bg-primary text-black">{user.staffTier}</Badge>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                {user.websiteRoles && user.websiteRoles.length > 0 && (
                  <>
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-muted-foreground mb-1">Roles</p>
                      <div className="flex flex-wrap gap-1">
                        {user.websiteRoles.map((role: string) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <Link href={`/profile/${user.discordId}`}>
                  <DropdownMenuItem data-testid="link-my-profile">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={() => syncRolesMutation.mutate()} disabled={syncRolesMutation.isPending}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncRolesMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync Roles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending} className="text-red-500 focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={loginWithDiscord}
              className="gap-2"
              data-testid="button-discord-login"
            >
              <Shield size={18} />
              <span className="hidden sm:inline">CONNECT DISCORD</span>
            </Button>
          )}

          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-white/5 py-4 px-6">
          <div className="flex flex-col gap-4 text-sm font-medium">
            <Link href="/" className="hover:text-primary transition-colors py-2 flex items-center gap-1" onClick={() => setMobileMenuOpen(false)}>
              <Home size={14} /> HOME
            </Link>
            <Link href="/rules" className="hover:text-primary transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>RULES</Link>
            <Link href="/join" className="hover:text-primary transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>HOW TO JOIN</Link>
            <Link href="/team" className="hover:text-primary transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>MEET THE TEAM</Link>
            <Link href="/departments" className="hover:text-primary transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>DEPARTMENTS</Link>
            <Link href="/support" className="hover:text-primary transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>SUPPORT</Link>
            <a href="https://tamaki-makaurau-roleplay.tebex.io/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors py-2">SHOP</a>
            {user && canAccessAdmin && (
              <Link href="/admin" className="hover:text-primary transition-colors py-2 flex items-center gap-1" onClick={() => setMobileMenuOpen(false)}>
                <Settings size={14} /> ADMIN
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
