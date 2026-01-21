import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

interface SearchResult {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
}

interface MessageSearchBarProps {
  conversationId: string;
  onResultClick: (messageId: string) => void;
  onClose: () => void;
}

export function MessageSearchBar({ conversationId, onResultClick, onClose }: MessageSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Search messages
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const searchMessages = async () => {
      setIsSearching(true);
      try {
        const { data } = await supabase
          .from('messages')
          .select('id, body, created_at, user_id')
          .eq('conversation_id', conversationId)
          .ilike('body', `%${debouncedQuery}%`)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(20);

        setResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchMessages();
  }, [debouncedQuery, conversationId]);

  // Highlight function
  const highlightText = (text: string) => {
    if (!debouncedQuery) return text;
    
    const parts = text.split(new RegExp(`(${debouncedQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === debouncedQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded">{part}</mark>
        : part
    );
  };

  const handleResultClick = (messageId: string) => {
    onResultClick(messageId);
    onClose();
  };

  return (
    <div className="relative border-b bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar mensagens..."
          className="border-0 shadow-none focus-visible:ring-0 h-8"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Results dropdown */}
      {(results.length > 0 || isSearching) && (
        <div className="absolute top-full left-0 right-0 bg-popover border-x border-b rounded-b-lg shadow-lg z-50">
          {isSearching ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              A pesquisar...
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              {results.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleResultClick(msg.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-0"
                >
                  <p className="text-sm line-clamp-2">{highlightText(msg.body)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(msg.created_at), "d MMM, HH:mm", { locale: pt })}
                  </p>
                </button>
              ))}
            </ScrollArea>
          )}
        </div>
      )}

      {/* No results */}
      {query.length >= 2 && !isSearching && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 bg-popover border-x border-b rounded-b-lg shadow-lg z-50">
          <div className="px-4 py-3 text-sm text-muted-foreground">
            Nenhuma mensagem encontrada
          </div>
        </div>
      )}
    </div>
  );
}
