'use client';

import { signOut } from 'next-auth/react';
import { Moon, Sun, Bell, LogOut, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';

interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onOpenChat?: () => void;
}

export function TopBar({ user, onOpenChat }: TopBarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Welcome back, <span className="text-foreground">{user.name || 'User'}</span>
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* AI Chat */}
        <button
          onClick={onOpenChat}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        {/* Notifications */}
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        {/* User menu */}
        <div className="ml-2 flex items-center gap-3 border-l pl-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
