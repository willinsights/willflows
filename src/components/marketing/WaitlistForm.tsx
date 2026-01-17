import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { trackWaitlistSignup } from '@/lib/google-ads';

interface WaitlistFormProps {
  className?: string;
  variant?: 'default' | 'hero' | 'inline';
}

export function WaitlistForm({ className = '', variant = 'default' }: WaitlistFormProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, insira o seu email.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('beta_waitlist')
        .insert({
          email: email.toLowerCase().trim(),
          name: name.trim() || null,
          source: 'landing',
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: 'Já está na lista!',
            description: 'Este email já está registado na lista de espera.',
          });
          setSuccess(true);
          return;
        }
        throw error;
      }

      setSuccess(true);
      
      // Track waitlist signup conversion
      trackWaitlistSignup();
      
      toast({
        title: 'Registado com sucesso! 🎉',
        description: 'Entraremos em contacto quando houver vagas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao registar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20 ${className}`}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
          <Check className="h-5 w-5 text-success" />
        </div>
        <div>
          <p className="font-medium text-success">Está na lista!</p>
          <p className="text-sm text-muted-foreground">Entraremos em contacto em breve.</p>
        </div>
      </motion.div>
    );
  }

  if (variant === 'hero') {
    return (
      <form onSubmit={handleSubmit} className={`space-y-3 ${className}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="O seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-14 text-lg bg-background/50 backdrop-blur-sm border-border/50"
            disabled={loading}
          />
          <Button 
            type="submit" 
            size="lg" 
            className="h-14 px-8 gradient-primary glow-ring"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                A registar...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Pedir Acesso
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          Junte-se à lista de espera para acesso antecipado.
        </p>
      </form>
    );
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <Input
          type="email"
          placeholder="O seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </Button>
      </form>
    );
  }

  // Default variant
  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Nome (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="O seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            A registar...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Juntar à Lista de Espera
          </>
        )}
      </Button>
    </form>
  );
}