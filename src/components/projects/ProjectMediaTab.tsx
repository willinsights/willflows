import { useState } from 'react';
import { Plus, ExternalLink, Trash2, Pencil, HardDrive, Play, Youtube, Video, FolderOpen, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { projectMediaLinkSchema, validateWithSchema } from '@/lib/validation-schemas';
import type { Tables } from '@/integrations/supabase/types';

type MediaLink = Tables<'project_media_links'>;

interface ProjectMediaTabProps {
  mediaLinks: MediaLink[];
  setMediaLinks: React.Dispatch<React.SetStateAction<MediaLink[]>>;
  projectId: string;
  driveUrl?: string | null;
  dropboxUrl?: string | null;
}

const mediaTypes = [
  { value: 'nas', label: 'NAS', icon: HardDrive },
  { value: 'frameio', label: 'Frame.io', icon: Play },
  { value: 'vimeo', label: 'Vimeo', icon: Video },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'google_drive', label: 'Google Drive', icon: FolderOpen },
  { value: 'outro', label: 'Outro', icon: LinkIcon },
];

const getMediaIcon = (type: string) => {
  const mediaType = mediaTypes.find(m => m.value === type);
  return mediaType?.icon || LinkIcon;
};

const getMediaLabel = (type: string) => {
  const mediaType = mediaTypes.find(m => m.value === type);
  return mediaType?.label || type;
};

export function ProjectMediaTab({ 
  mediaLinks, 
  setMediaLinks, 
  projectId,
  driveUrl,
  dropboxUrl
}: ProjectMediaTabProps) {
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaLink | null>(null);
  const [newMedia, setNewMedia] = useState({
    link_type: 'nas',
    url: '',
    title: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setNewMedia({
      link_type: 'nas',
      url: '',
      title: '',
    });
  };

  const handleAddMedia = async () => {
    // Validate media link data
    const validation = validateWithSchema(projectMediaLinkSchema, {
      url: newMedia.url,
      title: newMedia.title || null,
      link_type: newMedia.link_type,
      project_id: projectId,
    });
    
    if (!validation.success) {
      toast({ title: 'Dados inválidos', description: validation.error, variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('project_media_links')
        .insert({
          project_id: projectId,
          link_type: validation.data.link_type,
          url: validation.data.url,
          title: validation.data.title,
        })
        .select()
        .single();

      if (error) throw error;

      setMediaLinks(prev => [...prev, data]);
      resetForm();
      setShowAddModal(false);
      toast({ title: 'Link de media adicionado' });
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar link', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMedia = async () => {
    if (!editingMedia) return;
    
    // Validate media link data
    const validation = validateWithSchema(projectMediaLinkSchema, {
      url: newMedia.url,
      title: newMedia.title || null,
      link_type: newMedia.link_type,
      project_id: projectId,
    });
    
    if (!validation.success) {
      toast({ title: 'Dados inválidos', description: validation.error, variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('project_media_links')
        .update({
          link_type: validation.data.link_type,
          url: validation.data.url,
          title: validation.data.title,
        })
        .eq('id', editingMedia.id)
        .select()
        .single();

      if (error) throw error;

      setMediaLinks(prev => prev.map(l => l.id === editingMedia.id ? data : l));
      resetForm();
      setEditingMedia(null);
      toast({ title: 'Link atualizado' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar link', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (link: MediaLink) => {
    setEditingMedia(link);
    setNewMedia({
      link_type: link.link_type,
      url: link.url,
      title: link.title || '',
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingMedia(null);
    resetForm();
  };

  const handleDelete = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('project_media_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      setMediaLinks(prev => prev.filter(l => l.id !== linkId));
      toast({ title: 'Link removido' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover link', description: error.message, variant: 'destructive' });
    }
  };

  const allLinks = [
    ...(driveUrl ? [{ id: 'drive', url: driveUrl, link_type: 'google_drive', title: 'Google Drive' }] : []),
    ...(dropboxUrl ? [{ id: 'dropbox', url: dropboxUrl, link_type: 'dropbox', title: 'Dropbox' }] : []),
    ...mediaLinks,
  ];

  const isModalOpen = showAddModal || !!editingMedia;

  return (
    <div className="space-y-4">
      {/* Media links list */}
      {allLinks.length > 0 ? (
        <div className="space-y-2">
          {allLinks.map((link) => {
            const Icon = getMediaIcon(link.link_type);
            const isBuiltIn = link.id === 'drive' || link.id === 'dropbox';
            const mediaLink = link as MediaLink;
            
            return (
              <div 
                key={link.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {link.title || getMediaLabel(link.link_type)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {getMediaLabel(link.link_type)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  
                  {!isBuiltIn && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEditModal(mediaLink)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum link de media</p>
        </div>
      )}

      {/* Add media button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setShowAddModal(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Media
      </Button>

      {/* Add/Edit Media Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMedia ? 'Editar Link de Media' : 'Adicionar Link de Media'}
            </DialogTitle>
            <DialogDescription>
              {editingMedia 
                ? 'Atualize as informações do link de media.'
                : 'Adicione links da NAS, Frame.io, Vimeo, YouTube ou Google Drive.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newMedia.link_type}
                onValueChange={(value) => setNewMedia(prev => ({ ...prev, link_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mediaTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL *</Label>
              <Input
                value={newMedia.url}
                onChange={(e) => setNewMedia(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input
                value={newMedia.title}
                onChange={(e) => setNewMedia(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Vídeo Principal"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button 
              onClick={editingMedia ? handleEditMedia : handleAddMedia} 
              disabled={submitting}
            >
              {editingMedia ? 'Guardar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
