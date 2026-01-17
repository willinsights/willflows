import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FileText,
  Scale,
  AlertTriangle,
  CreditCard,
  Shield,
  XCircle,
  Gavel,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const sections = [
  {
    id: 'definicoes',
    title: '1. Definições',
    icon: FileText,
    content: `Para os efeitos destes Termos de Uso:

• **"Serviço"** refere-se à plataforma WillFlow, acessível através de willflow.app
• **"Utilizador"** refere-se a qualquer pessoa singular ou coletiva que utilize o Serviço
• **"Conta"** refere-se ao registo único criado para aceder ao Serviço
• **"Workspace"** refere-se ao espaço de trabalho partilhado dentro da plataforma
• **"Conteúdo"** refere-se a todos os dados, textos, imagens e ficheiros carregados para o Serviço`,
  },
  {
    id: 'servico',
    title: '2. Descrição do Serviço',
    icon: FileText,
    content: `O WillFlow é uma plataforma de gestão de projetos e produção audiovisual que oferece:

• Gestão de projetos com sistema Kanban
• Calendário de produção
• Gestão de clientes e contactos
• Controlo de pagamentos e faturação
• Gestão de equipas e permissões
• Relatórios e analytics

O Serviço é disponibilizado "tal como está" e pode ser atualizado ou modificado a qualquer momento.`,
  },
  {
    id: 'conta',
    title: '3. Registo e Conta',
    icon: Shield,
    content: `Para utilizar o Serviço, deve:

• Ter pelo menos 18 anos de idade
• Fornecer informações verdadeiras e completas no registo
• Manter a confidencialidade das suas credenciais de acesso
• Notificar-nos imediatamente de qualquer uso não autorizado da sua conta

**Responsabilidade:**
É responsável por todas as atividades realizadas na sua conta. Não partilhe as suas credenciais com terceiros.

**Verificação:**
Reservamo-nos o direito de verificar a identidade dos utilizadores e recusar ou cancelar contas em caso de suspeita de fraude.`,
  },
  {
    id: 'utilizacao',
    title: '4. Regras de Utilização',
    icon: AlertTriangle,
    content: `Ao utilizar o Serviço, concorda em:

**Fazer:**
• Cumprir todas as leis aplicáveis
• Respeitar os direitos de propriedade intelectual
• Manter backups dos seus dados importantes
• Reportar vulnerabilidades de segurança

**Não fazer:**
• Utilizar o Serviço para fins ilegais
• Tentar aceder a contas de outros utilizadores
• Carregar conteúdo malicioso ou vírus
• Realizar engenharia reversa do software
• Utilizar bots ou scripts automatizados sem autorização
• Violar direitos de terceiros`,
  },
  {
    id: 'pagamentos',
    title: '5. Pagamentos e Faturação',
    icon: CreditCard,
    content: `**Planos e Preços:**
Os preços dos planos estão disponíveis em willflow.app/planos. Reservamo-nos o direito de alterar os preços com aviso prévio de 30 dias.

**Período de Teste:**
Novos utilizadores podem beneficiar de um período de teste gratuito. No final do período, será necessário subscrever um plano pago para continuar a utilizar o Serviço.

**Pagamentos:**
• Os pagamentos são processados através do Stripe
• A faturação é mensal ou anual, conforme o plano escolhido
• Os pagamentos são devidos no início de cada período de faturação
• Todas as taxas são apresentadas com IVA incluído (quando aplicável)

**Reembolsos:**
Não oferecemos reembolsos por períodos parciais. Em caso de insatisfação, pode cancelar a qualquer momento e a subscrição termina no final do período pago.`,
  },
  {
    id: 'propriedade',
    title: '6. Propriedade Intelectual',
    icon: FileText,
    content: `**Propriedade do WillFlow:**
Todos os direitos sobre o Serviço, incluindo software, design, logótipos e marcas, pertencem à WillFlow. Não é concedida qualquer licença para utilizar a nossa propriedade intelectual além do uso normal do Serviço.

**Propriedade do Utilizador:**
Mantém todos os direitos sobre o conteúdo que carrega para o Serviço. Ao carregar conteúdo, concede-nos uma licença limitada para armazenar, processar e exibir esse conteúdo conforme necessário para fornecer o Serviço.

**Feedback:**
Qualquer feedback ou sugestões que nos forneça pode ser utilizado livremente para melhorar o Serviço.`,
  },
  {
    id: 'limitacao',
    title: '7. Limitação de Responsabilidade',
    icon: Scale,
    content: `**Exclusão de Garantias:**
O Serviço é fornecido "tal como está", sem garantias expressas ou implícitas. Não garantimos que o Serviço será ininterrupto, seguro ou livre de erros.

**Limitação de Danos:**
Na máxima extensão permitida por lei, a WillFlow não será responsável por:
• Perda de dados ou lucros cessantes
• Danos indiretos, incidentais ou consequenciais
• Interrupções do serviço ou falhas técnicas
• Ações de terceiros

**Limite Máximo:**
A nossa responsabilidade total não excederá o valor pago pelo Utilizador nos 12 meses anteriores ao evento que originou a responsabilidade.`,
  },
  {
    id: 'rescisao',
    title: '8. Rescisão',
    icon: XCircle,
    content: `**Pelo Utilizador:**
Pode cancelar a sua conta a qualquer momento através das definições da conta. O cancelamento entra em vigor no final do período de faturação atual.

**Pela WillFlow:**
Podemos suspender ou terminar a sua conta se:
• Violar estes Termos de Uso
• Não efetuar os pagamentos devidos
• Utilizar o Serviço de forma abusiva
• Por razões de segurança ou legais

**Após Rescisão:**
• O acesso ao Serviço será imediatamente revogado
• Os seus dados serão eliminados em até 30 dias
• Dados de faturação serão mantidos conforme obrigações legais`,
  },
  {
    id: 'alteracoes',
    title: '9. Alterações aos Termos',
    icon: FileText,
    content: `Reservamo-nos o direito de alterar estes Termos de Uso a qualquer momento.

**Notificação:**
Alterações significativas serão comunicadas com pelo menos 30 dias de antecedência através de email ou notificação na plataforma.

**Aceitação:**
O uso continuado do Serviço após as alterações entrarem em vigor constitui aceitação dos novos termos. Se não concordar com as alterações, deve cessar a utilização do Serviço.`,
  },
  {
    id: 'lei-aplicavel',
    title: '10. Lei Aplicável e Jurisdição',
    icon: Gavel,
    content: `**Lei Aplicável:**
Estes Termos de Uso são regidos pela lei portuguesa.

**Jurisdição:**
Qualquer litígio emergente destes Termos será submetido à jurisdição exclusiva dos tribunais portugueses, com foro na comarca de Lisboa.

**Resolução de Litígios:**
Antes de recorrer aos tribunais, encorajamos a resolução amigável de qualquer disputa. Pode contactar-nos através de geral@willflow.app.`,
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Termos de Uso | WillFlow</title>
        <meta name="description" content="Termos de Uso do WillFlow. Conheça as condições de utilização da nossa plataforma de gestão de projetos audiovisuais." />
        <link rel="canonical" href="https://willflow.app/termos" />
      </Helmet>

      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-2xl bg-primary/10">
                <FileText className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Termos de <span className="gradient-text">Uso</span>
            </h1>
            <p className="text-muted-foreground mb-4">
              Última atualização: 17 de Janeiro de 2025
            </p>
            <p className="text-lg text-muted-foreground">
              Ao utilizar o WillFlow, concorda com estes termos. Leia-os atentamente antes de utilizar o nosso serviço.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6"
          >
            <h2 className="font-bold text-lg mb-4">Índice</h2>
            <nav className="grid sm:grid-cols-2 gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </motion.div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              viewport={{ once: true }}
              className="glass-card p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{section.title}</h2>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {section.content.split('\n').map((paragraph, i) => {
                  if (paragraph.startsWith('•')) {
                    return (
                      <p key={i} className="text-muted-foreground ml-4">
                        {paragraph}
                      </p>
                    );
                  }
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return (
                      <p key={i} className="font-semibold text-foreground mt-4">
                        {paragraph.replace(/\*\*/g, '')}
                      </p>
                    );
                  }
                  return (
                    <p key={i} className="text-muted-foreground">
                      {paragraph.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </p>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-8 md:p-12 text-center max-w-3xl mx-auto"
          >
            <h2 className="text-2xl font-bold mb-4">
              Tem questões sobre os termos?
            </h2>
            <p className="text-muted-foreground mb-6">
              Contacte a nossa equipa para esclarecer qualquer dúvida.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/ajuda">
                <Button variant="outline">Contactar Suporte</Button>
              </Link>
              <Link to="/auth?trial=true">
                <Button className="gradient-primary">
                  Começar teste grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
