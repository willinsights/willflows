import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Props { projectId: string; workspaceId: string }

export function ShotListSection({ projectId, workspaceId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const key = ['shot-list', projectId];

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('shot_list_items').select('*').eq('project_id', projectId).order('position');
      if (error) throw error;
      return data;
    },
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['shot-templates', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.from('shot_list_templates').select('*').eq('workspace_id', workspaceId).order('name');
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const add = async (titles: string[]) => {
    const base = items.length;
    const rows = titles.filter(Boolean).map((t, i) => ({ project_id: projectId, workspace_id: workspaceId, title: t.slice(0, 300), position: base + i }));
    if (!rows.length) return;
    const { error } = await supabase.from('shot_list_items').insert(rows);
    if (error) return toast.error('Não foi possível adicionar. Verifique se pode editar este projeto.');
    setTitle('');
    refresh();
  };

  const toggle = async (id: string, done: boolean) => {
    const { error } = await supabase.from('shot_list_items').update({ done, done_by: done ? user?.id : null, done_at: done ? new Date().toISOString() : null }).eq('id', id);
    if (error) toast.error('Não foi possível atualizar');
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('shot_list_items').delete().eq('id', id);
    if (error) toast.error('Não foi possível remover');
    refresh();
  };

  const saveTemplate = async () => {
    const name = window.prompt('Nome do modelo (ex.: Casamento)');
    if (!name?.trim()) return;
    const { error } = await supabase.from('shot_list_templates').insert({ workspace_id: workspaceId, name: name.trim().slice(0, 120), items: items.map(i => i.title), created_by: user?.id });
    if (error) return toast.error('Não foi possível guardar o modelo');
    toast.success('Modelo guardado');
    qc.invalidateQueries({ queryKey: ['shot-templates', workspaceId] });
  };

  const done = items.filter(i => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  if (error) return <p className="text-sm text-destructive">Não foi possível carregar a lista de fotos.</p>;

  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-card/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Fotos obrigatórias</h3>
          <p className="text-xs text-muted-foreground">{items.length ? `${done} de ${items.length} feitas · faltam ${items.length - done}` : 'O que não pode faltar nesta sessão'}</p>
        </div>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <Select onValueChange={(id) => { const t = templates.find(x => x.id === id); if (t) add((t.items as string[]) ?? []); }}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Usar modelo" /></SelectTrigger>
              <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {items.length > 0 && <Button size="sm" variant="outline" onClick={saveTemplate}><Save className="mr-1 h-4 w-4" />Guardar modelo</Button>}
        </div>
      </div>
      {items.length > 0 && <Progress value={pct} className="h-2" />}
      {isLoading ? <div className="h-16 animate-pulse rounded bg-muted" /> : (
        <ul className="space-y-1">
          {items.map(i => (
            <li key={i.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
              <Checkbox checked={i.done} onCheckedChange={(v) => toggle(i.id, v === true)} aria-label={`Marcar ${i.title}`} className="h-5 w-5" />
              <span className={i.done ? 'flex-1 text-muted-foreground line-through' : 'flex-1'}>{i.title}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(i.id)} aria-label="Remover"><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add([title.trim()]); }}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Noivos com os pais" maxLength={300} />
        <Button type="submit" disabled={!title.trim()}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
      </form>
    </section>
  );
}
