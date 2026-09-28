import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useGetAnalyticsHistory,
  useGetFeedback,
  useGetInterview,
  getGetFeedbackQueryKey,
  getGetInterviewQueryKey,
} from "@workspace/api-client-react";
import type { HistoryItem } from "@workspace/api-client-react";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={10}
        className="text-secondary"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

function ScoreDisplay({ score, label }: { score: number; label?: string }) {
  const color =
    score >= 80
      ? "text-green-600"
      : score >= 60
      ? "text-amber-500"
      : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center">
        <ScoreRing score={score} size={112} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold font-display ${color}`}>
            {Math.round(score)}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      {label && (
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0)
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <Minus className="w-4 h-4" /> No change
      </span>
    );
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-bold ${
        positive ? "text-green-600" : "text-red-500"
      }`}
    >
      {positive ? (
        <TrendingUp className="w-4 h-4" />
      ) : (
        <TrendingDown className="w-4 h-4" />
      )}
      {positive ? "+" : ""}
      {delta} pts
    </span>
  );
}

function SessionSelector({
  label,
  sessions,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  sessions: HistoryItem[];
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
}) {
  const completed = sessions.filter(
    (s) => s.status === "completed" && s.id !== excludeId
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 font-medium">
          <SelectValue placeholder="Choose a session..." />
        </SelectTrigger>
        <SelectContent>
          {completed.length === 0 && (
            <SelectItem value="__empty" disabled>
              No completed sessions
            </SelectItem>
          )}
          {completed.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="flex items-center gap-2">
                <span className="font-medium">{s.jobRole}</span>
                <span className="text-muted-foreground text-xs">
                  {s.difficulty} &middot;{" "}
                  {format(new Date(s.startedAt), "MMM d, yyyy")}
                  {s.score != null ? ` · ${Math.round(s.score)}pts` : ""}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ListSection({
  title,
  icon,
  items,
  colorClass,
  borderClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  colorClass: string;
  borderClass: string;
}) {
  return (
    <Card className={`border-t-4 ${borderClass} shadow-sm h-full`}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-base flex items-center gap-2 ${colorClass}`}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">None recorded.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <span
                  className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    colorClass.includes("green")
                      ? "bg-green-100 text-green-700"
                      : colorClass.includes("red")
                      ? "bg-red-100 text-red-600"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SessionColumn({
  sessionId,
  label,
}: {
  sessionId: string;
  label: "Session A" | "Session B";
}) {
  const { data: session, isLoading: sessionLoading } = useGetInterview(
    sessionId,
    { query: { enabled: !!sessionId, queryKey: getGetInterviewQueryKey(sessionId) } }
  );
  const { data: feedback, isLoading: feedbackLoading } = useGetFeedback(
    sessionId,
    {
      query: {
        enabled: !!sessionId && !!session && session.status === "completed",
        queryKey: getGetFeedbackQueryKey(sessionId),
      },
    }
  );

  const isLoading = sessionLoading || feedbackLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!session || !feedback) return null;

  const difficultyColors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    hard: "bg-red-100 text-red-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-5"
    >
      {/* Session meta */}
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col items-center text-center gap-3">
            <ScoreDisplay score={feedback.score} label={label} />
            <div>
              <h3 className="font-bold text-lg leading-tight">{session.jobRole}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(
                  new Date(session.endedAt || session.startedAt),
                  "MMMM d, yyyy"
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge
                className={`text-xs font-semibold capitalize ${
                  difficultyColors[session.difficulty] ?? ""
                } border-0`}
                variant="secondary"
              >
                {session.difficulty}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium">
                {session.questionCount} questions
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">
            {feedback.summary}
          </p>
        </CardContent>
      </Card>

      <ListSection
        title="Strengths"
        icon={<CheckCircle2 className="w-4 h-4" />}
        items={feedback.strengths}
        colorClass="text-green-600"
        borderClass="border-t-green-500"
      />
      <ListSection
        title="Areas for Improvement"
        icon={<AlertCircle className="w-4 h-4" />}
        items={feedback.weaknesses}
        colorClass="text-red-500"
        borderClass="border-t-red-500"
      />
      <ListSection
        title="Suggestions"
        icon={<Lightbulb className="w-4 h-4" />}
        items={feedback.suggestions}
        colorClass="text-blue-600"
        borderClass="border-t-blue-500"
      />
    </motion.div>
  );
}

export default function ComparePage() {
  const [, setLocation] = useLocation();
  const [sessionAId, setSessionAId] = useState("");
  const [sessionBId, setSessionBId] = useState("");

  const { data: history, isLoading: historyLoading } = useGetAnalyticsHistory();

  const { data: feedbackA } = useGetFeedback(sessionAId, {
    query: {
      enabled: !!sessionAId,
      queryKey: getGetFeedbackQueryKey(sessionAId),
    },
  });
  const { data: feedbackB } = useGetFeedback(sessionBId, {
    query: {
      enabled: !!sessionBId,
      queryKey: getGetFeedbackQueryKey(sessionBId),
    },
  });

  const canCompare = !!sessionAId && !!sessionBId;
  const delta =
    feedbackA && feedbackB
      ? Math.round(feedbackB.score) - Math.round(feedbackA.score)
      : null;

  const sessions: HistoryItem[] = history ?? [];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="mb-4 gap-2 -ml-4 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight font-display mb-1">
            Compare Sessions
          </h1>
          <p className="text-muted-foreground">
            Select two completed interviews to view a detailed side-by-side breakdown.
          </p>
        </div>

        {/* Selectors */}
        <Card className="mb-8 shadow-sm">
          <CardContent className="pt-6">
            {historyLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : sessions.filter((s) => s.status === "completed").length < 2 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Not enough sessions yet
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    You need at least two completed interviews to compare.
                    Complete another session and come back.
                  </p>
                </div>
                <Button
                  onClick={() => setLocation("/interview/start")}
                  className="gap-2"
                >
                  Start an Interview <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                <SessionSelector
                  label="Session A (baseline)"
                  sessions={sessions}
                  value={sessionAId}
                  onChange={setSessionAId}
                  excludeId={sessionBId}
                />
                <div className="flex items-center justify-center pb-1.5">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground text-sm font-bold">
                    vs
                  </div>
                </div>
                <SessionSelector
                  label="Session B (comparison)"
                  sessions={sessions}
                  value={sessionBId}
                  onChange={setSessionBId}
                  excludeId={sessionAId}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delta banner */}
        {canCompare && delta !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card
              className={`border-2 shadow-sm ${
                delta > 0
                  ? "border-green-200 bg-green-50"
                  : delta < 0
                  ? "border-red-200 bg-red-50"
                  : "border-secondary bg-secondary/40"
              }`}
            >
              <CardContent className="flex items-center justify-center gap-4 py-5">
                <span className="text-sm font-semibold text-muted-foreground">
                  Score change from A to B:
                </span>
                <DeltaBadge delta={delta} />
                {delta > 0 && (
                  <span className="text-sm text-green-700 font-medium">
                    Great improvement — keep it up.
                  </span>
                )}
                {delta < 0 && (
                  <span className="text-sm text-red-600 font-medium">
                    Review the suggestions from Session A.
                  </span>
                )}
                {delta === 0 && (
                  <span className="text-sm text-muted-foreground font-medium">
                    Consistent performance across both sessions.
                  </span>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Side-by-side columns */}
        {canCompare && (
          <>
            <div className="grid grid-cols-[1fr_1px_1fr] gap-6 items-start">
              <SessionColumn sessionId={sessionAId} label="Session A" />
              <Separator orientation="vertical" className="h-full" />
              <SessionColumn sessionId={sessionBId} label="Session B" />
            </div>
          </>
        )}

        {!canCompare && !historyLoading && sessions.filter((s) => s.status === "completed").length >= 2 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              Select two sessions above to see a detailed comparison.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
