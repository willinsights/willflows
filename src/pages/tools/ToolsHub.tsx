import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Calculator, Clock, ArrowRight, FileText } from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tools = [
  {
    to: '/ferramentas/calculadora-preco-video',
    icon: Calculator,
    title: 'Calculadora de preço de vídeo',
    description:
      'Descobre quanto cobrar por um vídeo com base em horas de captação, edição, custos e a margem que queres ter.',
  },
  {
    to: '/ferramentas/calculadora-preco-hora',
    icon: Clock,
    title: 'Calculadora de preço/hora',
    description:
      'Calcula o teu valor/hora real a partir dos custos fixos, dias faturáveis e objetivo de rendimento anual.',
  },
];

export default function ToolsHub() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Ferramentas gratuitas para fotógrafos e videomakers | WillFlow</title>
        <meta
          name="description"
          content="Calculadoras gratuitas para fotógrafos e videomakers: preço de um vídeo, valor/hora real e margem de lucro. Sem registo."
        />
        <link rel="canonical" href="https://willflow.app/ferramentas" />
        <meta property="og:title" content="Ferramentas gratuitas para fotógrafos e videomakers" />
        <meta
          property="og:description"
          content="Calculadoras gratuitas de preço de vídeo e valor/hora para profissionais de audiovisual."
        />
        <meta property="og:url" content="https://willflow.app/ferramentas" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Ferramentas gratuitas WillFlow',
            itemListElement: tools.map((t, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: t.title,
              url: `https://willflow.app${t.to}`,
            })),
          })}
        </script>
      </Helmet>

      <PublicHeader />

      <main>
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-5xl text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Ferramentas gratuitas para quem vive de imagem
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Calculadoras simples e sem registo para fotógrafos, videomakers, agências e produtoras
              definirem preços com números em vez de intuição.
            </p>
          </div>
        </section>

        <section className="pb-20 px-4">
          <div className="container mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
            {tools.map((tool) => (
              <Card key={tool.to} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <tool.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>
                    <Link to={tool.to} className="hover:underline">
                      {tool.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link to={tool.to}>
                      Abrir ferramenta <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Card className="md:col-span-2 bg-muted/30">
              <CardHeader>
                <FileText className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Queres isto tudo automático no dia-a-dia?</CardTitle>
                <CardDescription>
                  O WillFlow calcula custos, margem e pagamentos de cada projeto sem folhas de Excel.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild className="gradient-primary">
                  <Link to="/auth">Experimentar gratuitamente</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/funcionalidades/relatorios">Ver relatórios financeiros</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
