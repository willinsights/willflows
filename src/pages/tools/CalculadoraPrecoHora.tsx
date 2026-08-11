import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const faqs = [
  {
    q: 'Como calcular o valor/hora de um fotógrafo ou videomaker?',
    a: 'Soma os custos fixos anuais (equipamento, software, seguros, contabilidade, deslocações) ao rendimento líquido que queres receber, acrescenta impostos e divide pelas horas realmente faturáveis do ano — que raramente passam de 50% a 60% do teu tempo de trabalho.',
  },
  {
    q: 'Porque é que não posso faturar 8 horas por dia?',
    a: 'Orçamentos, emails, backups, marketing, contabilidade e reuniões ocupam grande parte da semana. Em estúdios pequenos, o tempo faturável costuma ficar entre 4 e 5 horas por dia útil.',
  },
  {
    q: 'Devo cobrar o mesmo valor/hora a todos os clientes?',
    a: 'O valor/hora é o teu mínimo de referência, não uma tabela pública. Projetos com maior valor para o cliente, urgência ou direitos de utilização alargados justificam preços acima desse mínimo.',
  },
];

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(
    Number.isFinite(v) ? v : 0
  );

export default function CalculadoraPrecoHora() {
  const [desiredIncome, setDesiredIncome] = useState(24000);
  const [fixedCosts, setFixedCosts] = useState(8000);
  const [taxRate, setTaxRate] = useState(25);
  const [workDays, setWorkDays] = useState(220);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [billablePct, setBillablePct] = useState(55);

  const result = useMemo(() => {
    const grossNeeded = desiredIncome / (1 - Math.min(Math.max(taxRate, 0), 90) / 100);
    const revenueNeeded = grossNeeded + fixedCosts;
    const billableHours = workDays * hoursPerDay * (Math.min(Math.max(billablePct, 1), 100) / 100);
    const hourly = billableHours > 0 ? revenueNeeded / billableHours : 0;
    return { revenueNeeded, billableHours, hourly, dayRate: hourly * hoursPerDay };
  }, [desiredIncome, fixedCosts, taxRate, workDays, hoursPerDay, billablePct]);

  const fields: Array<[string, number, (v: number) => void, string]> = [
    ['Rendimento líquido anual (€)', desiredIncome, setDesiredIncome, 'O que queres receber ao fim do ano'],
    ['Custos fixos anuais (€)', fixedCosts, setFixedCosts, 'Equipamento, software, seguros, contabilidade'],
    ['Carga fiscal (%)', taxRate, setTaxRate, 'IRS/IRC + segurança social estimados'],
    ['Dias de trabalho por ano', workDays, setWorkDays, 'Descontando férias e feriados'],
    ['Horas por dia', hoursPerDay, setHoursPerDay, 'Horas de trabalho, não só faturáveis'],
    ['% de horas faturáveis', billablePct, setBillablePct, 'Tipicamente entre 45% e 60%'],
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Calculadora de preço/hora para fotógrafos e videomakers | WillFlow</title>
        <meta
          name="description"
          content="Calcula o teu valor/hora real como fotógrafo ou videomaker: custos fixos, impostos, dias de trabalho e horas faturáveis. Gratuito e sem registo."
        />
        <link rel="canonical" href="https://willflow.app/ferramentas/calculadora-preco-hora" />
        <meta property="og:title" content="Calculadora de preço/hora para criativos" />
        <meta
          property="og:description"
          content="Descobre o valor/hora que precisas de cobrar para o teu estúdio ser sustentável."
        />
        <meta property="og:url" content="https://willflow.app/ferramentas/calculadora-preco-hora" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Calculadora de preço/hora para criativos',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              url: 'https://willflow.app/ferramentas/calculadora-preco-hora',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ])}
        </script>
      </Helmet>

      <PublicHeader />

      <main>
        <section className="pt-16 pb-8 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Calculadora de preço/hora para criativos
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              O valor/hora não é o que gostavas de ganhar — é o que precisas de faturar para cobrir
              custos, impostos e o teu rendimento. Preenche os campos e descobre o teu número.
            </p>
          </div>
        </section>

        <section className="pb-16 px-4">
          <div className="container mx-auto max-w-4xl grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Os teus números</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {fields.map(([label, value, setter, hint]) => (
                  <div key={label} className="space-y-1.5">
                    <Label htmlFor={label}>{label}</Label>
                    <Input
                      id={label}
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setter(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="h-fit sticky top-24">
              <CardHeader>
                <CardTitle>Resultado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Faturação anual necessária</span>
                  <span className="font-medium">{eur(result.revenueNeeded)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Horas faturáveis por ano</span>
                  <span className="font-medium">{Math.round(result.billableHours)} h</span>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Valor/hora mínimo</p>
                  <p className="text-3xl font-bold text-primary">{eur(result.hourly)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Diária de referência: <strong>{eur(result.dayRate)}</strong>
                  </p>
                </div>
                <Button asChild className="w-full gradient-primary">
                  <Link to="/ferramentas/calculadora-preco-video">Usar este valor num orçamento</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="pb-16 px-4">
          <div className="container mx-auto max-w-3xl space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-3">Porque é que o teu valor/hora é maior do que pensas</h2>
              <p className="text-muted-foreground">
                Um dia de filmagem faturado não paga só esse dia: paga também as horas de orçamento,
                os backups, a contabilidade e os meses mais fracos. Quando divides a faturação
                necessária apenas pelas horas realmente faturáveis, o valor sobe — e é esse o número
                que deve suportar todos os teus orçamentos.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">Perguntas frequentes</h2>
              <div className="space-y-5">
                {faqs.map((f) => (
                  <div key={f.q}>
                    <h3 className="font-semibold mb-1">{f.q}</h3>
                    <p className="text-muted-foreground">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-6">
              <h2 className="text-xl font-bold mb-2">Sabe se estás mesmo a cumprir este valor</h2>
              <p className="text-muted-foreground mb-4">
                O WillFlow mostra o custo, a margem e o lucro real de cada projeto — para comparares
                o preço que cobraste com o preço que devias ter cobrado.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="gradient-primary">
                  <Link to="/auth">Começar gratuitamente</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/para-fotografos">WillFlow para fotógrafos</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
