import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';
import {
  Kanban,
  MessageCircle,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  FolderOpen,
  Film,
  Clapperboard,
} from 'lucide-react';

interface FeatureLink {
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

const allFeatures: FeatureLink[] = [
  { name: 'Kanban', href: '/funcionalidades/kanban', icon: Kanban, description: 'Quadro visual de projetos' },
  { name: 'Chat', href: '/funcionalidades/chat', icon: MessageCircle, description: 'Comunicação de equipa' },
  { name: 'CRM', href: '/funcionalidades/crm', icon: Users, description: 'Gestão de clientes' },
  { name: 'Calendário', href: '/funcionalidades/calendario', icon: Calendar, description: 'Agenda integrada' },
  { name: 'Pagamentos', href: '/funcionalidades/pagamentos', icon: CreditCard, description: 'Controlo financeiro' },
  { name: 'Relatórios', href: '/funcionalidades/relatorios', icon: BarChart3, description: 'Analytics e insights' },
  { name: 'Media Hub', href: '/funcionalidades/media-hub', icon: FolderOpen, description: 'Gestão de ficheiros' },
  { name: 'Aprovação de Vídeo', href: '/funcionalidades/video-approval', icon: Film, description: 'Review de vídeos' },
  { name: 'Timeline', href: '/funcionalidades/timeline', icon: Clapperboard, description: 'Estrutura de edição' },
];

interface RelatedFeaturesProps {
  currentFeature: string;
  title?: string;
  maxItems?: number;
}

export function RelatedFeatures({ 
  currentFeature, 
  title = 'Explorar Mais Funcionalidades',
  maxItems = 3 
}: RelatedFeaturesProps) {
  const relatedFeatures = allFeatures
    .filter(f => f.href !== currentFeature)
    .slice(0, maxItems);

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground mt-2">
            Descubra como o WillFlow pode transformar o seu fluxo de trabalho
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {relatedFeatures.map((feature, index) => (
            <motion.div
              key={feature.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={feature.href}
                className="group glass-card p-6 flex flex-col items-center text-center hover:border-primary/50 transition-colors block"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{feature.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                <span className="text-primary text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                  Saber mais
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <Link
            to="/funcionalidades"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Ver todas as funcionalidades
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
