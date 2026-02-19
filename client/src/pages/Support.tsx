import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, ChevronLeft, Send, Settings, Lock, Unlock, Check, X, Trash2, Plus, ArrowLeft, FileText, Users, Shield, GripVertical } from "lucide-react";
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
                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold">{submission.username?.[0]}</div>
              )}
              <div>
                <CardTitle className="text-lg">{submission.username}'s {form?.title || "Application"}</CardTitle>
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
                <span className="text-sm font-medium">{msg.username}</span>
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

function FormSettings({ form, onClose }: { form: SupportForm; onClose: () => void }) {
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
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeQuestion(i)} data-testid={`button-remove-question-${i}`}>
                  <Trash2 className="w-3 h-3" />
                </Button>
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
                  placeholder="Options (JSON array: [&quot;A&quot;, &quot;B&quot;, &quot;C&quot;])"
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

  const tier = user?.staffTier;
  const hasStaffAccess = tier && ((form.accessTiers || []).includes(tier) || tier === "director" || tier === "executive");
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

  if (view === "settings" && isAdmin) {
    return <FormSettings form={form} onClose={() => setView("list")} />;
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
        <ArrowLeft className="w-4 h-4" /> Back to Support
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
            <Button size="sm" variant="outline" onClick={() => setView("settings")} className="gap-1" data-testid="button-form-settings">
              <Settings className="w-3 h-3" /> Settings
            </Button>
          )}
        </div>
      </div>

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
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">{sub.username?.[0]}</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{sub.username}</p>
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

export default function Support() {
  const { data: user, isLoading: userLoading } = useUser();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

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

  const forms = formsData?.forms || [];
  const selectedForm = forms.find(f => f.id === selectedFormId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {selectedForm ? (
            <FormDetail form={selectedForm} user={user} onBack={() => setSelectedFormId(null)} />
          ) : (
            <>
              <motion.header
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <h1 className="text-3xl font-black text-primary mb-2" data-testid="text-support-title">Support</h1>
                <p className="text-muted-foreground">Browse available applications and submit your requests below.</p>
              </motion.header>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {forms.map(form => (
                    <motion.div
                      key={form.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: forms.indexOf(form) * 0.05 }}
                    >
                      <Card
                        className={`bg-zinc-900/40 border-white/5 cursor-pointer hover:bg-zinc-800/50 transition-all hover:border-primary/20 ${!form.isOpen ? "opacity-60" : ""}`}
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
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
