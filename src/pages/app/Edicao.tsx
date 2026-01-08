import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter, Search, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Edicao() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  // Mock columns for Edição
  const columns = [
    { id: '1', name: 'A iniciar', color: '#6b7280', tasks: 4 },
    { id: '2', name: 'Em edição', color: '#8b5cf6', tasks: 6 },
    { id: '3', name: 'Em revisão', color: '#f59e0b', tasks: 3 },
    { id: '4', name: 'Entregue', color: '#22c55e', tasks: 10, isFinal: true },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold">Edição</h1>
          <p className="text-muted-foreground">Acompanhe o progresso da pós-produção</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar..." className="pl-9 w-full sm:w-[200px]" />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nova Tarefa</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6 pt-2">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((column, index) => (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'flex flex-col w-[300px] rounded-xl',
                column.isFinal ? 'bg-success/5' : 'bg-muted/30'
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <span className="font-medium">{column.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {column.tasks}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Content */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {Array.from({ length: column.tasks }).map((_, i) => (
                  <div
                    key={i}
                    className="glass-card p-3 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {i % 2 === 0 ? 'Vídeo' : 'Foto'}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm mb-1">
                      Edição Projeto {i + 1}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Cliente XYZ
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        15/01/2026
                      </span>
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        M
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
