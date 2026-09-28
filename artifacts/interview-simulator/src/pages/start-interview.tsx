import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useCreateInterview, getGetAnalyticsOverviewQueryKey, getListInterviewsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, BrainCircuit, Play, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  jobRole: z.string().min(2, "Job role must be at least 2 characters").max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionCount: z.number().min(1).max(10),
});

type FormValues = z.infer<typeof formSchema>;

export default function StartInterviewPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createInterview = useCreateInterview();

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      jobRole: "",
      difficulty: "medium",
      questionCount: 5,
    },
  });

  const onSubmit = (data: FormValues) => {
    createInterview.mutate({ data }, {
      onSuccess: (session) => {
        queryClient.invalidateQueries({ queryKey: getListInterviewsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnalyticsOverviewQueryKey() });
        setLocation(`/interview/session/${session.id}`);
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-display">Configure Session</h1>
          <p className="text-muted-foreground">Set up your mock interview environment to match your goals.</p>
        </div>

        <Card className="border-2 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-8 pt-8">
                
                <FormField
                  control={form.control}
                  name="jobRole"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        <FormLabel className="text-base font-semibold">Target Role</FormLabel>
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Senior Frontend Engineer, Product Manager" 
                          className="h-12 text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="h-px bg-border w-full"></div>

                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BrainCircuit className="w-5 h-5 text-primary" />
                        <FormLabel className="text-base font-semibold">Difficulty Level</FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 md:grid-cols-3 gap-4"
                        >
                          <div>
                            <RadioGroupItem value="easy" id="easy" className="peer sr-only" />
                            <Label
                              htmlFor="easy"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-muted/50 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                            >
                              <span className="font-semibold text-lg mb-1">Easy</span>
                              <span className="text-xs text-muted-foreground text-center font-normal">Core concepts and straightforward questions</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="medium" id="medium" className="peer sr-only" />
                            <Label
                              htmlFor="medium"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-muted/50 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                            >
                              <span className="font-semibold text-lg mb-1">Medium</span>
                              <span className="text-xs text-muted-foreground text-center font-normal">Complex scenarios and moderate problem-solving</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="hard" id="hard" className="peer sr-only" />
                            <Label
                              htmlFor="hard"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-muted/50 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                            >
                              <span className="font-semibold text-lg mb-1 text-destructive">Hard</span>
                              <span className="text-xs text-muted-foreground text-center font-normal">Edge cases, system design, and intense constraints</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="h-px bg-border w-full"></div>

                <FormField
                  control={form.control}
                  name="questionCount"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-4">
                        <FormLabel className="text-base font-semibold">Number of Questions</FormLabel>
                        <span className="font-mono bg-secondary px-3 py-1 rounded-md text-sm font-semibold">{field.value}</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-4"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </CardContent>
              <CardFooter className="bg-secondary/30 p-6 flex justify-end rounded-b-xl border-t">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full sm:w-auto h-12 px-8 font-semibold text-base gap-2"
                  disabled={createInterview.isPending}
                >
                  {createInterview.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                  Initialize Environment
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </AppLayout>
  );
}