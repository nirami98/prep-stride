import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetInterview, useGetFeedback, getGetInterviewQueryKey, getGetFeedbackQueryKey } from "@workspace/api-client-react";
import { Loader2, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function InterviewResultPage({ id }: { id: string }) {
  const [, setLocation] = useLocation();

  const { data: session, isLoading: sessionLoading, error: sessionError } = useGetInterview(id, { 
    query: { enabled: !!id, queryKey: getGetInterviewQueryKey(id) } 
  });
  
  const { data: feedback, isLoading: feedbackLoading, error: feedbackError } = useGetFeedback(id, { 
    query: { 
      // Only fetch feedback if session is completed
      enabled: !!id && !!session && session.status === 'completed', 
      queryKey: getGetFeedbackQueryKey(id),
      retry: 3, // Feedback might take a moment to be available after generation
    } 
  });

  const isLoading = sessionLoading || (session?.status === 'completed' && feedbackLoading);
  
  if (session?.status === 'active') {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Session Incomplete</h2>
          <p className="text-muted-foreground mb-8">This interview hasn't been completed yet, so no results are available.</p>
          <Button onClick={() => setLocation(`/interview/session/${id}`)}>
            Continue Interview
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto text-center space-y-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <h2 className="text-2xl font-bold font-display">Loading Results...</h2>
          <p className="text-muted-foreground">Retrieving your personalized performance analysis.</p>
        </div>
      </AppLayout>
    );
  }

  if (sessionError || feedbackError) {
    return (
      <AppLayout>
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-12">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load interview results. Please try again later.</AlertDescription>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!session || !feedback) return null;

  const scoreColor = 
    feedback.score >= 80 ? "text-green-600" : 
    feedback.score >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-8">
        
        {/* Navigation & Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mb-4 gap-2 -ml-4 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight font-display">{session.jobRole}</h1>
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {session.difficulty}
                </span>
              </div>
              <p className="text-muted-foreground">
                Completed on {format(new Date(session.endedAt || session.startedAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Main Score Card */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-1 bg-primary text-primary-foreground border-none overflow-hidden relative shadow-lg">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <TrendingUp className="w-32 h-32" />
            </div>
            <CardHeader className="relative z-10 pb-0">
              <CardTitle className="text-primary-foreground/80 font-medium">Overall Score</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pt-4 flex flex-col justify-between h-[calc(100%-4rem)]">
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-bold font-display">{Math.round(feedback.score)}</span>
                <span className="text-xl font-medium text-primary-foreground/60">/ 100</span>
              </div>
              <div className="mt-8 text-sm font-medium bg-primary-foreground/10 px-4 py-2 rounded-lg inline-block w-fit backdrop-blur-sm">
                {feedback.score >= 80 ? "Strong Performance" : feedback.score >= 60 ? "Average Performance" : "Needs Improvement"}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed text-muted-foreground">{feedback.summary}</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Feedback Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-t-4 border-t-green-500 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {feedback.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">{i+1}</span>
                    <span className="leading-relaxed">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-red-500 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {feedback.weaknesses.map((weakness, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">{i+1}</span>
                    <span className="leading-relaxed">{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle>Competency scores</CardTitle>
            <CardDescription>{feedback.methodology}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {feedback.categoryScores.map((category) => (
              <div key={category.category} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4 text-sm font-medium">
                  <span>{category.category}</span><span>{Math.round(category.score)}/100</span>
                </div>
                <Progress className="mt-3 h-2" value={category.score} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm mb-12 bg-secondary/30 border-dashed">
          <CardHeader>
            <CardTitle>Actionable Suggestions</CardTitle>
            <CardDescription>Concrete steps to improve your performance for the real interview.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid sm:grid-cols-2 gap-4">
              {feedback.suggestions.map((suggestion, i) => (
                <li key={i} className="bg-background border rounded-xl p-4 flex items-start gap-3 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></div>
                  <span className="text-sm font-medium leading-relaxed">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Q&A Review */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-6 font-display">Question & Answer Review</h2>
          <Card className="shadow-sm">
            <Accordion type="multiple" className="w-full">
              {session.answers?.map((answer, index) => (
                <AccordionItem key={answer.id} value={answer.id} className="border-b last:border-0">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4 text-left">
                      <span className="font-mono text-sm text-muted-foreground mt-1 w-6 shrink-0">Q{index + 1}</span>
                      <span className="font-semibold text-base leading-snug pr-4">{answer.question?.content}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="pl-10">
                      {(() => {
                        const assessment = feedback.answerBreakdown.find((item) => item.questionId === answer.questionId);
                        return assessment ? <div className="mb-5 space-y-4 rounded-xl border bg-background p-5">
                          <div className="flex items-center justify-between"><strong>Answer assessment</strong><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{Math.round(assessment.score)}/100</span></div>
                          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">{Object.entries(assessment.dimensionScores).map(([name, score]) => <div key={name} className="rounded bg-muted p-2 text-center"><div className="capitalize text-muted-foreground">{name}</div><strong>{Math.round(score)}</strong></div>)}</div>
                          {!!assessment.evidence.length && <div><div className="text-sm font-semibold text-green-700">Evidence credited</div><ul className="list-disc pl-5 text-sm">{assessment.evidence.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                          {!!assessment.missedSignals.length && <div><div className="text-sm font-semibold text-amber-700">Missing or weak signals</div><ul className="list-disc pl-5 text-sm">{assessment.missedSignals.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                          <div><div className="text-sm font-semibold">A stronger answer</div><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{assessment.improvedAnswer}</p></div>
                        </div> : null;
                      })()}
                      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        <HelpCircle className="w-3.5 h-3.5" /> Your Response
                      </div>
                      <div className="bg-muted/50 rounded-xl p-5 border text-base leading-relaxed text-foreground whitespace-pre-wrap">
                        {answer.response}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
}
