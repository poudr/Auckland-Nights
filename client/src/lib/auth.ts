import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  discordId: string;
  username: string;
  displayName: string | null;
  discriminator: string | null;
  avatar: string | null;
  email: string | null;
  roles: string[] | null;
  websiteRoles: string[] | null;
  isStaff: boolean | null;
  staffTier: string | null;
  staffTiers: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface AuthStatus {
  discordConfigured: boolean;
  authenticated: boolean;
  isBootstrapMode: boolean;
}

async function fetchUser(): Promise<User | null> {
  const res = await fetch("/api/auth/user", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch user");
  const data = await res.json();
  return data.user;
}

async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch("/api/auth/status", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch auth status");
  return res.json();
}

async function logout(): Promise<void> {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
}

async function syncRoles(): Promise<User> {
  const res = await fetch("/api/user/sync-roles", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to sync roles");
  const data = await res.json();
  return data.user;
}

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useAuthStatus() {
  return useQuery({
    queryKey: ["authStatus"],
    queryFn: fetchAuthStatus,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["user"], null);
      queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    },
  });
}

export function useSyncRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncRoles,
    onSuccess: (user) => {
      queryClient.setQueryData(["user"], user);
    },
  });
}

export function getAvatarUrl(user: { discordId: string; avatar: string | null }): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
  }
  const defaultNum = parseInt(user.discordId) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
}

export function loginWithDiscord() {
  window.location.href = "/api/auth/discord";
}

export function hasPermission(user: User | null, permission: string, isBootstrapMode?: boolean): boolean {
  if (!user) return false;
  if (permission === "admin") {
    if (user.isStaff) return true;
    if (isBootstrapMode) return true;
    return false;
  }
  if (user.staffTier === "director" || user.staffTier === "executive") return true;
  if (user.websiteRoles?.includes(permission)) return true;
  return false;
}
