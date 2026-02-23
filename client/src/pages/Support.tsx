import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, ChevronLeft, ChevronDown, ChevronUp, Send, Settings, Lock, Unlock, Check, X, Trash2, Plus, ArrowLeft, FileText, Users, Shield, MessageSquare, HelpCircle, ExternalLink, Edit, Save, ArrowUp, ArrowDown, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { PageSeo } from "@/components/PageSeo";
import { useUser } from "@/lib/auth";

interface SupportForm {
  id: string;
  key: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  accessTiers: string[];
  createdAt: string;
}

interface SupportQuestion {
  id: string;
  formId: string;
  label: string;
  type: string;
  options: string | null;
  isRequired: boolean;
  priority: number;
}

interface SupportSubmission {
  id: string;
  formId: string;
  userId: string;
  status: string;
  answers: string;
  createdAt: string;
  username?: string;
  avatar?: string | null;
  discordId?: string | null;
  formTitle?: string;
}

interface SupportMessage {
  id: string;
  submissionId: string;
  userId: string;
  content: string;
  createdAt: string;
  username?: string;
  avatar?: string | null;
  discordId?: string | null;
}

interface SupportFaq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  priority: number | null;
  createdBy: string | null;
  createdAt: string;
}

const TIER_LABELS: Record<string, string> = {
  director: "Director",
  executive: "Executive",
  manager: "Manager",
  administrator: "Administrator",
  moderator: "Moderator",
  support: "Support",
  development: "Development",
};

const EDITABLE_TIERS = ["director", "executive", "manager", "administrator", "moderator", "support", "development"];

type SupportTab = "faq" | "applications" | "discord" | "contact";

function SubmissionThread({ submissionId, user, hasStaffAccess, onBack }: { submissionId: string; user: any; hasStaffAccess: boolean; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState("");

  const { data: subData, isLoading } = useQuery({
    queryKey: ["support-submission", submissionId],
    queryFn: async () => {
      const res = await fetch(`/api/support/submissions/${submissionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ submission: SupportSubmission & { username: string; avatar: string | null; discordId: string | null }; form: SupportForm; questions: SupportQuestion[] }>;
    },
  });

  const { data: messagesData } = useQuery({
    queryKey: ["support-messages", submissionId],
    queryFn: async () => {
      const res = await fetch(`/api/support/submissions/${submissionId}/messages`, { credentials: "include" });
      if (!res.ok) return { messages: [] };
      return res.json() as Promise<{ messages: SupportMessage[] }>;
    },
    refetchInterval: 10000,
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/support/submissions/${submissionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: replyContent }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setReplyContent("");
      queryClient.invalidateQueries({ queryKey: ["support-messages", submissionId] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/support/submissions/${submissionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-submission", submissionId] });
      toast({ title: "Status updated" });
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!subData) return null;

  const { submission, form, questions } = subData;
  const messages = messagesData?.messages || [];
  const answers = JSON.parse(submission.answers || "{}");

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground mb-4" data-testid="button-back-thread">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <Card className="bg-zinc-900/40 border-white/5 mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {submission.avatar && submission.discordId ? (
                <img src={`https://cdn.discordapp.com/avatars/${submission.discordId}/${submission.avatar}.png?size=48`} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold">{(submission.displayName || submission.username)?.[0]}</div>
              )}
              <div>
                <CardTitle className="text-lg">{submission.displayName || submission.username}'s {form?.title || "Application"}</CardTitle>
                <CardDescription>Submitted {new Date(submission.createdAt).toLocaleDateString()}</CardDescription>
              </div>
            </div>
            <Badge className={`${
              submission.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
              submission.status === "accepted" ? "bg-green-500/20 text-green-400" :
              submission.status === "denied" ? "bg-red-500/20 text-red-400" :
              submission.status === "under_review" ? "bg-blue-500/20 text-blue-400" :
              "bg-zinc-500/20 text-zinc-400"
            }`}>
              {submission.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{q.label}</p>
              <p className="text-sm">{Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).join(", ") : (answers[q.id] as string) || "-"}</p>
            </div>
          ))}

          {hasStaffAccess && (
            <div className="flex gap-2 pt-4 border-t border-white/5">
              <Button size="sm" variant="outline" className="text-green-400 border-green-400/30" onClick={() => statusMutation.mutate("accepted")} data-testid="button-accept-submission">
                <Check className="w-3 h-3 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="outline" className="text-red-400 border-red-400/30" onClick={() => statusMutation.mutate("denied")} data-testid="button-deny-submission">
                <X className="w-3 h-3 mr-1" /> Deny
              </Button>
              <Button size="sm" variant="outline" className="text-blue-400 border-blue-400/30" onClick={() => statusMutation.mutate("under_review")} data-testid="button-review-submission">
                Under Review
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3 mb-4">
        {messages.map((msg) => (
          <Card key={msg.id} className={`border-white/5 ${msg.userId === user.id ? "bg-primary/5 border-primary/10" : "bg-zinc-900/30"}`} data-testid={`message-${msg.id}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                {msg.avatar && msg.discordId ? (
                  <img src={`https://cdn.discordapp.com/avatars/${msg.discordId}/${msg.avatar}.png?size=24`} alt="" className="w-5 h-5 rounded-full" />
                ) : null}
                <span className="text-sm font-medium">{msg.displayName || msg.username}</span>
                <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm whitespace-pre-line">{msg.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Type a reply..."
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && replyContent.trim() && replyMutation.mutate()}
          data-testid="input-reply"
        />
        <Button onClick={() => replyMutation.mutate()} disabled={!replyContent.trim() || replyMutation.isPending} data-testid="button-send-reply">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function SupportFormManagersDialog({ formId, formTitle, open, onOpenChange }: { formId: string; formTitle: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: managersData } = useQuery({
    queryKey: ["supportFormManagers", formId],
    queryFn: async () => {
      const res = await fetch(`/api/support/forms/${formId}/managers`, { credentials: "include" });
      if (!res.ok) return { managers: [] };
      return res.json() as Promise<{ managers: Array<{ id: string; formId: string; userId: string; username: string; displayName: string | null; avatar: string | null; discordId: string }> }>;
    },
    enabled: open,
  });

  const { data: allUsersData } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.users || data) as Array<{ id: string; username: string; displayName: string | null; avatar: string | null; discordId: string }>;
    },
    enabled: open,
  });

  const managers = managersData?.managers || [];
  const managerUserIds = managers.map(m => m.userId);
  const availableUsers = (allUsersData || []).filter(u => !managerUserIds.includes(u.id));

  const addMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/support/forms/${formId}/managers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Manager added" });
      setSelectedUserId("");
      queryClient.invalidateQueries({ queryKey: ["supportFormManagers", formId] });
    },
    onError: () => toast({ title: "Failed to add manager", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/support/forms/${formId}/managers/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Manager removed" });
      queryClient.invalidateQueries({ queryKey: ["supportFormManagers", formId] });
    },
    onError: () => toast({ title: "Failed to remove manager", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Form Managers
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Assign users to manage "{formTitle}" - they can view and respond to submissions.</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1" data-testid="select-support-form-manager">
                <SelectValue placeholder="Select a user to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.displayName || u.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!selectedUserId || addMutation.isPending}
              onClick={() => selectedUserId && addMutation.mutate(selectedUserId)}
              data-testid="button-add-support-form-manager"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {managers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No managers assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {managers.map(m => (
                <div key={m.userId} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/40" data-testid={`support-form-manager-${m.userId}`}>
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                    <img
                      src={m.avatar ? `https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(m.discordId || "0") % 5}.png`}
                      alt={m.displayName || m.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-sm flex-1">{m.displayName || m.username}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    onClick={() => removeMutation.mutate(m.userId)}
                    data-testid={`button-remove-support-manager-${m.userId}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormSettings({ form, onClose, isFormManager, isAdmin }: { form: SupportForm; onClose: () => void; isFormManager?: boolean; isAdmin?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accessTiers, setAccessTiers] = useState<string[]>(form.accessTiers || []);

  const { data: questionsData } = useQuery({
    queryKey: ["support-questions", form.id],
    queryFn: async () => {
      const res = await fetch(`/api/support/forms/${form.id}/questions`);
      if (!res.ok) return { questions: [] };
      return res.json() as Promise<{ questions: SupportQuestion[] }>;
    },
  });

  const [questions, setQuestions] = useState<Array<{ label: string; type: string; options: string; isRequired: boolean }>>([]);

  useEffect(() => {
    if (questionsData?.questions) {
      setQuestions(questionsData.questions.map(q => ({
        label: q.label,
        type: q.type,
        options: q.options || "",
        isRequired: q.isRequired,
      })));
    }
  }, [questionsData]);

  const updateAccessMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/support/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accessTiers }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-forms"] });
      toast({ title: "Access updated" });
    },
  });

  const updateQuestionsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/support/forms/${form.id}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          questions: questions.map((q, i) => ({
            label: q.label,
            type: q.type,
            options: q.options || null,
            isRequired: q.isRequired,
            priority: i,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-questions", form.id] });
      toast({ title: "Questions updated" });
    },
  });

  const addQuestion = () => {
    setQuestions([...questions, { label: "", type: "short_answer", options: "", isRequired: true }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (idx: number, direction: "up" | "down") => {
    const copy = [...questions];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= copy.length) return;
    [copy[idx], copy[swapIdx]] = [copy[swapIdx], copy[idx]];
    setQuestions(copy);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onClose} className="gap-2 text-muted-foreground" data-testid="button-back-settings">
        <ArrowLeft className="w-4 h-4" /> Back to {form.title}
      </Button>

      <h2 className="text-xl font-bold">Settings: {form.title}</h2>

      {isAdmin && (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader>
            <CardTitle className="text-base">Access Control</CardTitle>
            <CardDescription>Choose which staff tiers can view and respond to submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {EDITABLE_TIERS.map(tier => (
              <div key={tier} className="flex items-center gap-2">
                <Checkbox
                  checked={accessTiers.includes(tier)}
                  onCheckedChange={(checked) => {
                    setAccessTiers(checked ? [...accessTiers, tier] : accessTiers.filter(t => t !== tier));
                  }}
                  data-testid={`checkbox-tier-${tier}`}
                />
                <span className="text-sm">{TIER_LABELS[tier]}</span>
              </div>
            ))}
            <Button size="sm" onClick={() => updateAccessMutation.mutate()} disabled={updateAccessMutation.isPending} data-testid="button-save-access">
              Save Access
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Questions</CardTitle>
              <CardDescription>Configure what applicants need to fill out</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addQuestion} className="gap-1" data-testid="button-add-question">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No questions yet. Add questions so applicants can fill out this form.</p>
          )}
          {questions.map((q, i) => (
            <div key={i} className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Question {i + 1}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => moveQuestion(i, "up")} disabled={i === 0} data-testid={`button-move-up-question-${i}`}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => moveQuestion(i, "down")} disabled={i === questions.length - 1} data-testid={`button-move-down-question-${i}`}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeQuestion(i)} data-testid={`button-remove-question-${i}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Input
                value={q.label}
                onChange={(e) => updateQuestion(i, "label", e.target.value)}
                placeholder="Question text..."
                data-testid={`input-question-label-${i}`}
              />
              <div className="flex gap-3">
                <Select value={q.type} onValueChange={(v) => updateQuestion(i, "type", v)}>
                  <SelectTrigger className="w-40" data-testid={`select-question-type-${i}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="long_answer">Long Answer</SelectItem>
                    <SelectItem value="dropdown">Dropdown</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Checkbox checked={q.isRequired} onCheckedChange={(v) => updateQuestion(i, "isRequired", v)} />
                  <span className="text-xs text-muted-foreground">Required</span>
                </div>
              </div>
              {(q.type === "dropdown" || q.type === "checkbox") && (
                <Input
                  value={q.options}
                  onChange={(e) => updateQuestion(i, "options", e.target.value)}
                  placeholder='Options (JSON array: ["A", "B", "C"])'
                  data-testid={`input-question-options-${i}`}
                />
              )}
            </div>
          ))}
          {questions.length > 0 && (
            <Button onClick={() => updateQuestionsMutation.mutate()} disabled={updateQuestionsMutation.isPending} className="w-full" data-testid="button-save-questions">
              {updateQuestionsMutation.isPending ? "Saving..." : "Save Questions"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FormDetail({ form, user, onBack }: { form: SupportForm; user: any; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(window.location.search);
  const deepLinkSubmissionId = searchParams.get("submission");

  const [view, setView] = useState<"list" | "apply" | "thread" | "settings">(deepLinkSubmissionId ? "thread" : "list");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(deepLinkSubmissionId || null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showManagersDialog, setShowManagersDialog] = useState(false);

  const { data: managedFormsData } = useQuery({
    queryKey: ["support-managed-forms"],
    queryFn: async () => {
      const res = await fetch("/api/support/my-managed-forms", { credentials: "include" });
      if (!res.ok) return { managedFormIds: [] };
      return res.json() as Promise<{ managedFormIds: string[] }>;
    },
    enabled: !!user,
  });

  const tier = user?.staffTier;
  const isFormManager = (managedFormsData?.managedFormIds || []).includes(form.id);
  const hasStaffAccess = (tier && ((form.accessTiers || []).includes(tier) || tier === "director" || tier === "executive")) || isFormManager;
  const isAdmin = tier === "director" || tier === "executive";

  const { data: questionsData } = useQuery({
    queryKey: ["support-questions", form.id],
    queryFn: async () => {
      const res = await fetch(`/api/support/forms/${form.id}/questions`);
      if (!res.ok) return { questions: [] };
      return res.json() as Promise<{ questions: SupportQuestion[] }>;
    },
  });

  const { data: submissionsData, isLoading: subsLoading } = useQuery({
    queryKey: ["support-submissions", form.id],
    queryFn: async () => {
      const res = await fetch(`/api/support/forms/${form.id}/submissions`, { credentials: "include" });
      if (!res.ok) return { submissions: [] };
      return res.json() as Promise<{ submissions: SupportSubmission[] }>;
    },
    enabled: !!hasStaffAccess,
  });

  const { data: mySubsData } = useQuery({
    queryKey: ["support-my-submissions"],
    queryFn: async () => {
      const res = await fetch(`/api/support/my-submissions`, { credentials: "include" });
      if (!res.ok) return { submissions: [] };
      return res.json() as Promise<{ submissions: SupportSubmission[] }>;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/support/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isOpen: !form.isOpen }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-forms"] });
      toast({ title: form.isOpen ? "Form closed" : "Form opened" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/support/forms/${form.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Application Submitted" });
      setView("list");
      setAnswers({});
      queryClient.invalidateQueries({ queryKey: ["support-my-submissions"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/support/submissions/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-submissions", form.id] });
      toast({ title: "Submission deleted" });
    },
  });

  const questions = questionsData?.questions || [];
  const submissions = submissionsData?.submissions || [];
  const mySubmissions = (mySubsData?.submissions || []).filter(s => s.formId === form.id);

  if (view === "settings" && (isAdmin || isFormManager)) {
    return <FormSettings form={form} onClose={() => setView("list")} isFormManager={isFormManager} isAdmin={isAdmin} />;
  }

  if (view === "thread" && selectedSubmissionId) {
    return (
      <SubmissionThread
        submissionId={selectedSubmissionId}
        user={user}
        hasStaffAccess={!!hasStaffAccess}
        onBack={() => { setView("list"); setSelectedSubmissionId(null); queryClient.invalidateQueries({ queryKey: ["support-submissions", form.id] }); }}
      />
    );
  }

  if (view === "apply") {
    return (
      <div>
        <Button variant="ghost" onClick={() => setView("list")} className="gap-2 text-muted-foreground mb-4" data-testid="button-back-apply">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader>
            <CardTitle>{form.title}</CardTitle>
            {form.description && <CardDescription>{form.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">This form has no questions configured yet. Please check back later.</p>
            ) : (
              <>
                {questions.map((q) => {
                  const opts = q.options ? JSON.parse(q.options) : [];
                  return (
                    <div key={q.id} className="space-y-1.5">
                      <Label className="text-sm">
                        {q.label} {q.isRequired && <span className="text-red-400">*</span>}
                      </Label>
                      {q.type === "short_answer" && (
                        <Input value={(answers[q.id] as string) || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} data-testid={`input-answer-${q.id}`} />
                      )}
                      {q.type === "long_answer" && (
                        <textarea className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground min-h-[100px]" value={(answers[q.id] as string) || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} data-testid={`textarea-answer-${q.id}`} />
                      )}
                      {q.type === "dropdown" && (
                        <select className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground" value={(answers[q.id] as string) || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} data-testid={`select-answer-${q.id}`}>
                          <option value="">Select...</option>
                          {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                      {q.type === "checkbox" && (
                        <div className="space-y-1">
                          {opts.map((o: string) => (
                            <div key={o} className="flex items-center gap-2">
                              <Checkbox
                                checked={((answers[q.id] as string[]) || []).includes(o)}
                                onCheckedChange={(checked) => {
                                  const current = (answers[q.id] as string[]) || [];
                                  setAnswers({ ...answers, [q.id]: checked ? [...current, o] : current.filter(v => v !== o) });
                                }}
                              />
                              <span className="text-sm">{o}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} data-testid="button-submit-application">
                  {submitMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground mb-4" data-testid="button-back-forms">
        <ArrowLeft className="w-4 h-4" /> Back to Applications
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{form.title}</h2>
          {form.description && <p className="text-muted-foreground text-sm mt-1">{form.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {hasStaffAccess && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleMutation.mutate()}
              className={form.isOpen ? "text-red-400 border-red-400/30" : "text-green-400 border-green-400/30"}
              data-testid="button-toggle-form"
            >
              {form.isOpen ? <><Lock className="w-3 h-3 mr-1" /> Close</> : <><Unlock className="w-3 h-3 mr-1" /> Open</>}
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowManagersDialog(true)} className="gap-1" data-testid="button-form-managers-detail">
              <UserCog className="w-3 h-3" /> Managers
            </Button>
          )}
          {(isAdmin || isFormManager) && (
            <Button size="sm" variant="outline" onClick={() => setView("settings")} className="gap-1" data-testid="button-form-settings">
              <Settings className="w-3 h-3" /> Settings
            </Button>
          )}
        </div>
      </div>

      {showManagersDialog && (
        <SupportFormManagersDialog
          formId={form.id}
          formTitle={form.title}
          open={showManagersDialog}
          onOpenChange={setShowManagersDialog}
        />
      )}

      {!form.isOpen && (
        <Card className="bg-red-500/10 border-red-500/20 mb-6">
          <CardContent className="py-3 px-4 text-sm text-red-400 flex items-center gap-2">
            <Lock className="w-4 h-4" /> This form is currently closed. Applications are not being accepted.
          </CardContent>
        </Card>
      )}

      {form.isOpen && user && (
        <Button onClick={() => setView("apply")} className="mb-6 gap-2 bg-orange-500 hover:bg-orange-600 text-black" data-testid="button-apply">
          <ClipboardList className="w-4 h-4" /> Apply Now
        </Button>
      )}

      {mySubmissions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Your Applications</h3>
          <div className="space-y-2">
            {mySubmissions.map(sub => (
              <Card key={sub.id} className="bg-zinc-900/30 border-white/5 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => { setSelectedSubmissionId(sub.id); setView("thread"); }} data-testid={`my-submission-${sub.id}`}>
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">Submitted {new Date(sub.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge className={`text-xs ${
                    sub.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                    sub.status === "accepted" ? "bg-green-500/20 text-green-400" :
                    sub.status === "denied" ? "bg-red-500/20 text-red-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>
                    {sub.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {hasStaffAccess && (
        <div>
          <h3 className="text-lg font-semibold mb-3">All Submissions</h3>
          {subsLoading ? (
            <Skeleton className="h-32" />
          ) : submissions.length === 0 ? (
            <Card className="bg-zinc-900/30 border-white/5">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">No submissions yet.</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {submissions.map(sub => (
                <Card key={sub.id} className="bg-zinc-900/30 border-white/5 hover:bg-zinc-800/50 transition-colors" data-testid={`submission-row-${sub.id}`}>
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedSubmissionId(sub.id); setView("thread"); }}>
                      {sub.avatar && sub.discordId ? (
                        <img src={`https://cdn.discordapp.com/avatars/${sub.discordId}/${sub.avatar}.png?size=32`} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">{(sub.displayName || sub.username)?.[0]}</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{sub.displayName || sub.username}</p>
                        <p className="text-xs text-muted-foreground">{new Date(sub.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs shrink-0 ${
                      sub.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      sub.status === "accepted" ? "bg-green-500/20 text-green-400" :
                      sub.status === "denied" ? "bg-red-500/20 text-red-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>
                      {sub.status}
                    </Badge>
                    {hasStaffAccess && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 shrink-0" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(sub.id); }} data-testid={`button-delete-submission-${sub.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FaqSection({ user }: { user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.staffTier === "director" || user?.staffTier === "executive";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingFaq, setEditingFaq] = useState<SupportFaq | null>(null);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "General" });

  const { data: faqData, isLoading } = useQuery({
    queryKey: ["support-faqs"],
    queryFn: async () => {
      const res = await fetch("/api/support/faqs");
      if (!res.ok) return { faqs: [] };
      return res.json() as Promise<{ faqs: SupportFaq[] }>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/support/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(faqForm),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-faqs"] });
      setShowAddDialog(false);
      setFaqForm({ question: "", answer: "", category: "General" });
      toast({ title: "FAQ added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingFaq) return;
      const res = await fetch(`/api/support/faqs/${editingFaq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(faqForm),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-faqs"] });
      setEditingFaq(null);
      setFaqForm({ question: "", answer: "", category: "General" });
      toast({ title: "FAQ updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/support/faqs/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-faqs"] });
      toast({ title: "FAQ deleted" });
    },
  });

  const faqs = faqData?.faqs || [];
  const categories = [...new Set(faqs.map(f => f.category || "General"))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display" data-testid="text-faq-heading">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground mt-1">Find answers to common questions about our server</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => { setFaqForm({ question: "", answer: "", category: "General" }); setShowAddDialog(true); }} className="gap-1 bg-orange-500 hover:bg-orange-600 text-black" data-testid="button-add-faq">
            <Plus className="w-3 h-3" /> Add FAQ
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : faqs.length === 0 ? (
        <Card className="bg-zinc-900/30 border-white/5">
          <CardContent className="py-12 text-center">
            <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No FAQs have been added yet.</p>
            {isAdmin && <p className="text-muted-foreground text-xs mt-1">Click "Add FAQ" to create one.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map(category => {
            const categoryFaqs = faqs.filter(f => (f.category || "General") === category);
            return (
              <div key={category}>
                {categories.length > 1 && (
                  <h3 className="text-sm font-semibold text-primary/80 uppercase tracking-wider mb-3">{category}</h3>
                )}
                <div className="space-y-2">
                  {categoryFaqs.map(faq => (
                    <Card
                      key={faq.id}
                      className={`bg-zinc-900/40 border-white/5 transition-all ${expandedId === faq.id ? "border-primary/20" : "hover:border-white/10"}`}
                      data-testid={`faq-item-${faq.id}`}
                    >
                      <CardContent className="p-0">
                        <button
                          className="w-full flex items-center justify-between px-5 py-4 text-left"
                          onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                          data-testid={`faq-toggle-${faq.id}`}
                        >
                          <span className="font-medium text-sm pr-4">{faq.question}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFaq(faq);
                                    setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category || "General" });
                                  }}
                                  data-testid={`button-edit-faq-${faq.id}`}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-400 hover:text-red-300"
                                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(faq.id); }}
                                  data-testid={`button-delete-faq-${faq.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            {expandedId === faq.id ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        <AnimatePresence>
                          {expandedId === faq.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-4 border-t border-white/5 pt-3">
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{faq.answer}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAddDialog || !!editingFaq} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); setEditingFaq(null); } }}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Category</Label>
              <Input value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} placeholder="e.g. General, Gameplay, Rules" data-testid="input-faq-category" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Question</Label>
              <Input value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} placeholder="What is the question?" data-testid="input-faq-question" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Answer</Label>
              <textarea
                className="w-full bg-zinc-800 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground min-h-[120px]"
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder="Write the answer..."
                data-testid="textarea-faq-answer"
              />
            </div>
            <Button
              onClick={() => editingFaq ? updateMutation.mutate() : createMutation.mutate()}
              disabled={!faqForm.question.trim() || !faqForm.answer.trim() || createMutation.isPending || updateMutation.isPending}
              className="w-full"
              data-testid="button-save-faq"
            >
              {editingFaq ? "Save Changes" : "Add FAQ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApplicationsSection({ user }: { user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.staffTier === "director" || user?.staffTier === "executive";
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", description: "", key: "" });
  const [managersFormId, setManagersFormId] = useState<string | null>(null);
  const [managersFormTitle, setManagersFormTitle] = useState("");

  const searchParams = new URLSearchParams(window.location.search);
  const deepLinkFormId = searchParams.get("form");

  useEffect(() => {
    if (deepLinkFormId && !selectedFormId) {
      setSelectedFormId(deepLinkFormId);
    }
  }, [deepLinkFormId]);

  const { data: formsData, isLoading } = useQuery({
    queryKey: ["support-forms"],
    queryFn: async () => {
      const res = await fetch("/api/support/forms");
      if (!res.ok) return { forms: [] };
      return res.json() as Promise<{ forms: SupportForm[] }>;
    },
  });

  const createFormMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/support/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newForm),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-forms"] });
      setShowCreateDialog(false);
      setNewForm({ title: "", description: "", key: "" });
      toast({ title: "Form created" });
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/support/forms/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-forms"] });
      toast({ title: "Form deleted" });
    },
  });

  const forms = formsData?.forms || [];
  const selectedForm = forms.find(f => f.id === selectedFormId);

  if (selectedForm) {
    return <FormDetail form={selectedForm} user={user} onBack={() => setSelectedFormId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display" data-testid="text-applications-heading">Applications</h2>
          <p className="text-sm text-muted-foreground mt-1">Browse and submit applications for roles and appeals</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1 bg-orange-500 hover:bg-orange-600 text-black" data-testid="button-create-form">
            <Plus className="w-3 h-3" /> New Form
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : forms.length === 0 ? (
        <Card className="bg-zinc-900/30 border-white/5">
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No application forms available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {forms.map((form, idx) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card
                className={`bg-zinc-900/40 border-white/5 cursor-pointer hover:bg-zinc-800/50 transition-all hover:border-primary/20 group relative ${!form.isOpen ? "opacity-60" : ""}`}
                onClick={() => setSelectedFormId(form.id)}
                data-testid={`form-card-${form.key}`}
              >
                <CardContent className="flex items-center gap-4 py-5 px-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{form.title}</h3>
                      {!form.isOpen && (
                        <Badge variant="outline" className="text-xs border-red-400/30 text-red-400">Closed</Badge>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{form.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => { e.stopPropagation(); setManagersFormId(form.id); setManagersFormTitle(form.title); }}
                        title="Manage form managers"
                        data-testid={`button-form-managers-${form.id}`}
                      >
                        <UserCog className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => { e.stopPropagation(); deleteFormMutation.mutate(form.id); }}
                        data-testid={`button-delete-form-${form.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle>Create New Application Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Title</Label>
              <Input value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="e.g. Mechanic Applications" data-testid="input-form-title" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Key (unique identifier)</Label>
              <Input value={newForm.key} onChange={(e) => setNewForm({ ...newForm, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="e.g. mechanic_apps" data-testid="input-form-key" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <textarea
                className="w-full bg-zinc-800 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground min-h-[80px]"
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                placeholder="Brief description of this form..."
                data-testid="textarea-form-description"
              />
            </div>
            <Button
              onClick={() => createFormMutation.mutate()}
              disabled={!newForm.title.trim() || !newForm.key.trim() || createFormMutation.isPending}
              className="w-full"
              data-testid="button-submit-new-form"
            >
              Create Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {managersFormId && (
        <SupportFormManagersDialog
          formId={managersFormId}
          formTitle={managersFormTitle}
          open={!!managersFormId}
          onOpenChange={(open) => { if (!open) setManagersFormId(null); }}
        />
      )}
    </div>
  );
}

function DiscordSection({ discordUrl }: { discordUrl: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display" data-testid="text-discord-heading">Join Our Discord</h2>
        <p className="text-sm text-muted-foreground mt-1">Connect with the community and stay up to date</p>
      </div>

      <Card className="bg-gradient-to-br from-[#5865F2]/10 to-[#5865F2]/5 border-[#5865F2]/20 overflow-hidden">
        <CardContent className="py-10 px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-20 h-20 rounded-2xl bg-[#5865F2] flex items-center justify-center shrink-0">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2 font-display">Tamaki Makaurau RP</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Join our Discord server to connect with other players, get the latest updates, participate in events, and be part of the community. This is where everything happens!
              </p>
              <div className="flex flex-wrap gap-6 justify-center md:justify-start text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span>Active Community</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>24/7 Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Growing Server</span>
                </div>
              </div>
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-join-discord"
              >
                <Button size="lg" className="gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white">
                  <ExternalLink className="w-4 h-4" /> Join Discord Server
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900/40 border-white/5">
          <CardContent className="py-5 px-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-semibold text-sm mb-1">Chat & Socialise</h4>
            <p className="text-xs text-muted-foreground">Meet other players, share stories, and make friends in the community.</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/40 border-white/5">
          <CardContent className="py-5 px-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-semibold text-sm mb-1">Stay Updated</h4>
            <p className="text-xs text-muted-foreground">Get announcements, changelogs, and important server updates directly.</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/40 border-white/5">
          <CardContent className="py-5 px-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-semibold text-sm mb-1">Events & Roleplay</h4>
            <p className="text-xs text-muted-foreground">Participate in community events, roleplay sessions, and competitions.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ContactSection({ discordUrl }: { discordUrl: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display" data-testid="text-contact-heading">Contact Us</h2>
        <p className="text-sm text-muted-foreground mt-1">Need help? Reach out through our support channels</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-zinc-900/40 border-white/5 hover:border-primary/20 transition-all">
          <CardContent className="py-8 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#5865F2]/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">Discord Tickets</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Open a support ticket in our Discord server for direct assistance from our staff team. This is the fastest way to get help.
            </p>
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" data-testid="link-discord-tickets">
              <Button className="gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white">
                <ExternalLink className="w-4 h-4" /> Open a Ticket
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-white/5 hover:border-primary/20 transition-all">
          <CardContent className="py-8 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Submit an Application</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Looking to join a department, apply for staff, or submit a ban appeal? Head over to the Applications tab to get started.
            </p>
            <Button variant="outline" className="gap-2" disabled>
              <ClipboardList className="w-4 h-4" /> Use the Applications Tab
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardContent className="py-6 px-6">
          <h3 className="font-semibold mb-3">Other Ways to Reach Us</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
              <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">FAQ</p>
                <p className="text-xs text-muted-foreground">Check the FAQ tab for answers to common questions before reaching out.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">In-Game Support</p>
                <p className="text-xs text-muted-foreground">Use /report in-game to contact staff members who are currently online.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const TAB_CONFIG: { key: SupportTab; label: string; icon: React.ReactNode }[] = [
  { key: "faq", label: "FAQ", icon: <HelpCircle className="w-4 h-4" /> },
  { key: "applications", label: "Applications", icon: <FileText className="w-4 h-4" /> },
  { key: "discord", label: "Join Discord", icon: <MessageSquare className="w-4 h-4" /> },
  { key: "contact", label: "Contact Us", icon: <Send className="w-4 h-4" /> },
];

async function fetchSetting(key: string): Promise<string | null> {
  const res = await fetch(`/api/settings/${key}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.value;
}

export default function Support() {
  const { data: user, isLoading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState<SupportTab>("faq");
  const { data: discordInvite } = useQuery({ queryKey: ["setting", "discord_invite"], queryFn: () => fetchSetting("discord_invite") });
  const discordUrl = discordInvite || "https://discord.gg/tamakimakauraurp";

  const searchParams = new URLSearchParams(window.location.search);
  const deepLinkFormId = searchParams.get("form");

  useEffect(() => {
    if (deepLinkFormId) {
      setActiveTab("applications");
    }
  }, [deepLinkFormId]);

  return (
    <div className="min-h-screen bg-background">
      <PageSeo page="support" />
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="pt-28 pb-8 px-6 relative">
          <div className="max-w-5xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black font-display text-primary mb-3"
              data-testid="text-support-title"
            >
              Support Centre
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground max-w-lg mx-auto"
            >
              Find answers, submit applications, and get in touch with our team
            </motion.p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-1 p-1 bg-zinc-900/60 rounded-xl mb-8 overflow-x-auto" data-testid="support-tabs">
            {TAB_CONFIG.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-primary text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "faq" && <FaqSection user={user} />}
              {activeTab === "applications" && <ApplicationsSection user={user} />}
              {activeTab === "discord" && <DiscordSection discordUrl={discordUrl} />}
              {activeTab === "contact" && <ContactSection discordUrl={discordUrl} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
