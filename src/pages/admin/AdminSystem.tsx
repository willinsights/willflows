import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, MessageSquare, FlaskConical, FileText, BarChart3 } from 'lucide-react';
import { MarketingTab } from '@/components/admin/MarketingTab';
import { FeedbackAdminTab } from '@/components/admin/FeedbackAdminTab';
import { LabsTab } from '@/components/admin/LabsTab';
import { BlogAdminTab } from '@/components/admin/BlogAdminTab';
import { BlogAnalyticsTab } from '@/components/admin/BlogAnalyticsTab';

export default function AdminSystem() {
  const [activeTab, setActiveTab] = useState('marketing');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sistema</h1>
        <p className="text-muted-foreground">Marketing, suporte, blog e ferramentas técnicas</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="marketing" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="blog" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Blog</span>
          </TabsTrigger>
          <TabsTrigger value="blog-analytics" className="gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Blog Stats</span>
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

        <TabsContent value="marketing" className="mt-6">
          <MarketingTab />
        </TabsContent>

        <TabsContent value="blog" className="mt-6">
          <BlogAdminTab />
        </TabsContent>

        <TabsContent value="blog-analytics" className="mt-6">
          <BlogAnalyticsTab />
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
