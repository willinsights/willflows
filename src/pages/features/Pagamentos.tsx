import { Helmet } from 'react-helmet-async';
import {
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Filter,
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
    icon: CreditCard,
    title: 'Projeto Criado',
    description: 'Valor acordado com cliente',
  },
  {
    icon: Clock,
    title: 'Pendente',
    description: 'Aguarda pagamento',
  },
  {
    icon: CheckCircle,
    title: 'Pago',
    description: 'Pagamento recebido',
  },
  {
    icon: TrendingUp,
    title: 'Dashboard',
    description: 'Métricas atualizadas',
  },
];

const comparisonItems = [
  { feature: 'A receber vs A pagar', competitor: true, willflow: true },
  { feature: 'Status por pagamento', competitor: true, willflow: true },
  { feature: 'Alertas de vencido', competitor: 'partial' as const, willflow: true },
  { feature: 'Ligação a projetos', competitor: false, willflow: true },
  { feature: 'Ligação a clientes', competitor: false, willflow: true },
  { feature: 'Export Excel', competitor: true, willflow: true },
  { feature: 'Export PDF', competitor: 'partial' as const, willflow: true },
  { feature: 'Dashboard financeiro', competitor: false, willflow: true },
];

export default function PagamentosFeature() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Gestão de Pagamentos | WillFlow - Controlo Financeiro para Produtoras</title>
        <meta
          name="description"
          content="Controle receitas e custos de forma simples. A receber vs a pagar, status de pagamento, alertas de vencido, export Excel/PDF e dashboard financeiro."
        />
        <link rel="canonical" href="https://willflow.app/funcionalidades/pagamentos" />
        <meta property="og:title" content="Gestão de Pagamentos | WillFlow" />
        <meta property="og:description" content="Controle receitas e custos de forma simples. Dashboard financeiro integrado com projetos." />
        <meta property="og:url" content="https://willflow.app/funcionalidades/pagamentos" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow Pagamentos",
            "description": "Gestão financeira integrada para produtoras visuais.",
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
              { "@type": "ListItem", "position": 3, "name": "Pagamentos", "item": "https://willflow.app/funcionalidades/pagamentos" }
            ]
          })}
        </script>
      </Helmet>

      <PublicHeader />

      <FeatureHero
        icon={CreditCard}
        badge="Controlo Financeiro"
        title="Pagamentos sob"
        titleHighlight="Controlo Total"
        subtitle="Saiba exatamente o que tem a receber e a pagar. Alertas de vencido, previsão de cash flow e export para faturação."
        screenshot="/screenshots/screenshot-pagamentos.png"
      />

      <FlowDiagram
        title="Do Projeto ao Pagamento Recebido"
        subtitle="Acompanhe cada euro desde o acordo até ao banco"
        steps={flowSteps}
        direction="horizontal"
      />

      <FeatureSection
        icon={ArrowDownCircle}
        title="A Receber (Clientes)"
        description="Veja todos os pagamentos que tem a receber de clientes. Organize por projeto, data de vencimento ou status."
        screenshot="/screenshots/screenshot-pagamentos.png"
        features={[
          'Lista de receitas pendentes',
          'Filtros por cliente e projeto',
          'Datas de vencimento claras',
          'Marcar como pago com um click',
        ]}
      />

      <FeatureSection
        icon={ArrowUpCircle}
        title="A Pagar (Freelancers)"
        description="Controle os pagamentos que tem a fazer a colaboradores e fornecedores. Nunca mais atrase um pagamento."
        screenshot="/screenshots/screenshot-pagamentos-estudio.png"
        features={[
          'Lista de custos pendentes',
          'Dados bancários do freelancer',
          'Associação a projetos',
          'Histórico de pagamentos',
        ]}
        reversed
      />

      <FeatureSection
        icon={AlertTriangle}
        title="Alertas de Vencido"
        description="Receba notificações quando um pagamento está vencido. Cores visuais indicam o status de cada item."
        screenshot="/screenshots/screenshot-dashboard-light-full.png"
        features={[
          'Alerta visual de vencido',
          'Notificações automáticas',
          'Cores por status',
          'Ordenar por urgência',
        ]}
      />

      <FeatureSection
        icon={FileSpreadsheet}
        title="Export Excel e PDF"
        description="Exporte dados para a sua contabilidade ou faturação. Excel para trabalhar os dados, PDF para partilhar relatórios."
        screenshot="/screenshots/screenshot-relatorios-6m.png"
        features={[
          'Export Excel completo',
          'Export PDF formatado',
          'Filtrar antes de exportar',
          'Dados prontos para faturação',
        ]}
        reversed
      />

      <ComparisonTable
        title="WillFlow vs Spreadsheets"
        subtitle="Mais do que uma lista — controlo financeiro real"
        competitorName="Excel / Google Sheets"
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
            <CreditCard className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Tome Controlo das Suas Finanças
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              30 dias grátis. Sem cartão necessário. Saiba sempre onde está o seu dinheiro.
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
