import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Users, 
  Building2, 
  UserPlus, 
  Trash2 
} from 'lucide-react';
import { UsersSummarySection } from './users-management/UsersSummarySection';
import { UsersListSection } from './users-management/UsersListSection';
import { WorkspacesSection } from './users-management/WorkspacesSection';
import { BetaInvitesSection } from './users-management/BetaInvitesSection';
import { CleanupSection } from './users-management/CleanupSection';

export function UsersManagementTab() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
      <TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="overview" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Visão Geral
        </TabsTrigger>
        <TabsTrigger value="users" className="gap-2">
          <Users className="h-4 w-4" />
          Lista
        </TabsTrigger>
        <TabsTrigger value="workspaces" className="gap-2">
          <Building2 className="h-4 w-4" />
          Workspaces
        </TabsTrigger>
        <TabsTrigger value="aquisicao" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Aquisição
        </TabsTrigger>
        <TabsTrigger value="cleanup" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Limpeza
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <UsersSummarySection />
      </TabsContent>
      <TabsContent value="users">
        <UsersListSection />
      </TabsContent>
      <TabsContent value="workspaces">
        <WorkspacesSection />
      </TabsContent>
      <TabsContent value="aquisicao">
        <BetaInvitesSection />
      </TabsContent>
      <TabsContent value="cleanup">
        <CleanupSection />
      </TabsContent>
    </Tabs>
  );
}