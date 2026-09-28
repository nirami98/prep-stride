import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetAnalyticsOverview } from "@workspace/api-client-react";
import { format } from "date-fns";
import { PlayCircle, Target, Trophy, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function ScoreTrendChart({
  scores,
}: {
  scores: Array<{ label: string; score: number }>;
}) {
  if (scores.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
        No completed sessions yet.
      </div>
    );
  }

  const width = 720;
  const height = 260;
  const paddingX = 32;
  const paddingY = 24;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const step = scores.length > 1 ? innerWidth / (scores.length - 1) : innerWidth / 2;
  const points = scores.map((item, index) => {
    const x = paddingX + (scores.length === 1 ? innerWidth / 2 : index * step);
    const y = paddingY + (1 - item.score / 100) * innerHeight;
    return { ...item, x, y };
  });
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="font-display">Score Trend</CardTitle>
        <CardDescription>Completed sessions over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full min-w-[640px]">
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = paddingY + (1 - tick / 100) * innerHeight;
              return (
                <g key={tick}>
                  <line x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" />
                  <text x={10} y={y + 4} className="fill-muted-foreground text-[11px] font-medium">{tick}</text>
                </g>
              );
            })}

            <path d={linePath} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
            {points.map((point) => (
              <g key={`${point.label}-${point.x}`}>
                <circle cx={point.x} cy={point.y} r="5" className="fill-background stroke-primary stroke-2" />
                <circle cx={point.x} cy={point.y} r="10" className="fill-primary/10" />
                <text
                  x={point.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px] font-medium"
                >
                  {point.label}
                </text>
                <text
                  x={point.x}
                  y={point.y - 14}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-semibold"
                >
                  {Math.round(point.score)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: analytics, isLoading, error } = useGetAnalyticsOverview();
  const trend =
    analytics?.recentActivity
      ?.filter((session) => session.status === "completed" && session.score != null)
      .slice()
      .reverse()
      .map((session) => ({
        label: format(new Date(session.startedAt), "MMM d"),
        score: Number(session.score),
      })) ?? [];

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4">
            <Target className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Could not load dashboard</h2>
          <p className="text-muted-foreground mb-6">There was an error loading your analytics.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 font-display">Dashboard</h1>
            <p className="text-muted-foreground">Your performance metrics and recent sessions.</p>
          </div>
          <Link href="/interview/start">
            <Button size="lg" className="font-semibold gap-2">
              <PlayCircle className="w-5 h-5" />
              New Interview
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-1/3 mb-1" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Score</CardTitle>
                  <Target className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{analytics.averageScore ? Math.round(analytics.averageScore) : '--'}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all difficulty levels</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Best Score</CardTitle>
                  <Trophy className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{analytics.bestScore ? Math.round(analytics.bestScore) : '--'}</div>
                  <p className="text-xs text-muted-foreground mt-1">Highest performance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                  <CheckCircleIcon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{analytics.completedSessions}</div>
                  <p className="text-xs text-muted-foreground mt-1">Out of {analytics.totalSessions} total sessions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-display truncate mt-1">{analytics.topCategory || '--'}</div>
                  <p className="text-xs text-muted-foreground mt-2">Strongest performance area</p>
                </CardContent>
              </Card>
            </div>

            <ScoreTrendChart scores={trend} />
          </>
        ) : null}

        <div className="mt-4">
          <h2 className="text-xl font-bold mb-4 font-display">Recent Activity</h2>
          <Card>
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
              <div className="divide-y">
                {analytics.recentActivity.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-6">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-lg">{session.jobRole}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase
                          ${session.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            session.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {session.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(session.startedAt), 'MMM d, yyyy h:mm a')}
                        </span>
                        <span>{session.questionCount} Questions</span>
                      </div>
                    </div>
                    <div>
                      {session.status === 'completed' && session.score != null ? (
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold font-display">{Math.round(session.score)}</div>
                            <div className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Score</div>
                          </div>
                          <Link href={`/interview/result/${session.id}`}>
                            <Button variant="outline" size="sm">Review</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">In Progress</div>
                          <Link href={`/interview/session/${session.id}`}>
                            <Button size="sm">Continue</Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                  <PlayCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No interviews yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">You haven't completed any mock interviews. Start a session to see your analytics here.</p>
                <Link href="/interview/start">
                  <Button>Start First Interview</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function CheckCircleIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
