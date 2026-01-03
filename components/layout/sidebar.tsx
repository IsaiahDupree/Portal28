"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Mail,
  Settings,
  BarChart3,
  MessageSquare,
  FileText,
  Package,
  ChevronLeft,
  Menu,
  LogOut,
  BookOpen,
  Megaphone,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SidebarProps {
  variant: "admin" | "app" | "public";
}

const publicNavItems = [
  { title: "Home", href: "/", icon: LayoutDashboard },
  { title: "Courses", href: "/courses", icon: GraduationCap },
  { title: "Bundles", href: "/bundles", icon: Package },
];

const adminNavItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Course Studio", href: "/admin/studio", icon: BookOpen },
  { title: "Courses", href: "/admin/courses", icon: GraduationCap },
  { title: "Offers", href: "/admin/offers", icon: Package },
  { title: "Community", href: "/admin/community", icon: Users },
  { title: "Email Programs", href: "/admin/email-programs", icon: Mail },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Email Analytics", href: "/admin/email-analytics", icon: FileText },
];

const appNavItems = [
  { title: "Dashboard", href: "/app", icon: LayoutDashboard },
  { title: "My Courses", href: "/app/courses", icon: GraduationCap },
  { title: "Community", href: "/app/community", icon: Users },
];

export function Sidebar({ variant }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const navItems = variant === "admin" ? adminNavItems : variant === "app" ? appNavItems : publicNavItems;
  const homeHref = variant === "admin" ? "/admin" : variant === "app" ? "/app" : "/";

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            {!isCollapsed && (
              <Link href={homeHref} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">P28</span>
                </div>
                <span className="font-semibold">Portal28</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const NavIcon = item.icon;

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <NavIcon className="h-5 w-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <NavIcon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/login"
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    {variant === "public" ? <LogOut className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {variant === "public" ? "Sign In" : variant === "admin" ? "Student View" : "Admin"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex flex-col gap-2">
                {variant === "public" ? (
                  <Link
                    href="/login"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign In
                  </Link>
                ) : (
                  <>
                    <Link
                      href={variant === "admin" ? "/app" : "/admin"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <Settings className="h-5 w-5" />
                      {variant === "admin" ? "Student View" : "Admin"}
                    </Link>
                    <Link
                      href="/login"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export function MobileSidebar({ variant }: SidebarProps) {
  const pathname = usePathname();
  const navItems = variant === "admin" ? adminNavItems : variant === "app" ? appNavItems : publicNavItems;
  const homeHref = variant === "admin" ? "/admin" : variant === "app" ? "/app" : "/";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-4">
            <Link href={homeHref} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">P28</span>
              </div>
              <span className="font-semibold">Portal28</span>
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const NavIcon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <NavIcon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex flex-col gap-2">
              {variant === "public" ? (
                <Link
                  href="/login"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
                >
                  <LogOut className="h-5 w-5" />
                  Sign In
                </Link>
              ) : (
                <>
                  <Link
                    href={variant === "admin" ? "/app" : "/admin"}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
                  >
                    <Settings className="h-5 w-5" />
                    {variant === "admin" ? "Student View" : "Admin"}
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
