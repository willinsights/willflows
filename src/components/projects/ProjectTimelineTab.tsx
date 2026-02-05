import { useState } from 'react';
import { Plus, Film, Save, Trash2, LayoutTemplate, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import { useVideoStructure, type VideoStructure } from '@/hooks/useVideoStructure';
import { useVideoStructureTemplates } from '@/hooks/useVideoStructureTemplates';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  calculateTotalDuration, 
  formatTotalDuration, 
  formatDurationRange,
  calculateSegmentWidth,
  generateTimeMarkers
} from '@/lib/duration-utils';
import { TimelineSegment } from './timeline/TimelineSegment';
import { AddSegmentModal } from './timeline/AddSegmentModal';
import { EditSegmentModal } from './timeline/EditSegmentModal';
import { SaveTemplateModal } from './timeline/SaveTemplateModal';

interface ProjectTimelineTabProps {
  projectId: string;
  workspaceId: string;
}

export function ProjectTimelineTab({ projectId, workspaceId }: ProjectTimelineTabProps) {
  const { segments, loading, addSegment, updateSegment, deleteSegment, reorderSegments, applyTemplate, clearAll } = useVideoStructure(projectId, workspaceId);
  const { templates, createTemplate, deleteTemplate } = useVideoStructureTemplates(workspaceId);
  const { isAdmin } = useWorkspace();
  const isMobile = useIsMobile();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<VideoStructure | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  const totalDuration = calculateTotalDuration(segments);
  const timeMarkers = generateTimeMarkers(totalDuration.max, 5);

  const handleApplyTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      await applyTemplate(template.segments);
    }
  };

  const handleSaveTemplate = async (name: string, description?: string) => {
    await createTemplate(name, segments, description);
    setShowSaveTemplateModal(false);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteTemplate(templateId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Timeline do Vídeo</h3>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Apply Template Dropdown */}
          {templates.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  Templates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {templates.map(template => (
                  <DropdownMenuItem 
                    key={template.id}
                    onClick={() => handleApplyTemplate(template.id)}
                    className="flex items-center justify-between"
                  >
                    <span>{template.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {template.segments.length} seg.
                    </Badge>
                  </DropdownMenuItem>
                ))}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    {templates.map(template => (
                      <DropdownMenuItem 
                        key={`delete-${template.id}`}
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Apagar "{template.name}"
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Save as Template */}
          {segments.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSaveTemplateModal(true)}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Guardar Template
            </Button>
          )}

          {/* Add Segment */}
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Segmento
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {segments.length > 0 && (
        <Card className="bg-muted/30 border-primary/20">
          <CardContent className="py-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Duração Total:</span>
              <span className="text-primary font-bold">
                {formatTotalDuration(totalDuration)}
              </span>
            </div>
            <Badge variant="secondary">{segments.length} segmento{segments.length !== 1 ? 's' : ''}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {segments.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center py-12"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Film className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Nenhum segmento definido</h3>
          <p className="text-muted-foreground max-w-sm mb-4">
            Adicione segmentos para definir a estrutura do vídeo ou aplique um template existente.
          </p>
          <div className="flex gap-2">
            {templates.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <LayoutTemplate className="h-4 w-4" />
                    Aplicar Template
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {templates.map(template => (
                    <DropdownMenuItem 
                      key={template.id}
                      onClick={() => handleApplyTemplate(template.id)}
                    >
                      {template.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Segmento
            </Button>
          </div>
        </motion.div>
      )}

      {/* Timeline Visualization */}
      {segments.length > 0 && (
        <div className="space-y-2">
          {/* Desktop: Horizontal Timeline */}
          {!isMobile ? (
            <div className="space-y-1">
              {/* Timeline Bar */}
              <div className="relative h-16 bg-muted/30 rounded-lg overflow-hidden flex">
                <AnimatePresence mode="popLayout">
                  {segments.map((segment, index) => (
                    <TimelineSegment
                      key={segment.id}
                      segment={segment}
                      width={calculateSegmentWidth(segment, totalDuration.max)}
                      index={index}
                      onClick={() => setEditingSegment(segment)}
                    />
                  ))}
                </AnimatePresence>
              </div>
              
              {/* Time Markers */}
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                {timeMarkers.map((marker, i) => (
                  <span key={i}>{marker}</span>
                ))}
              </div>
            </div>
          ) : (
            /* Mobile: Vertical List */
            <div className="space-y-2">
              {segments.map((segment, index) => (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setEditingSegment(segment)}
                  >
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{segment.name}</p>
                          {segment.description && (
                            <p className="text-xs text-muted-foreground">{segment.description}</p>
                          )}
                          {segment.notes && (
                            <p className="text-xs text-muted-foreground/70 italic mt-1">
                              Notas: {segment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {formatDurationRange(segment.min_duration_seconds, segment.max_duration_seconds)}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clear All Button */}
      {segments.length > 0 && isAdmin && (
        <div className="flex justify-end pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAll}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>
      )}

      {/* Modals */}
      <AddSegmentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={addSegment}
      />

      <EditSegmentModal
        open={!!editingSegment}
        onOpenChange={(open) => !open && setEditingSegment(null)}
        segment={editingSegment}
        onUpdate={updateSegment}
        onDelete={deleteSegment}
      />

      <SaveTemplateModal
        open={showSaveTemplateModal}
        onOpenChange={setShowSaveTemplateModal}
        onSave={handleSaveTemplate}
        segmentCount={segments.length}
      />
    </div>
  );
}
