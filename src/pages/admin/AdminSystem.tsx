import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, FlaskConical } from 'lucide-react';
import { FeedbackAdminTab } from '@/components/admin/FeedbackAdminTab';
import { LabsTab } from '@/components/admin/LabsTab';

export default function AdminSystem() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sistema</h1>
        <p className="text-muted-foreground">Suporte e ferramentas técnicas</p>
      </div>

      <Tabs defaultValue="support">
        <TabsList>
          <TabsTrigger value="support" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Suporte
          </TabsTrigger>
          <TabsTrigger value="labs" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Labs
          </TabsTrigger>
        </TabsList>

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
