import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  typingUsers: { user_id: string; full_name: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const text = typingUsers.length === 1
    ? `${typingUsers[0].full_name} está a escrever`
    : typingUsers.length === 2
    ? `${typingUsers[0].full_name} e ${typingUsers[1].full_name} estão a escrever`
    : `${typingUsers[0].full_name} e mais ${typingUsers.length - 1} estão a escrever`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground"
      >
        <div className="flex gap-1">
          <span 
            className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '0ms' }} 
          />
          <span 
            className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '150ms' }} 
          />
          <span 
            className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '300ms' }} 
          />
        </div>
        <span>{text}...</span>
      </motion.div>
    </AnimatePresence>
  );
}
