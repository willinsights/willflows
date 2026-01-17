import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, FileText, MessageSquarePlus, FlaskConical, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { BetaAdminTab } from '@/components/admin/BetaAdminTab';
import { BlogAdminTab } from '@/components/admin/BlogAdminTab';
import { FeedbackAdminTab } from '@/components/admin/FeedbackAdminTab';
import { TestAccountsTab } from '@/components/admin/TestAccountsTab';
import { supabase } from '@/integrations/supabase/client';

export default function SuperAdmin() {
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState({
    waitlist: 0,
    invites: 0,
    articles: 0,
    feedback: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const currentTab = searchParams.get('tab') || 'beta';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [waitlistRes, invitesRes, articlesRes, feedbackRes] = await Promise.all([
          supabase.from('beta_waitlist').select('id', { count: 'exact', head: true }),
          supabase.from('beta_invite_tokens').select('id', { count: 'exact', head: true }),
          supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
          supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);

        setStats({
          waitlist: waitlistRes.count || 0,
          invites: invitesRes.count || 0,
          articles: articlesRes.count || 0,
          feedback: feedbackRes.count || 0,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (isSuperAdmin) {
      fetchStats();
    }
  }, [isSuperAdmin]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Esta página é exclusiva para administradores do sistema.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Painel Super Admin
        </h1>
        <p className="text-muted-foreground">
          Gestão centralizada do sistema WillFlow
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Waitlist
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">{stats.waitlist}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Convites Beta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">{stats.invites}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Artigos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">{stats.articles}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Feedback Pendente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold text-amber-600">{stats.feedback}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b px-6 pt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="beta" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Beta</span>
                </TabsTrigger>
                <TabsTrigger value="blog" className="gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Blog</span>
                </TabsTrigger>
                <TabsTrigger value="feedback" className="gap-2">
                  <MessageSquarePlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Feedback</span>
                </TabsTrigger>
                <TabsTrigger value="test-accounts" className="gap-2">
                  <FlaskConical className="h-4 w-4" />
                  <span className="hidden sm:inline">Testes</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="beta" className="mt-0">
                <BetaAdminTab />
              </TabsContent>
              <TabsContent value="blog" className="mt-0">
                <BlogAdminTab />
              </TabsContent>
              <TabsContent value="feedback" className="mt-0">
                <FeedbackAdminTab />
              </TabsContent>
              <TabsContent value="test-accounts" className="mt-0">
                <TestAccountsTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
