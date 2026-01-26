import { useParams, useSearchParams } from 'react-router-dom';
import { ChatLayout } from '@/components/chat/ChatLayout';

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const queryConversationId = searchParams.get('conversationId') || searchParams.get('c');
  
  // Priority: path param > query param
  const selectedId = conversationId || queryConversationId || undefined;

  return <ChatLayout selectedConversationId={selectedId} />;
}
