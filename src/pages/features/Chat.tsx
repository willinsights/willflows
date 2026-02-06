import { Helmet } from 'react-helmet-async';
import {
  MessageCircle,
  Hash,
  AtSign,
  CheckSquare,
  Bell,
  Clock,
  Paperclip,
  Search,
  ThumbsUp,
  Reply,
  Users,
  FolderKanban,
} from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FeatureHero } from '@/components/marketing/FeatureHero';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import { RelatedFeatures } from '@/components/marketing/RelatedFeatures';
import { AutoBreadcrumbs } from '@/components/seo/Breadcrumbs';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const flowSteps = [
  {
    icon: MessageCircle,
    title: 'Mensagem',
    description: 'Membro envia mensagem no canal do projeto',
  },
  {
    icon: CheckSquare,
    title: 'Criar Tarefa',
    description: 'Transforma a mensagem numa tarefa com um clique',
  },
  {
    icon: Users,
    title: 'Atribuir',
    description: 'Atribui a um membro da equipa',
  },
  {
    icon: FolderKanban,
    title: 'Projeto Atualizado',
    description: 'Tarefa aparece no Kanban do projeto',
  },
];

const comparisonItems = [
  { feature: 'Canais por projeto', competitor: false, willflow: true },
  { feature: 'Criar tarefas de mensagens', competitor: false, willflow: true },
  { feature: 'Contexto do projeto visível', competitor: false, willflow: true },
  { feature: 'Follow-ups e lembretes', competitor: 'partial' as const, willflow: true },
  { feature: 'Threads organizadas', competitor: true, willflow: true },
  { feature: 'Reações e menções', competitor: true, willflow: true },
  { feature: 'Histórico por cliente', competitor: false, willflow: true },
  { feature: 'Integrado com Kanban', competitor: false, willflow: true },
];

export default function ChatFeature() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Chat de Equipa Integrado | WillFlow - Comunicação Interna para Produtoras</title>
        <meta
          name="description"
          content="Chat de equipa integrado aos projetos. Comunicação interna que transforma mensagens em tarefas. Canais por projeto, threads, follow-ups e mais."
        />
        <link rel="canonical" href="https://willflow.app/funcionalidades/chat" />
        <meta property="og:title" content="Chat de Equipa Integrado | WillFlow" />
        <meta property="og:description" content="Chat de equipa integrado aos projetos. Comunicação interna que transforma mensagens em tarefas." />
        <meta property="og:url" content="https://willflow.app/funcionalidades/chat" />
        <meta property="og:type" content="product" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Chat de Equipa Integrado | WillFlow" />
        <meta name="twitter:description" content="Chat de equipa integrado aos projetos. Comunicação interna que transforma mensagens em tarefas." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow Chat",
            "description": "Chat de equipa integrado com gestão de projetos para produtoras visuais.",
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
              { "@type": "ListItem", "position": 3, "name": "Chat", "item": "https://willflow.app/funcionalidades/chat" }
            ]
          })}
        </script>
      </Helmet>

      <PublicHeader />

      <div className="pt-24 pb-4 px-4">
        <div className="container mx-auto">
          <AutoBreadcrumbs />
        </div>
      </div>

      {/* Hero */}
      <FeatureHero
        icon={MessageCircle}
        badge="Comunicação Interna"
        title="Chat de Equipa que"
        titleHighlight="Cria Resultados"
        subtitle="Comunicação interna integrada aos projetos. Cada mensagem conectada ao contexto. Transforma conversas em ações sem sair do chat."
        screenshot="/screenshots/banner-chat.png"
      />

      {/* Clarificação */}
      <section className="py-8 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 max-w-3xl mx-auto text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold">Comunicação Interna da Equipa</span>
            </div>
            <p className="text-muted-foreground">
              O Chat do WillFlow é exclusivo para a sua equipa. Coordene projetos, partilhe atualizações 
              e crie tarefas — tudo internamente. Para comunicação com clientes finais, 
              utilize o email ou outras ferramentas externas.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Flow Diagram */}
      <FlowDiagram
        title="De Mensagem a Ação em Segundos"
        subtitle="O fluxo mais rápido para transformar conversas em trabalho real"
        steps={flowSteps}
        direction="horizontal"
      />

      {/* Feature Sections */}
      <FeatureSection
        icon={Hash}
        title="Canais por Projeto"
        description="Cada projeto tem automaticamente o seu próprio canal. O contexto está sempre visível — nunca mais perca tempo a procurar conversas."
        screenshot="/screenshots/banner-chat.png"
        features={[
          'Canal criado automaticamente com cada projeto',
          'Painel lateral com detalhes do projeto',
          'Membros da equipa atribuídos visíveis',
          'Acesso rápido ao Kanban e tarefas',
        ]}
      />

      <FeatureSection
        icon={CheckSquare}
        title="Criar Tarefas de Mensagens"
        description="Transforme qualquer mensagem numa tarefa com um clique. Atribua a um membro, defina prazo e veja-a aparecer no Kanban."
        screenshot="/screenshots/banner-chat.png"
        features={[
          'Um clique para criar tarefa',
          'Atribuir a qualquer membro da equipa',
          'Definir prazo e prioridade',
          'Link direto para a mensagem original',
        ]}
        reversed
      />

      <FeatureSection
        icon={Clock}
        title="Follow-ups e Lembretes"
        description="Marque mensagens para follow-up e receba lembretes. Nunca mais esqueça um compromisso ou pedido importante."
        screenshot="/screenshots/banner-calendario.png"
        features={[
          'Marcar mensagem para follow-up',
          'Definir data e hora do lembrete',
          'Notificações automáticas',
          'Inbox de follow-ups pendentes',
        ]}
      />

      <FeatureSection
        icon={Reply}
        title="Threads e Reações"
        description="Mantenha conversas organizadas com threads. Reaja a mensagens sem poluir o feed principal."
        screenshot="/screenshots/banner-chat.png"
        features={[
          'Threads para discussões paralelas',
          'Reações com emojis',
          'Menções com @utilizador',
          'Read receipts estilo WhatsApp',
        ]}
        reversed
      />

      <FeatureSection
        icon={Paperclip}
        title="Anexos e Pesquisa"
        description="Partilhe ficheiros, imagens e vídeos diretamente no chat. Pesquise em todas as conversas instantaneamente."
        screenshot="/screenshots/banner-chat.png"
        features={[
          'Upload de imagens e vídeos',
          'Partilha de documentos',
          'Pesquisa full-text em mensagens',
          'Filtros por data e membro',
        ]}
      />

      {/* Comparison */}
      <ComparisonTable
        title="WillFlow Chat vs WhatsApp / Slack"
        subtitle="Porque é que um chat integrado faz toda a diferença"
        competitorName="WhatsApp / Slack"
        items={comparisonItems}
      />

      <RelatedFeatures currentFeature="/funcionalidades/chat" />

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto"
          >
            <MessageCircle className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Experimente o Chat Integrado
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              30 dias grátis. Sem cartão necessário. Veja como a comunicação muda quando está conectada aos projetos.
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
