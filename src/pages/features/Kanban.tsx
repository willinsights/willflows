import { Helmet } from 'react-helmet-async';
import {
  Kanban,
  Columns,
  GripVertical,
  Filter,
  CheckCircle,
  AlertTriangle,
  ArrowRightCircle,
  Tag,
  Users,
  Calendar,
} from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FeatureHero } from '@/components/marketing/FeatureHero';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const flowSteps = [
  {
    icon: Kanban,
    title: 'Captação',
    description: 'Projeto criado, sessão agendada',
  },
  {
    icon: Calendar,
    title: 'Sessão',
    description: 'Dia da captação no terreno',
  },
  {
    icon: ArrowRightCircle,
    title: 'Edição',
    description: 'Transição automática para pós-produção',
  },
  {
    icon: CheckCircle,
    title: 'Entregue',
    description: 'Projeto concluído e arquivado',
  },
];

const comparisonItems = [
  { feature: 'Colunas customizáveis', competitor: true, willflow: true },
  { feature: 'Drag & drop', competitor: true, willflow: true },
  { feature: 'Transição automática de fases', competitor: false, willflow: true },
  { feature: 'Filtros por cliente', competitor: 'partial' as const, willflow: true },
  { feature: 'Alertas de checklist pendente', competitor: false, willflow: true },
  { feature: 'Integrado com pagamentos', competitor: false, willflow: true },
  { feature: 'Chat por projeto', competitor: false, willflow: true },
  { feature: 'Fluxo Foto + Vídeo', competitor: false, willflow: true },
];

export default function KanbanFeature() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Kanban Visual para Projetos | WillFlow - Gestão Visual de Produção</title>
        <meta
          name="description"
          content="Kanban visual desenhado para produção fotográfica e vídeo. Colunas customizáveis, transição automática entre fases, filtros avançados e integração completa."
        />
        <link rel="canonical" href="https://willflow.app/funcionalidades/kanban" />
        <meta property="og:title" content="Kanban Visual para Projetos | WillFlow" />
        <meta property="og:description" content="Kanban visual desenhado para produção fotográfica e vídeo. Colunas customizáveis e transição automática entre fases." />
        <meta property="og:url" content="https://willflow.app/funcionalidades/kanban" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow Kanban",
            "description": "Quadro Kanban visual para gestão de projetos de produção visual.",
            "brand": { "@type": "Brand", "name": "WillFlow" },
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "EUR",
              "lowPrice": "0",
              "highPrice": "49.99"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Funcionalidades", "item": "https://willflow.app/funcionalidades" },
              { "@type": "ListItem", "position": 3, "name": "Kanban", "item": "https://willflow.app/funcionalidades/kanban" }
            ]
          })}
        </script>
      </Helmet>

      <PublicHeader />

      <FeatureHero
        icon={Kanban}
        badge="Gestão Visual"
        title="Kanban que Entende"
        titleHighlight="Produção Visual"
        subtitle="Quadro visual desenhado para o fluxo de trabalho de fotografia e vídeo. Da captação à entrega, com transições automáticas entre fases."
        screenshot="/screenshots/screenshot-kanban-full.png"
      />

      <FlowDiagram
        title="Fluxo de Produção Automatizado"
        subtitle="Quando a Captação termina, a Edição começa automaticamente"
        steps={flowSteps}
        direction="horizontal"
      />

      <FeatureSection
        icon={Columns}
        title="Colunas Customizáveis"
        description="Adapte o quadro ao seu fluxo de trabalho. Crie colunas para cada fase do seu processo — orçamento, aprovação, captação, edição, revisão."
        screenshot="/screenshots/screenshot-kanban-full.png"
        features={[
          'Criar colunas ilimitadas',
          'Cores personalizadas por coluna',
          'Reordenar arrastando',
          'Coluna "Entregue" sempre fixa no final',
        ]}
      />

      <FeatureSection
        icon={GripVertical}
        title="Drag & Drop Intuitivo"
        description="Mova projetos entre colunas com um simples arrasto. Veja instantaneamente onde cada projeto está no pipeline."
        screenshot="/screenshots/screenshot-dashboard-light-full.png"
        features={[
          'Arrastar projetos entre colunas',
          'Reordenar dentro da mesma coluna',
          'Feedback visual imediato',
          'Atalhos de teclado para power users',
        ]}
        reversed
      />

      <FeatureSection
        icon={Filter}
        title="Filtros Avançados"
        description="Encontre projetos instantaneamente. Filtre por cliente, tipo (foto/vídeo), prioridade, responsável ou qualquer combinação."
        screenshot="/screenshots/screenshot-projeto-modal.png"
        features={[
          'Filtro por cliente',
          'Filtro por tipo de projeto',
          'Filtro por prioridade',
          'Filtro por membro responsável',
        ]}
      />

      <FeatureSection
        icon={AlertTriangle}
        title="Alertas de Checklist"
        description="Não deixe projetos avançar sem cumprir requisitos. Alertas visuais quando há itens de checklist pendentes."
        screenshot="/screenshots/screenshot-calendario-full.png"
        features={[
          'Checklist por fase do projeto',
          'Alerta visual no cartão',
          'Bloquear transição até completar',
          'Histórico de conclusão',
        ]}
        reversed
      />

      <ComparisonTable
        title="WillFlow Kanban vs Trello / Asana"
        subtitle="Funcionalidades específicas para produção visual"
        competitorName="Trello / Asana"
        items={comparisonItems}
      />

      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto"
          >
            <Kanban className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Veja os Seus Projetos em Ação
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              30 dias grátis. Sem cartão necessário. Experimente um Kanban feito para o seu tipo de trabalho.
            </p>
            <Link to="/auth?trial=true">
              <Button size="lg" className="gradient-primary">
                Começar agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
