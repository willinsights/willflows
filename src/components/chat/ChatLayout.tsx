import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChatSidebar } from './ChatSidebar';
import { ChatFeed } from './ChatFeed';
import { ChatContextPanel } from './ChatContextPanel';
import { FollowUpInbox } from './FollowUpInbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, Inbox, MessageCircle, Hash, MessageSquare } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';

interface ChatLayoutProps {
  selectedConversationId?: string;
}

export function ChatLayout({ selectedConversationId }: ChatLayoutProps) {
  const isMobile = useIsMobile();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    selectedConversationId || null
  );
  const [showContextPanel, setShowContextPanel] = useState(!isMobile);
  const [showFollowUpInbox, setShowFollowUpInbox] = useState(false);
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    if (isMobile) {
      setMobileView('chat');
    }
  };

  const handleBackToSidebar = () => {
    setMobileView('sidebar');
    setActiveConversationId(null);
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          {mobileView === 'chat' && activeConversationId ? (
            <>
              <Button variant="ghost" size="icon" onClick={handleBackToSidebar}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="font-semibold">Chat</span>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] p-0">
                  <ChatContextPanel conversationId={activeConversationId} />
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Chat</h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFollowUpInbox(true)}
              >
                <Inbox className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {mobileView === 'sidebar' ? (
            <ChatSidebar
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
            />
          ) : activeConversationId ? (
            <ChatFeed conversationId={activeConversationId} />
          ) : null}
        </div>

        {/* FollowUp Inbox Modal */}
        <Sheet open={showFollowUpInbox} onOpenChange={setShowFollowUpInbox}>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <FollowUpInbox onClose={() => setShowFollowUpInbox(false)} />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop Layout - 3 columns
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Left Sidebar - Conversations */}
      <div className="w-72 border-r border-border flex flex-col bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Chat</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFollowUpInbox(!showFollowUpInbox)}
            className={cn(
              'h-8 w-8 transition-colors',
              showFollowUpInbox && 'bg-primary/10 text-primary'
            )}
          >
            <Inbox className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          {showFollowUpInbox ? (
            <FollowUpInbox onClose={() => setShowFollowUpInbox(false)} />
          ) : (
            <ChatSidebar
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
            />
          )}
        </div>
      </div>

      {/* Center - Chat Feed */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversationId ? (
          <ChatFeed conversationId={activeConversationId} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Seleciona uma conversa"
              description="Escolhe um projeto, canal ou mensagem direta para começar a conversar com a tua equipa."
            />
          </div>
        )}
      </div>

      {/* Right Panel - Context */}
      {showContextPanel && activeConversationId && (
        <div className="w-80 border-l border-border bg-card overflow-hidden">
          <ChatContextPanel
            conversationId={activeConversationId}
            onClose={() => setShowContextPanel(false)}
          />
        </div>
      )}

      {/* Toggle Context Panel Button */}
      {activeConversationId && !showContextPanel && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-20 h-9 w-9"
          onClick={() => setShowContextPanel(true)}
        >
          <Info className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
