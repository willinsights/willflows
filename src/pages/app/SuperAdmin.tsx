import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Loader2, LayoutDashboard, Users, Building2, CreditCard, MessageSquarePlus, Megaphone, FlaskConical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { SaaSCockpitTab } from '@/components/admin/SaaSCockpitTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { WorkspacesTab } from '@/components/admin/WorkspacesTab';
import { BillingTab } from '@/components/admin/BillingTab';
import { FeedbackAdminTab } from '@/components/admin/FeedbackAdminTab';
import { MarketingTab } from '@/components/admin/MarketingTab';
import { LabsTab } from '@/components/admin/LabsTab';

export default function SuperAdmin() {
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get('tab') || 'saas';

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
              <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-7">
                <TabsTrigger value="saas" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">SaaS</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Utilizadores</span>
                </TabsTrigger>
                <TabsTrigger value="workspaces" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Workspaces</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Billing</span>
                </TabsTrigger>
                <TabsTrigger value="support" className="gap-2">
                  <MessageSquarePlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Suporte</span>
                </TabsTrigger>
                <TabsTrigger value="marketing" className="gap-2">
                  <Megaphone className="h-4 w-4" />
                  <span className="hidden sm:inline">Marketing</span>
                </TabsTrigger>
                <TabsTrigger value="labs" className="gap-2">
                  <FlaskConical className="h-4 w-4" />
                  <span className="hidden sm:inline">Labs</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="saas" className="mt-0">
                <SaaSCockpitTab />
              </TabsContent>
              <TabsContent value="users" className="mt-0">
                <UsersTab />
              </TabsContent>
              <TabsContent value="workspaces" className="mt-0">
                <WorkspacesTab />
              </TabsContent>
              <TabsContent value="billing" className="mt-0">
                <BillingTab />
              </TabsContent>
              <TabsContent value="support" className="mt-0">
                <FeedbackAdminTab />
              </TabsContent>
              <TabsContent value="marketing" className="mt-0">
                <MarketingTab />
              </TabsContent>
              <TabsContent value="labs" className="mt-0">
                <LabsTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
