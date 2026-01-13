import { Check, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProjectTemplates, ProjectTemplate } from '@/hooks/useProjectTemplates';

interface ProjectTemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelectTemplate: (template: ProjectTemplate | null) => void;
}

export function ProjectTemplateSelector({ 
  selectedTemplateId, 
  onSelectTemplate 
}: ProjectTemplateSelectorProps) {
  const { templates, loading } = useProjectTemplates();

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[180px] pr-2">
      <div className="space-y-2">
        {/* Empty template option */}
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full h-auto p-3 justify-start text-left",
            !selectedTemplateId && "border-primary bg-primary/5"
          )}
          onClick={() => onSelectTemplate(null)}
        >
          <div className="flex items-start gap-3 w-full">
            <div className={cn(
              "p-2 rounded-lg",
              !selectedTemplateId ? "bg-primary/10" : "bg-muted"
            )}>
              <FileText className={cn(
                "h-4 w-4",
                !selectedTemplateId ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">Projeto em branco</span>
                {!selectedTemplateId && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Começar do zero sem tarefas ou checklist
              </p>
            </div>
          </div>
        </Button>

        {/* Template options */}
        {templates.map((template) => (
          <Button
            key={template.id}
            type="button"
            variant="outline"
            className={cn(
              "w-full h-auto p-3 justify-start text-left",
              selectedTemplateId === template.id && "border-primary bg-primary/5"
            )}
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex items-start gap-3 w-full">
              <div className={cn(
                "p-2 rounded-lg",
                selectedTemplateId === template.id ? "bg-primary/10" : "bg-muted"
              )}>
                <Sparkles className={cn(
                  "h-4 w-4",
                  selectedTemplateId === template.id ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{template.name}</span>
                  {template.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Sistema
                    </Badge>
                  )}
                  {selectedTemplateId === template.id && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {template.description || `${template.task_templates.length} tarefas • ${template.checklist_templates.length} itens de checklist`}
                </p>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
