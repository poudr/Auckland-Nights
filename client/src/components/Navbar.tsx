import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, User, LogOut, RefreshCw, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { useUser, useLogout, useSyncRoles, getAvatarUrl, loginWithDiscord } from "@/lib/auth";
import { useState } from "react";

export default function Navbar() {
  const { data: user, isLoading } = useUser();
  const logoutMutation = useLogout();
  const syncRolesMutation = useSyncRoles();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/80 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-display font-bold text-xl text-black">
            TM
          </div>
          <span className="font-display font-bold text-xl tracking-tighter hidden sm:inline">TAMAKI MAKAURAU RP</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/join" className="hover:text-primary transition-colors cursor-pointer">HOW TO JOIN</Link>
          <Link href="/staff" className="hover:text-primary transition-colors cursor-pointer">STAFF</Link>
          <Link href="/departments" className="hover:text-primary transition-colors cursor-pointer">DEPARTMENTS</Link>
          <a href="#" className="hover:text-primary transition-colors">DONATE</a>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <Button variant="outline" disabled>
              <RefreshCw className="animate-spin" size={18} />
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-user-menu">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={getAvatarUrl(user)} alt={user.username} />
                    <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => syncRolesMutation.mutate()} disabled={syncRolesMutation.isPending}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncRolesMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync Roles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
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
            <Link href="/join" className="hover:text-primary transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>HOW TO JOIN</Link>
            <Link href="/staff" className="hover:text-primary transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>STAFF</Link>
            <Link href="/departments" className="hover:text-primary transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>DEPARTMENTS</Link>
            <a href="#" className="hover:text-primary transition-colors py-2">DONATE</a>
          </div>
        </div>
      )}
    </nav>
  );
}
