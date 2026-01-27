import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Shield,
  FileText,
  Mail,
  Clock,
  Users,
  Database,
  Lock,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const sections = [
  {
    id: 'responsavel',
    title: '1. Responsável pelo Tratamento',
    icon: Users,
    content: `O responsável pelo tratamento dos seus dados pessoais é a WillFlow, com sede em Portugal.

Para questões relacionadas com a proteção de dados, pode contactar-nos através do email: geral@willflow.app`,
  },
  {
    id: 'dados-recolhidos',
    title: '2. Dados Pessoais Recolhidos',
    icon: Database,
    content: `Recolhemos os seguintes dados pessoais:

**Dados de Registo:**
• Nome completo
• Endereço de email
• Número de telefone (opcional)

**Dados de Utilização:**
• Informação de projetos e clientes que insere na plataforma
• Dados de pagamentos e faturação
• Registos de atividade e logs de acesso

**Dados Técnicos:**
• Endereço IP
• Tipo de browser e dispositivo
• Cookies e tecnologias similares`,
  },
  {
    id: 'finalidade',
    title: '3. Finalidade do Tratamento',
    icon: FileText,
    content: `Tratamos os seus dados pessoais para as seguintes finalidades:

• **Prestação do Serviço:** Fornecer acesso e funcionalidades da plataforma WillFlow
• **Gestão de Conta:** Criar e gerir a sua conta de utilizador
• **Comunicações:** Enviar notificações sobre o serviço, atualizações e suporte
• **Faturação:** Processar pagamentos e emitir faturas
• **Melhorias:** Analisar o uso da plataforma para melhorar os nossos serviços
• **Segurança:** Detetar e prevenir fraude e acessos não autorizados
• **Obrigações Legais:** Cumprir obrigações legais e regulamentares`,
  },
  {
    id: 'base-legal',
    title: '4. Base Legal',
    icon: Shield,
    content: `O tratamento dos seus dados baseia-se nas seguintes bases legais:

• **Execução de Contrato:** Para fornecer o serviço contratado (Art. 6(1)(b) RGPD)
• **Consentimento:** Para comunicações de marketing, quando aplicável (Art. 6(1)(a) RGPD)
• **Interesse Legítimo:** Para melhorias do serviço e segurança (Art. 6(1)(f) RGPD)
• **Obrigação Legal:** Para cumprimento de obrigações fiscais e legais (Art. 6(1)(c) RGPD)`,
  },
  {
    id: 'retencao',
    title: '5. Período de Retenção',
    icon: Clock,
    content: `Mantemos os seus dados pessoais enquanto a sua conta estiver ativa.

**Após cancelamento da conta:**
• Dados de conta: eliminados em até 30 dias
• Dados de faturação: mantidos por 10 anos (obrigação legal fiscal)
• Logs de segurança: mantidos por 12 meses

Pode solicitar a eliminação antecipada dos seus dados, exceto quando legalmente obrigados a reter.`,
  },
  {
    id: 'direitos',
    title: '6. Os Seus Direitos',
    icon: Lock,
    content: `Ao abrigo do RGPD, tem os seguintes direitos:

• **Direito de Acesso:** Obter confirmação e acesso aos seus dados pessoais
• **Direito de Retificação:** Corrigir dados inexatos ou incompletos
• **Direito ao Apagamento:** Solicitar a eliminação dos seus dados ("direito ao esquecimento")
• **Direito à Portabilidade:** Receber os seus dados em formato estruturado
• **Direito de Oposição:** Opor-se ao tratamento em certas circunstâncias
• **Direito de Limitação:** Limitar o tratamento dos seus dados
• **Direito de Retirar Consentimento:** Retirar o consentimento a qualquer momento

Para exercer os seus direitos, contacte-nos através de: geral@willflow.app`,
  },
  {
    id: 'subprocessadores',
    title: '7. Subprocessadores',
    icon: Globe,
    content: `Utilizamos os seguintes subprocessadores para fornecer o nosso serviço:

| Subprocessador | Finalidade | Localização |
|----------------|------------|-------------|
| Supabase (AWS) | Base de dados e autenticação | União Europeia |
| Stripe | Processamento de pagamentos | União Europeia / EUA* |
| Resend | Envio de emails transacionais | União Europeia |

*Stripe opera ao abrigo de cláusulas contratuais-tipo aprovadas pela Comissão Europeia.

Todos os subprocessadores estão vinculados por acordos de processamento de dados conformes com o RGPD.`,
  },
  {
    id: 'seguranca',
    title: '8. Medidas de Segurança',
    icon: Shield,
    content: `Implementamos medidas técnicas e organizativas para proteger os seus dados:

• Encriptação em trânsito (TLS 1.3) e em repouso (AES-256)
• Servidores localizados na União Europeia
• Autenticação segura com opção de 2FA
• Controlo de acesso baseado em funções
• Backups automáticos com retenção de 30 dias
• Monitorização contínua de segurança`,
  },
  {
    id: 'reclamacoes',
    title: '9. Reclamações',
    icon: Mail,
    content: `Se considerar que o tratamento dos seus dados viola a legislação de proteção de dados, tem o direito de apresentar uma reclamação junto da autoridade de controlo:

**Comissão Nacional de Proteção de Dados (CNPD)**
Av. D. Carlos I, 134 - 1.º
1200-651 Lisboa
Portugal
Website: www.cnpd.pt`,
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Política de Privacidade | WillFlow</title>
        <meta name="description" content="Política de Privacidade do WillFlow. Saiba como recolhemos, usamos e protegemos os seus dados pessoais em conformidade com o RGPD." />
        <link rel="canonical" href="https://willflow.app/privacidade" />
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
                <Shield className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Política de <span className="gradient-text">Privacidade</span>
            </h1>
            <p className="text-muted-foreground mb-4">
              Última atualização: 17 de Janeiro de 2025
            </p>
            <p className="text-lg text-muted-foreground">
              Esta política explica como a WillFlow recolhe, utiliza e protege os seus dados pessoais 
              em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD).
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
                {(() => {
                  const lines = section.content.split('\n');
                  const tableLines = lines.filter(line => line.startsWith('|'));
                  const textLines = lines.filter(line => !line.startsWith('|'));
                  
                  return (
                    <>
                      {textLines.map((paragraph, i) => {
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
                        if (paragraph.startsWith('*') && !paragraph.startsWith('**')) {
                          return (
                            <p key={i} className="text-sm text-muted-foreground italic">
                              {paragraph.replace(/^\*/, '')}
                            </p>
                          );
                        }
                        return (
                          <p key={i} className="text-muted-foreground">
                            {paragraph.replace(/\*\*(.*?)\*\*/g, '$1')}
                          </p>
                        );
                      })}
                      
                      {tableLines.length > 2 && (
                        <div className="overflow-x-auto mt-4">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-border">
                                {tableLines[0].split('|').filter(Boolean).map((cell, j) => (
                                  <th key={j} className="text-left py-2 px-3 font-medium text-foreground">
                                    {cell.trim()}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableLines.slice(2).map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-border/50">
                                  {row.split('|').filter(Boolean).map((cell, cellIndex) => (
                                    <td key={cellIndex} className="py-2 px-3 text-muted-foreground">
                                      {cell.trim()}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
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
              Tem questões sobre os seus dados?
            </h2>
            <p className="text-muted-foreground mb-6">
              Contacte a nossa equipa de privacidade para esclarecer qualquer dúvida.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:geral@willflow.app">
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  geral@willflow.app
                </Button>
              </a>
              <Link to="/seguranca">
                <Button className="gradient-primary">
                  Ver Segurança
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
