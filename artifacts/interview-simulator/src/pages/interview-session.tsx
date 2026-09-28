import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  useGetInterview, 
  useGetNextQuestion, 
  useSubmitAnswer, 
  useEndInterview, 
  useGenerateFeedback, 
  useTranscribeAnswer,
  getGetNextQuestionQueryKey,
  getGetInterviewQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, Square, Loader2, RefreshCw, AlertCircle, ChevronRight, Clock3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const DURATION_BY_DIFFICULTY = {
  easy: 120,
  medium: 90,
  hard: 75,
} as const;

export default function InterviewSessionPage({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [response, setResponse] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const { data: session, isLoading: sessionLoading, error: sessionError } = useGetInterview(id, {
    query: { enabled: !!id, queryKey: getGetInterviewQueryKey(id) }
  });

  const { data: nextQuestion, isLoading: questionLoading, isFetching: questionFetching, error: questionError, refetch: refetchQuestion } = useGetNextQuestion(id, {
    query: { enabled: !!id && !!session && session.status === 'active', queryKey: getGetNextQuestionQueryKey(id) }
  });

  const submitAnswer = useSubmitAnswer();
  const endInterview = useEndInterview();
  const generateFeedback = useGenerateFeedback();
  const transcribeMutation = useTranscribeAnswer();

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (session?.status === 'completed' && !isFinishing) {
      setLocation(`/interview/result/${id}`);
    }
  }, [session, id, setLocation, isFinishing]);

  useEffect(() => {
    if (session && session.status === 'active' && !questionLoading && !questionFetching && !nextQuestion && !questionError) {
      handleFinishSession();
    }
  }, [session, questionLoading, questionFetching, nextQuestion, questionError]);

  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const seconds = DURATION_BY_DIFFICULTY[session.difficulty as keyof typeof DURATION_BY_DIFFICULTY] ?? 90;
    setTimeLeft(seconds);
  }, [session?.id, session?.difficulty, session?.status]);

  useEffect(() => {
    if (timeLeft == null || isFinishing || !session || session.status !== 'active') return;
    if (timeLeft <= 0) {
      handleFinishSession();
      return;
    }
    timerRef.current = window.setTimeout(() => setTimeLeft((current) => (current == null ? current : current - 1)), 1000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [timeLeft, isFinishing, session?.status]);

  const handleFinishSession = async () => {
    if (isFinishing) return;
    setIsFinishing(true);

    try {
      await endInterview.mutateAsync({ id });
      await generateFeedback.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetInterviewQueryKey(id) });
      setLocation(`/interview/result/${id}`);
    } catch (err) {
      console.error("Failed to finish session", err);
      toast({
        title: "Error completing session",
        description: "There was a problem finalizing your interview. Please try again.",
        variant: "destructive"
      });
      setIsFinishing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice recording.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    return new Promise<Blob>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return;

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        resolve(blob);
      };
      recorder.stop();
      recorder.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    });
  };

  const handleStopAndTranscribe = async () => {
    const blob = await stopRecording();
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      transcribeMutation.mutate({ id, data: { audioBase64: base64, mimeType: blob.type } }, {
        onSuccess: (data) => {
          setResponse((prev) => prev ? `${prev} ${data.transcript}` : data.transcript);
        },
        onError: () => {
          toast({
            title: "Transcription failed",
            description: "Could not transcribe audio. Please type your answer instead.",
            variant: "destructive"
          });
        }
      });
    };
    reader.readAsDataURL(blob);
  };

  const handleSubmitAnswer = () => {
    if (!nextQuestion || !response.trim()) return;

    submitAnswer.mutate({ id, data: { questionId: nextQuestion.id, response } }, {
      onSuccess: () => {
        setResponse("");
        queryClient.invalidateQueries({ queryKey: getGetInterviewQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetNextQuestionQueryKey(id) });
        refetchQuestion();
      },
      onError: () => {
        toast({
          title: "Failed to submit",
          description: "There was a problem submitting your answer. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const preventPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    toast({
      title: "Paste disabled",
      description: "Typing your answer directly helps simulate a real interview.",
    });
  };

  if (sessionError) {
    return (
      <AppLayout>
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-12">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load the interview session.</AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  if (sessionLoading || !session) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-8">
          <Skeleton className="h-4 w-32 mb-8" />
          <Card className="p-8">
            <Skeleton className="h-8 w-3/4 mb-12" />
            <Skeleton className="h-64 w-full mb-6" />
            <div className="flex justify-between">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-32" />
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isFinishing) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <h2 className="text-3xl font-bold font-display tracking-tight">Analyzing Performance</h2>
          <p className="text-muted-foreground text-lg">
            Compiling your answers and generating personalized feedback. This usually takes 15-30 seconds.
          </p>
          <Progress value={undefined} className="w-full h-2" />
        </div>
      </AppLayout>
    );
  }

  const answeredCount = session.answers?.length || 0;
  const totalCount = session.questionCount;
  const progressPercent = Math.min(100, Math.round((answeredCount / totalCount) * 100));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-4 md:py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center text-primary font-bold">
                {answeredCount + 1 > totalCount ? totalCount : answeredCount + 1}
              </div>
              <span className="font-semibold text-muted-foreground">of {totalCount} Questions</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-secondary rounded-md cursor-default">
                <Clock3 className="w-4 h-4" />
                {Math.max(0, timeLeft ?? 0)}s left
              </span>
              <div className="text-sm font-mono font-medium text-muted-foreground px-3 py-1 bg-secondary rounded-md cursor-default">
                {session.jobRole}
              </div>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <Card className="border-2 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-6 md:p-10 bg-secondary/20 flex-1 border-b relative">
            {questionLoading || questionFetching ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-5/6" />
                <Skeleton className="h-8 w-4/6" />
              </div>
            ) : questionError ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <h3 className="text-xl font-semibold mb-2">Error loading question</h3>
                <Button variant="outline" onClick={() => refetchQuestion()} className="mt-4 cursor-pointer">
                  <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
              </div>
            ) : nextQuestion ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary mb-6 uppercase tracking-wider cursor-default">
                  {nextQuestion.category}
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-medium leading-tight select-none">
                  {nextQuestion.content}
                </h2>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-8 h-8">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">All questions answered!</h3>
                <p className="text-muted-foreground mb-8">Ready to see how you did?</p>
                <Button size="lg" onClick={handleFinishSession} className="px-8 cursor-pointer">
                  Generate Results
                </Button>
              </div>
            )}
          </div>

          {(nextQuestion != null) && (
            <div className="p-6 bg-background flex flex-col gap-4">
              <div className="relative">
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  onPaste={preventPaste}
                  onDrop={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  placeholder="Type your answer here, or use the microphone to record..."
                  className="min-h-[160px] text-base resize-none p-4 pb-16 focus-visible:ring-primary/50 cursor-text"
                  disabled={isRecording || transcribeMutation.isPending || submitAnswer.isPending}
                />

                {isRecording && (
                  <div className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-md border-2 border-red-500/50 flex flex-col items-center justify-center text-center animate-in fade-in cursor-default">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <div className="w-6 h-6 bg-red-600 rounded-full animate-ping"></div>
                    </div>
                    <div className="font-semibold text-lg text-red-600 mb-1">Recording your response...</div>
                    <div className="text-muted-foreground text-sm">Speak clearly into your microphone</div>
                  </div>
                )}

                {transcribeMutation.isPending && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-md flex flex-col items-center justify-center text-center cursor-default">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                    <div className="font-medium">Transcribing audio...</div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="w-full sm:w-auto">
                  {isRecording ? (
                    <Button 
                      variant="destructive" 
                      onClick={handleStopAndTranscribe}
                      className="w-full sm:w-auto gap-2 font-semibold cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Stop Recording
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={startRecording}
                      disabled={transcribeMutation.isPending || submitAnswer.isPending}
                      className="w-full sm:w-auto gap-2 text-primary hover:text-primary hover:bg-primary/10 border-primary/20 cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      Use Microphone
                    </Button>
                  )}
                </div>

                <Button 
                  onClick={handleSubmitAnswer}
                  disabled={!response.trim() || isRecording || transcribeMutation.isPending || submitAnswer.isPending}
                  className="w-full sm:w-auto gap-2 font-semibold px-8 cursor-pointer"
                  size="lg"
                >
                  {submitAnswer.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {answeredCount + 1 === totalCount ? "Finish Interview" : "Submit Answer"}
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
