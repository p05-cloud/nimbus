'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ChatPanel } from '@/components/chat/ChatPanel';

interface DashboardShellProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onOpenChat={() => setChatOpen(true)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} onOpenChat={() => setChatOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">{children}</main>
      </div>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
