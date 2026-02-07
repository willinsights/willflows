import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, Users, Globe, LogOut, Moon, Sun, Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDisplayPlanName } from '@/lib/plans';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useTheme } from '@/contexts/ThemeContext';
import { AccountTeamTab } from './AccountTeamTab';
import { AccountIntegrationsTab } from './AccountIntegrationsTab';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'equipa' | 'integracoes';
}

type TabValue = 'equipa' | 'integracoes';

export function AccountModal({ open, onOpenChange, initialTab = 'equipa' }: AccountModalProps) {
  const { user, signOut } = useAuth();
  const { subscription } = useUserSubscription();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch avatar from profiles table
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [user]);

  // Reset to initialTab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const handleSignOut = async () => {
    onOpenChange(false);
    await signOut();
    
    // Small delay to ensure state is fully cleared before navigation
    setTimeout(() => {
      navigate('/');
    }, 100);
  };

  const userEmail = user?.email || '';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0];
  const planName = subscription?.plan || 'starter';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPlanDisplayName = (plan: string) => {
    return getDisplayPlanName(plan);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={avatarUrl || user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <DialogTitle className="text-lg font-semibold">{userName}</DialogTitle>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
                <Badge variant="secondary" className="mt-1">
                  <Crown className="h-3 w-3 mr-1" />
                  Plano {getPlanDisplayName(planName)}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="equipa" className="gap-2 text-xs py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipa</span>
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="gap-2 text-xs py-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="equipa" className="mt-0 h-full">
              <AccountTeamTab />
            </TabsContent>
            
            <TabsContent value="integracoes" className="mt-0 h-full">
              <AccountIntegrationsTab planName={planName} />
            </TabsContent>
          </div>
        </Tabs>

        <Separator />

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="hidden sm:inline">Modo Escuro</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                navigate('/app/configuracoes');
              }}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configurações</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Terminar sessão</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
