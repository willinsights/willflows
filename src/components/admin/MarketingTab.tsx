import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, BookOpen, FileText } from 'lucide-react';
import { SiteAnalyticsTab } from './SiteAnalyticsTab';
import { BlogAnalyticsTab } from './BlogAnalyticsTab';
import { BlogAdminTab } from './BlogAdminTab';

export function MarketingTab() {
  return (
    <Tabs defaultValue="site" className="space-y-4">
      <TabsList>
        <TabsTrigger value="site" className="gap-2">
          <Globe className="h-4 w-4" />
          Site
        </TabsTrigger>
        <TabsTrigger value="blog" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Blog Analytics
        </TabsTrigger>
        <TabsTrigger value="artigos" className="gap-2">
          <FileText className="h-4 w-4" />
          Artigos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="site">
        <SiteAnalyticsTab />
      </TabsContent>
      <TabsContent value="blog">
        <BlogAnalyticsTab />
      </TabsContent>
      <TabsContent value="artigos">
        <BlogAdminTab />
      </TabsContent>
    </Tabs>
  );
}
