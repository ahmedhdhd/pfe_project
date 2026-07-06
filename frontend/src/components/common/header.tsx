"use client";

import { User, Settings, Moon, Sun, GraduationCap } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/providers/theme-provider";
import { useRouter } from "next/navigation";

export function Header() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-6 border-b bg-background/60 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      {/* Left side - empty for now */}
      <div></div>

      {/* Right side */}
      <div className="flex items-center space-x-4 ml-auto">
        {/* Theme Switch */}
        <div className="flex items-center space-x-2">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <Switch
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
          <Moon className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9 bg-primary/10">
                <AvatarFallback>
                  <GraduationCap className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {userLoading ? "Loading..." : user?.username || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userLoading
                    ? "Loading..."
                    : user?.email || "user@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
