import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, Trash2, Building2 } from 'lucide-react';
import { UsersListSection } from '@/components/admin/users-management/UsersListSection';
import { BetaInvitesSection } from '@/components/admin/users-management/BetaInvitesSection';
import { CleanupSection } from '@/components/admin/users-management/CleanupSection';
import { WorkspacesSection } from '@/components/admin/users-management/WorkspacesSection';

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilizadores</h1>
        <p className="text-muted-foreground">Gestão de utilizadores, workspaces e convites beta</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Utilizadores</span>
          </TabsTrigger>
          <TabsTrigger value="workspaces" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Workspaces</span>
          </TabsTrigger>
          <TabsTrigger value="beta" className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Aquisição</span>
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="gap-2">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Limpeza</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UsersListSection />
        </TabsContent>

        <TabsContent value="workspaces" className="mt-6">
          <WorkspacesSection />
        </TabsContent>

        <TabsContent value="beta" className="mt-6">
          <BetaInvitesSection />
        </TabsContent>

        <TabsContent value="cleanup" className="mt-6">
          <CleanupSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
