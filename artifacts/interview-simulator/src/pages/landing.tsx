import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Brain, LineChart, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="container mx-auto px-4 h-20 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="w-8 h-8" />
          <span className="font-display font-bold text-xl tracking-tight">Interview Simulator</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="font-medium">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="font-medium">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
            <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm font-medium bg-background/50 backdrop-blur-sm mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              The high-performance training environment
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-balance">
              Master the interview. <br />
              <span className="text-primary">Secure the offer.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto text-balance">
              A serious productivity tool for ambitious job seekers. Practice with AI, get data-driven feedback, and build unshakable confidence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base font-semibold group">
                  Start Training Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base font-semibold">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-secondary/30 border-y border-border/40">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Precision Feedback. No Fluff.</h2>
              <p className="text-lg text-muted-foreground">Every feature is designed to make you perform better under pressure.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  title: "Role-Specific Context",
                  description: "Questions are tailored exactly to the role you are applying for, from entry-level to staff engineer."
                },
                {
                  icon: Brain,
                  title: "AI-Powered Evaluation",
                  description: "Get detailed, objective feedback on your answers. We analyze structure, clarity, and technical accuracy."
                },
                {
                  icon: LineChart,
                  title: "Performance Analytics",
                  description: "Track your progress over time. See your scores improve as you identify and fix your weaknesses."
                }
              ].map((feature, i) => (
                <div key={i} className="bg-background border border-border p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Train like you fight.</h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Our interface simulates the pressure of a real interview. Speak your answers aloud, manage your time, and face unexpected follow-ups.
                </p>
                
                <ul className="space-y-6">
                  {[
                    "Configure your role and difficulty level",
                    "Answer questions using your microphone or keyboard",
                    "Receive an instant, objective score",
                    "Review actionable suggestions for improvement"
                  ].map((step, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mr-4" />
                      <span className="font-medium">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent opacity-20 blur-2xl rounded-3xl"></div>
                <div className="relative bg-card border border-border shadow-xl rounded-2xl p-6 md:p-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div className="font-semibold">Question 1 of 5</div>
                      <div className="text-sm font-mono bg-secondary px-2 py-1 rounded text-muted-foreground">02:45</div>
                    </div>
                    <div className="text-xl font-medium">Tell me about a time you had to deal with a difficult technical constraint.</div>
                    <div className="h-32 bg-muted rounded-xl border border-dashed border-border/60 flex items-center justify-center">
                      <div className="flex items-center text-muted-foreground gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        Recording...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-secondary/50">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="w-6 h-6 grayscale" />
            <span className="font-display font-semibold text-muted-foreground">Interview Simulator</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Built for those who take preparation seriously.
          </p>
        </div>
      </footer>
    </div>
  );
}