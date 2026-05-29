"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell,
  LogOut,
  Moon,
  Sun,
  User,
  Receipt,
  BookOpen,
  Award,
  Calendar,
  LayoutDashboard,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/providers/theme-provider";
import {
  useOrgCurrency,
  useOrgLogo,
  useOrgName,
  useOrgPaymentMode,
} from "@/lib/store/organization-config";
import {
  useIsOrgFeatureEnabled,
  useStudentNavigationItems,
} from "@/lib/constants/platform-features";
import type { LucideIcon } from "lucide-react";
import { tokenManager } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  useStudentCourseCartCount,
  useStudentCourseCartItems,
  useStudentCourseCartStore,
} from "@/lib/store/student-course-cart";
import { formatCurrency } from "@/lib/utils/format";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  Award,
  Calendar,
  TrendingUp,
  FileText,
};

export function StudentHeader() {
  const navItems = useStudentNavigationItems();
  const navLinks = navItems.map((item) => ({
    href: item.href,
    label: item.title,
    icon: NAV_ICON_MAP[item.icon] ?? LayoutDashboard,
  }));
  const orgLogo = useOrgLogo();
  const orgName = useOrgName();
  const currency = useOrgCurrency();
  const paymentMode = useOrgPaymentMode();
  const user = tokenManager.getUser();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const cartItems = useStudentCourseCartItems();
  const cartCount = useStudentCourseCartCount();
  const removeCartItem = useStudentCourseCartStore((state) => state.removeItem);
  const clearCart = useStudentCourseCartStore((state) => state.clearCart);

  const isDark = theme === "dark";
  const ordersEnabled = useIsOrgFeatureEnabled("orders");
  const showCart = paymentMode === "per_course" && ordersEnabled;
  const homeHref = navLinks[0]?.href ?? "/student/my-learning";
  const cartTotal = cartItems.reduce((sum, item) => sum + item.finalPrice, 0);

  // Check if a nav link is active
  const isActive = (href: string) => {
    if (!pathname) return false;
    const normalizedPath =
      pathname.replace(/^\/[^/]+(?=\/student)/, "") || pathname;

    if (href === "/student/my-learning") {
      return (
        normalizedPath === "/student/my-learning" ||
        normalizedPath === "/student/dashboard"
      );
    }
    if (href === "/student/explore") {
      return (
        normalizedPath.startsWith("/student/explore") ||
        normalizedPath.startsWith("/student/batches")
      );
    }
    return normalizedPath.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 md:px-6">
        {/* ── Left: Logo + Org Name ── */}
        <Link
          href={homeHref}
          className="flex items-center gap-2.5 mr-6 shrink-0 group"
        >
          {orgLogo ? (
            <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-border/50 bg-background shadow-sm">
              <Image
                src={orgLogo}
                alt={orgName}
                fill
                className="object-contain p-0.5"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              {orgName?.charAt(0)?.toUpperCase() || "L"}
            </div>
          )}
          <span className="hidden lg:block text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {orgName || "Learning Platform"}
          </span>
        </Link>

        {/* ── Center: Navigation Links ── */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
                {/* Active indicator line */}
                {active && (
                  <span
                    className="absolute bottom-[-13px] left-3 right-3 h-[2px] bg-primary rounded-full"
                    style={{ animation: "nav-underline 0.3s ease-out both" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Search button (visual — can wire later) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" />
          </Button>

          {showCart ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                  aria-label="Open cart"
                >
                  <ShoppingCart className="h-[18px] w-[18px]" />
                  {cartCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {cartCount}
                    </span>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Cart</SheetTitle>
                  <SheetDescription>
                    Review the paid courses you want to buy.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 flex h-full flex-col gap-4">
                  {cartItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                      Your cart is empty.
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {cartItems.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-border/60 bg-card p-3"
                          >
                            <div className="flex gap-3">
                              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                                {item.imageUrl ? (
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.title}
                                    width={96}
                                    height={64}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <BookOpen className="h-5 w-5 text-muted-foreground/50" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-medium text-foreground">
                                  {item.title}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.category || item.language || "Course"}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-primary">
                                  {formatCurrency(item.finalPrice, currency)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeCartItem(item.id)}
                                aria-label={`Remove ${item.title} from cart`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button asChild variant="outline" className="flex-1">
                                <Link href={`/student/batches/${item.id}`}>Details</Link>
                              </Button>
                              <Button asChild className="flex-1">
                                <Link href={`/student/checkout?courseId=${item.id}`}>Buy</Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3 border-t border-border/60 pt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(cartTotal, currency)}
                          </span>
                        </div>
                        <Button asChild className="w-full">
                          <Link href="/student/cart">View cart</Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={clearCart}
                        >
                          Clear cart
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          ) : null}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                You&apos;re all caught up!
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 rounded-lg px-2 gap-2 hover:bg-muted/50"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src="" alt={user?.username || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline-block text-sm font-medium text-foreground max-w-[120px] truncate">
                  {user?.username || "Student"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.username || "Student"}
                  </p>
                  {user?.email && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/student/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/student/orders">
                  <Receipt className="mr-2 h-4 w-4" />
                  Orders
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Theme Toggle */}
              <DropdownMenuItem
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                {isDark ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  tokenManager.clearAuthData();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
