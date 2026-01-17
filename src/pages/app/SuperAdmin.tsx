import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, FileText, MessageSquarePlus, FlaskConical, Loader2, LayoutDashboard, Globe, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { BetaAdminTab } from '@/components/admin/BetaAdminTab';
import { BlogAdminTab } from '@/components/admin/BlogAdminTab';
import { FeedbackAdminTab } from '@/components/admin/FeedbackAdminTab';
import { TestAccountsTab } from '@/components/admin/TestAccountsTab';
import { SystemOverviewTab } from '@/components/admin/SystemOverviewTab';
import { AccountsReportTab } from '@/components/admin/AccountsReportTab';
import { SiteAnalyticsTab } from '@/components/admin/SiteAnalyticsTab';
import { BlogAnalyticsTab } from '@/components/admin/BlogAnalyticsTab';

export default function SuperAdmin() {
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

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

      {/* Main Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b px-6 pt-4 overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-8">
                <TabsTrigger value="overview" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="accounts" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Contas</span>
                </TabsTrigger>
                <TabsTrigger value="site-analytics" className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Site</span>
                </TabsTrigger>
                <TabsTrigger value="blog-analytics" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Blog</span>
                </TabsTrigger>
                <TabsTrigger value="beta" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Beta</span>
                </TabsTrigger>
                <TabsTrigger value="blog" className="gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Artigos</span>
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
              <TabsContent value="overview" className="mt-0">
                <SystemOverviewTab />
              </TabsContent>
              <TabsContent value="accounts" className="mt-0">
                <AccountsReportTab />
              </TabsContent>
              <TabsContent value="site-analytics" className="mt-0">
                <SiteAnalyticsTab />
              </TabsContent>
              <TabsContent value="blog-analytics" className="mt-0">
                <BlogAnalyticsTab />
              </TabsContent>
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
