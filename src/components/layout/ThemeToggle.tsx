import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative h-9 w-9 rounded-full overflow-hidden bg-muted/50 hover:bg-muted"
        >
          <motion.div
            initial={false}
            animate={{
              rotate: isDark ? 180 : 0,
              scale: [1, 0.85, 1],
            }}
            transition={{
              duration: 0.4,
              ease: 'easeInOut',
              scale: { duration: 0.3 },
            }}
            className="flex items-center justify-center"
          >
            {isDark ? (
              <Moon className="h-4 w-4 text-primary" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
          </motion.div>
          
          {/* Glow effect on hover */}
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              background: isDark
                ? 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%)',
            }}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        <p>{isDark ? 'Modo claro' : 'Modo escuro'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
