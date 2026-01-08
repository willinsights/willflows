import { motion } from 'framer-motion';
import { Search, Filter, Calendar, Download, MoreHorizontal, Camera, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data for completed projects
const completedProjects = [
  { id: '1', name: 'Casamento Costa', client: 'Ana Costa', type: 'video', deliveredAt: '2026-01-05', value: 2500 },
  { id: '2', name: 'Hotel Algarve', client: 'Grupo Pestana', type: 'foto', deliveredAt: '2026-01-03', value: 1800 },
  { id: '3', name: 'Evento Startup', client: 'TechLisbon', type: 'foto_video', deliveredAt: '2025-12-28', value: 3200 },
  { id: '4', name: 'Campanha Moda', client: 'Fashion Brand', type: 'foto', deliveredAt: '2025-12-20', value: 1500 },
  { id: '5', name: 'Documentário Local', client: 'Câmara Municipal', type: 'video', deliveredAt: '2025-12-15', value: 4500 },
  { id: '6', name: 'Produto E-commerce', client: 'Loja Online', type: 'foto', deliveredAt: '2025-12-10', value: 800 },
];

export default function Finalizados() {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Film;
      case 'foto': return Camera;
      default: return Camera;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Vídeo';
      case 'foto': return 'Foto';
      case 'foto_video': return 'Foto + Vídeo';
      default: return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finalizados</h1>
          <p className="text-muted-foreground">Arquivo de projetos entregues</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar projetos..." className="pl-9 w-full sm:w-[250px]" />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Filtrar período</span>
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {completedProjects.map((project, index) => {
          const TypeIcon = getTypeIcon(project.type);
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass-card hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
                        <TypeIcon className="h-5 w-5 text-success" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(project.type)}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Duplicar projeto</DropdownMenuItem>
                        <DropdownMenuItem>Reabrir projeto</DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Exportar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-semibold mb-1">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{project.client}</p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Entregue: {new Date(project.deliveredAt).toLocaleDateString('pt-PT')}
                    </span>
                    <span className="font-medium text-success">
                      €{project.value.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Load More */}
      <div className="flex justify-center pt-4">
        <Button variant="outline">
          Carregar mais projetos
        </Button>
      </div>
    </div>
  );
}
