import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAnalyticsOverviewQueryKey,
  getListInterviewsQueryKey,
  useCreateInterview,
  type CreateInterviewBody,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { toDocumentUpload } from "@/lib/document-upload";

const inputClass = "h-11";

export default function StartInterviewPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createInterview = useCreateInterview();
  const [error, setError] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [form, setForm] = useState<CreateInterviewBody>({
    jobRole: "", companyName: "", difficulty: "medium", experienceLevel: "mid",
    questionCount: 5, interviewRounds: 3, roundDetails: "", jobDescription: "",
  });

  const update = (key: keyof CreateInterviewBody, value: unknown) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (form.jobRole.trim().length < 2) return setError("Enter a target role.");
    try {
      const data = {
        ...form,
        resumeFile: await toDocumentUpload(resume),
        jobDescriptionFile: await toDocumentUpload(jobFile),
      };
      createInterview.mutate({ data }, {
        onSuccess(session) {
          queryClient.invalidateQueries({ queryKey: getListInterviewsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAnalyticsOverviewQueryKey() });
          setLocation(`/interview/session/${session.id}`);
        },
        onError(err) { setError(err instanceof Error ? err.message : "Could not create interview."); },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the uploaded file.");
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl py-6">
        <h1 className="text-3xl font-bold tracking-tight">Build a personalized interview</h1>
        <p className="mt-2 text-muted-foreground">PrepStride creates fresh questions and a study plan from the role, company, and documents you provide.</p>
        <Card className="mt-8">
          <CardHeader><CardTitle>Interview context</CardTitle><CardDescription>Resume and job description are optional. Uploaded originals are sent for this generation and are not stored by PrepStride.</CardDescription></CardHeader>
          <form onSubmit={submit}>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="role">Target role *</Label><Input id="role" className={inputClass} value={form.jobRole} onChange={(e) => update("jobRole", e.target.value)} placeholder="Senior Frontend Engineer" /></div>
              <div className="space-y-2"><Label htmlFor="company">Company (optional)</Label><Input id="company" className={inputClass} value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Acme" /></div>
              <div className="space-y-2"><Label htmlFor="experience">Experience level</Label><select id="experience" className="w-full rounded-md border bg-background px-3 h-11" value={form.experienceLevel} onChange={(e) => update("experienceLevel", e.target.value)}><option value="entry">Entry</option><option value="mid">Mid-level</option><option value="senior">Senior</option><option value="lead">Lead</option></select></div>
              <div className="space-y-2"><Label htmlFor="difficulty">Difficulty</Label><select id="difficulty" className="w-full rounded-md border bg-background px-3 h-11" value={form.difficulty} onChange={(e) => update("difficulty", e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
              <div className="space-y-2"><Label htmlFor="questions">Questions</Label><Input id="questions" type="number" min={1} max={10} value={form.questionCount} onChange={(e) => update("questionCount", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label htmlFor="rounds">Expected interview rounds</Label><Input id="rounds" type="number" min={1} max={8} value={form.interviewRounds} onChange={(e) => update("interviewRounds", Number(e.target.value))} /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="roundDetails">Known round details (optional)</Label><Textarea id="roundDetails" value={form.roundDetails} onChange={(e) => update("roundDetails", e.target.value)} placeholder="Recruiter screen, coding round, system design, hiring manager… Leave blank and we’ll research likely stages when a company is supplied." /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="jd">Job description text (optional)</Label><Textarea id="jd" className="min-h-36" value={form.jobDescription} onChange={(e) => update("jobDescription", e.target.value)} placeholder="Paste the job description here…" /></div>
              <div className="space-y-2"><Label htmlFor="jdFile">Or upload job description</Label><Input id="jdFile" type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={(e) => setJobFile(e.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT or MD · max 10 MB</p></div>
              <div className="space-y-2"><Label htmlFor="resume">Resume (optional)</Label><Input id="resume" type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={(e) => setResume(e.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">Used to personalize depth and identify preparation gaps.</p></div>
              {error && <p className="md:col-span-2 text-sm text-destructive" role="alert">{error}</p>}
            </CardContent>
            <CardFooter className="justify-end border-t bg-muted/20 py-5"><Button type="submit" size="lg" disabled={createInterview.isPending}>{createInterview.isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Generating personalized interview…</> : <><Sparkles className="mr-2 size-4" />Generate interview</>}</Button></CardFooter>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
