import { Link, useLocation } from "wouter";
import { useAuth, UserButton } from "@clerk/react";
import { LogOut, LayoutDashboard, PlayCircle, GitCompare, Menu, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "New Interview", href: "/interview/start", icon: PlayCircle },
    { name: "Study Plans", href: "/plans", icon: Map },
    { name: "Compare", href: "/compare", icon: GitCompare },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="w-8 h-8" />
              <span className="font-display font-bold text-xl tracking-tight">PrepStride</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href} className="cursor-pointer">
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`h-9 px-4 flex items-center gap-2 cursor-pointer ${isActive ? "font-semibold" : "text-muted-foreground"}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                className="gap-2 text-muted-foreground cursor-pointer"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-9 h-9"
                  }
                }}
              />
            </div>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-4 mt-8">
                  {navigation.map((item) => {
                    const isActive = location === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="cursor-pointer"
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={`w-full justify-start h-12 px-4 flex items-center gap-3 cursor-pointer ${isActive ? "font-semibold" : "text-muted-foreground"}`}
                        >
                          <Icon className="w-5 h-5" />
                          {item.name}
                        </Button>
                      </Link>
                    );
                  })}
                  <div className="mt-auto border-t pt-4 flex flex-col gap-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 px-4 text-muted-foreground cursor-pointer"
                      onClick={() => signOut()}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
