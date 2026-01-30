import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, FlaskConical, Settings, Shield, HardDrive } from 'lucide-react';
import { FeedbackAdminTab } from '@/components/admin/FeedbackAdminTab';
import { LabsTab } from '@/components/admin/LabsTab';
import { SettingsTab } from '@/components/admin/SettingsTab';
import { AuditLogsTab } from '@/components/admin/AuditLogsTab';
import { StorageMetricsTab } from '@/components/admin/StorageMetricsTab';

export default function AdminSystem() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sistema</h1>
        <p className="text-muted-foreground">Monitorização, suporte e ferramentas técnicas</p>
      </div>

      <Tabs defaultValue="storage">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="storage" className="gap-2">
            <HardDrive className="h-4 w-4" />
            <span className="hidden sm:inline">Storage</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Logs</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Suporte</span>
          </TabsTrigger>
          <TabsTrigger value="labs" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Labs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="storage" className="mt-6">
          <StorageMetricsTab />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogsTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>

        <TabsContent value="support" className="mt-6">
          <FeedbackAdminTab />
        </TabsContent>

        <TabsContent value="labs" className="mt-6">
          <LabsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
