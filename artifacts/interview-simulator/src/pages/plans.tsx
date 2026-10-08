import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateInterviewPlan, useListInterviewPlans, getListInterviewPlansQueryKey, type InterviewPlan } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Map, ExternalLink } from "lucide-react";

export default function PlansPage() {
  const queryClient = useQueryClient();
  const plans = useListInterviewPlans();
  const create = useCreateInterviewPlan();
  const [selected, setSelected] = useState<InterviewPlan>();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ jobRole: "", companyName: "", experienceLevel: "mid" as const, interviewRounds: 3, roundDetails: "", jobDescription: "", difficulty: "medium" as const });

  function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (form.jobRole.trim().length < 2) return setError("Enter a target role.");
    create.mutate({ data: form }, { onSuccess(plan) { setSelected(plan); queryClient.invalidateQueries({ queryKey: getListInterviewPlansQueryKey() }); }, onError(err) { setError(err instanceof Error ? err.message : "Could not generate plan."); } });
  }
  const visible = selected ?? plans.data?.[0];
  return <AppLayout><div className="mx-auto max-w-5xl space-y-8 py-6">
    <div><h1 className="flex items-center gap-3 text-3xl font-bold"><Map className="size-8" />Interview plan corner</h1><p className="mt-2 text-muted-foreground">Create a role-specific preparation roadmap. If round details are unknown, PrepStride researches the likely process and cites its sources.</p></div>
    <Card><CardHeader><CardTitle>Generate a study plan</CardTitle><CardDescription>Give as much context as you have; every field except role and round count is optional.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
      <div className="space-y-2"><Label>Target role *</Label><Input value={form.jobRole} onChange={(e) => setForm({ ...form, jobRole: e.target.value })} /></div>
      <div className="space-y-2"><Label>Company</Label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
      <div className="space-y-2"><Label>Experience</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value as any })}><option value="entry">Entry</option><option value="mid">Mid-level</option><option value="senior">Senior</option><option value="lead">Lead</option></select></div>
      <div className="space-y-2"><Label>Number of rounds</Label><Input type="number" min={1} max={8} value={form.interviewRounds} onChange={(e) => setForm({ ...form, interviewRounds: Number(e.target.value) })} /></div>
      <div className="space-y-2 md:col-span-2"><Label>Known rounds</Label><Textarea value={form.roundDetails} onChange={(e) => setForm({ ...form, roundDetails: e.target.value })} placeholder="Leave blank to research likely stages" /></div>
      <div className="space-y-2 md:col-span-2"><Label>Job description</Label><Textarea value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} /></div>
      {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
      <Button className="md:col-span-2" disabled={create.isPending}>{create.isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Researching and building your plan…</> : "Generate plan"}</Button>
    </form></CardContent></Card>
    {visible && <PlanView plan={visible} />}
    {!!plans.data?.length && <div><h2 className="mb-3 text-xl font-semibold">Previous plans</h2><div className="grid gap-3 md:grid-cols-2">{plans.data.map((plan) => <button key={plan.id} onClick={() => setSelected(plan)} className="rounded-lg border p-4 text-left hover:bg-muted"><strong>{plan.jobRole}</strong><div className="text-sm text-muted-foreground">{plan.companyName || "General"} · {plan.interviewRounds} rounds</div></button>)}</div></div>}
  </div></AppLayout>;
}

function PlanView({ plan }: { plan: InterviewPlan }) {
  return <Card><CardHeader><CardTitle>{plan.jobRole}{plan.companyName ? ` at ${plan.companyName}` : ""}</CardTitle><CardDescription>{plan.roleSummary}</CardDescription></CardHeader><CardContent className="space-y-7">
    {plan.researchSummary && <div><h3 className="font-semibold">Process research</h3><p className="mt-1 text-sm text-muted-foreground">{plan.researchSummary}</p></div>}
    <div className="grid gap-4 md:grid-cols-2">{plan.rounds.map((round, i) => <div key={`${round.name}-${i}`} className="rounded-lg border p-4"><h3 className="font-semibold">{i + 1}. {round.name}</h3><p className="mt-1 text-sm text-muted-foreground">{round.purpose}</p><ul className="mt-3 list-disc pl-5 text-sm">{round.focusAreas.map((area) => <li key={area}>{area}</li>)}</ul></div>)}</div>
    <div><h3 className="mb-3 font-semibold">Daily roadmap</h3><div className="space-y-3">{plan.schedule.map((day) => <div key={day.day} className="rounded-lg bg-muted/50 p-4"><strong>Day {day.day}: {day.title}</strong><ul className="mt-2 list-disc pl-5 text-sm">{day.tasks.map((task) => <li key={task}>{task}</li>)}</ul></div>)}</div></div>
    {!!plan.sources.length && <div><h3 className="font-semibold">Sources</h3><ul className="mt-2 space-y-1 text-sm">{plan.sources.map((source) => <li key={source.url}><a className="inline-flex items-center gap-1 text-primary underline" href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink className="size-3" /></a></li>)}</ul></div>}
  </CardContent></Card>;
}
