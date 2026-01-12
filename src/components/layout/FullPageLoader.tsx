import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/logo';

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-6"
      >
        <Logo className="h-10" />
        
        <div className="flex items-center gap-2">
          <motion.div
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </motion.div>
    </div>
  );
}
