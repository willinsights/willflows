import { useParams } from 'react-router-dom';
import { ChatLayout } from '@/components/chat/ChatLayout';

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();

  return <ChatLayout selectedConversationId={conversationId} />;
}
