import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  LayoutGrid, 
  List, 
  RefreshCw,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Video,
  Youtube,
  Cloud,
  Link2,
  Film,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { StorageManagerTab } from '@/components/storage/StorageManagerTab';

interface MediaLink {
  id: string;
  url: string;
  title: string | null;
  link_type: string;
  created_at: string;
  project_id: string;
  project_name?: string;
  client_name?: string;
}

const mediaTypes = [
  { value: 'all', label: 'Todos', icon: FolderOpen },
  { value: 'nas', label: 'NAS', icon: HardDrive },
  { value: 'vimeo', label: 'Vimeo', icon: Video },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'drive', label: 'Google Drive', icon: Cloud },
  { value: 'outro', label: 'Outro', icon: Link2 },
];

const getMediaIcon = (type: string) => {
  const found = mediaTypes.find(m => m.value === type);
  return found?.icon || Link2;
};

const getMediaColor = (type: string) => {
  switch (type) {
    case 'nas': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'vimeo': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
    case 'youtube': return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'drive': return 'bg-green-500/10 text-green-500 border-green-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getMediaBgColor = (type: string) => {
  switch (type) {
    case 'nas': return 'bg-amber-500';
    case 'vimeo': return 'bg-sky-500';
    case 'youtube': return 'bg-red-500';
    case 'drive': return 'bg-green-500';
    default: return 'bg-muted-foreground';
  }
};

export default function Media() {
  const { projects } = useFilteredProjects();
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [tabMode, setTabMode] = useState<'all' | 'by-project'>('all');
 const [mainTab, setMainTab] = useState<'links' | 'storage'>('storage');

  // Fetch all media links for the workspace
  const { data: mediaLinks = [], isLoading, refetch } = useQuery({
    queryKey: ['media-links', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from('project_media_links')
        .select(`
          id,
          url,
          title,
          link_type,
          created_at,
          project_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich with project and client info
      const enrichedData = (data || []).map(link => {
        const project = projects.find(p => p.id === link.project_id);
        return {
          ...link,
          project_name: project?.name,
          client_name: project?.clients?.name
        };
      });

      return enrichedData as MediaLink[];
    },
    enabled: !!currentWorkspace?.id && projects.length > 0,
  });

  // Count by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: mediaLinks.length,
      nas: 0,
      frameio: 0,
      vimeo: 0,
      youtube: 0,
      drive: 0,
      outro: 0,
    };
    
    mediaLinks.forEach(link => {
      const type = link.link_type?.toLowerCase() || 'outro';
      if (counts[type] !== undefined) {
        counts[type]++;
      } else {
        counts.outro++;
      }
    });
    
    return counts;
  }, [mediaLinks]);

  // Filter media links
  const filteredMedia = useMemo(() => {
    return mediaLinks.filter(link => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !link.title?.toLowerCase().includes(query) &&
          !link.project_name?.toLowerCase().includes(query) &&
          !link.client_name?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Type filter
      if (filterType !== 'all') {
        const linkType = link.link_type?.toLowerCase() || 'outro';
        if (linkType !== filterType) return false;
      }

      // Project filter
      if (filterProject !== 'all' && link.project_id !== filterProject) return false;

      return true;
    });
  }, [mediaLinks, searchQuery, filterType, filterProject]);

  // Group by project
  const groupedByProject = useMemo(() => {
    const groups: Record<string, { projectName: string; clientName?: string; items: MediaLink[] }> = {};
    
    filteredMedia.forEach(link => {
      if (!groups[link.project_id]) {
        groups[link.project_id] = {
          projectName: link.project_name || 'Projeto sem nome',
          clientName: link.client_name,
          items: []
        };
      }
      groups[link.project_id].items.push(link);
    });
    
    return groups;
  }, [filteredMedia]);

  const activeProjects = projects.filter(p => !p.is_delivered);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Media & Uploads</h1>
            <p className="text-muted-foreground">
              Links de NAS, Frame.io, Vimeo e outros associados aos projetos
            </p>
          </div>
        </div>
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'links' | 'storage')}>
          <TabsList>
            <TabsTrigger value="links" className="gap-2">
              <Link2 className="h-4 w-4" />
              Links
            </TabsTrigger>
            <TabsTrigger value="storage" className="gap-2">
              <HardDrive className="h-4 w-4" />
              Armazenamento
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Storage Manager Tab */}
      {mainTab === 'storage' ? (
        <StorageManagerTab />
      ) : (
        <>
          {/* Refresh button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>

      {/* Type Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {mediaTypes.map((type) => {
          const Icon = type.icon;
          const isActive = filterType === type.value;
          const count = typeCounts[type.value] || 0;
          
          return (
            <motion.div
              key={type.value}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mediaTypes.indexOf(type) * 0.06, duration: 0.3 }}
            >
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isActive && "ring-2 ring-primary"
              )}
              onClick={() => setFilterType(type.value)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                  isActive ? "bg-primary text-primary-foreground" : type.value === 'all' ? "bg-muted" : getMediaBgColor(type.value) + " text-white"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold">{count}</span>
                <span className="text-xs text-muted-foreground">{type.label}</span>
              </CardContent>
            </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={tabMode} onValueChange={(v) => setTabMode(v as 'all' | 'by-project')}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Todos os Media
            </TabsTrigger>
            <TabsTrigger value="by-project" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Por Projeto
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por titulo, projeto ou cliente..."
              className="pl-9 w-full sm:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Pesquisar media por título, projeto ou cliente"
            />
          </div>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {activeProjects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMedia.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum media encontrado</h3>
          <p className="text-muted-foreground max-w-sm">
            {searchQuery || filterType !== 'all' || filterProject !== 'all'
              ? 'Tente ajustar seus filtros.'
              : 'Adicione links de media nos detalhes dos projetos.'}
          </p>
        </motion.div>
      ) : tabMode === 'by-project' ? (
        <div className="space-y-6">
          {Object.entries(groupedByProject).map(([projectId, group]) => (
            <div key={projectId} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{group.projectName}</h3>
                {group.clientName && (
                  <span className="text-sm text-muted-foreground">• {group.clientName}</span>
                )}
                <Badge variant="secondary">{group.items.length}</Badge>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((link, index) => (
                  <MediaCard
                    key={link.id} 
                    link={link} 
                    index={index}
                    showProject={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedia.map((link, index) => (
            <MediaCard key={link.id} link={link} index={index} showProject />
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}

interface MediaCardProps {
  link: MediaLink;
  index: number;
  showProject: boolean;
}

function MediaCard({ link, index, showProject }: MediaCardProps) {
  const Icon = getMediaIcon(link.link_type?.toLowerCase() || 'outro');
  const typeLabel = mediaTypes.find(m => m.value === (link.link_type?.toLowerCase() || 'outro'))?.label || 'Outro';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay: index * 0.03,
        duration: 0.2,
        ease: "easeOut"
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="glass-card hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer group">
        <CardContent className="p-3 flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
            getMediaBgColor(link.link_type?.toLowerCase() || 'outro'),
            "text-white"
          )}>
            <Icon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {link.title || 'Sem título'}
              </h3>
              <Badge 
                variant="outline" 
                className={cn("text-[10px] px-1.5 py-0 h-4 flex-shrink-0", getMediaColor(link.link_type?.toLowerCase() || 'outro'))}
              >
                {typeLabel}
              </Badge>
            </div>
            {showProject && (
              <p className="text-xs text-muted-foreground truncate">
                {link.project_name}{link.client_name && ` • ${link.client_name}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              {format(new Date(link.created_at), 'dd/MM', { locale: pt })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-60 group-hover:opacity-100 transition-opacity"
              onClick={() => window.open(link.url, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
