import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Server,
  Eye,
  FileCheck,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const securityFeatures = [
  {
    icon: Lock,
    title: 'Encriptação de Ponta a Ponta',
    description: 'Todos os dados são encriptados em trânsito (TLS 1.3) e em repouso (AES-256).',
  },
  {
    icon: Server,
    title: 'Servidores na União Europeia',
    description: 'Os seus dados são armazenados em data centers seguros na UE, em conformidade com o RGPD.',
  },
  {
    icon: Shield,
    title: 'Autenticação Segura',
    description: 'Login seguro com opção de autenticação em dois fatores (2FA).',
  },
  {
    icon: Eye,
    title: 'Controlo de Acesso',
    description: 'Permissões granulares por role: Admin, Editor, Captação, Freelancer, Visualizador.',
  },
  {
    icon: FileCheck,
    title: 'Backups Automáticos',
    description: 'Backups diários automáticos com retenção de 30 dias.',
  },
];

const gdprPoints = [
  'Direito ao acesso dos seus dados',
  'Direito à retificação de dados incorretos',
  'Direito ao apagamento (direito ao esquecimento)',
  'Direito à portabilidade dos dados',
  'Direito de oposição ao processamento',
  'Transparência no uso de dados',
];

export default function Security() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Segurança & <span className="gradient-text">Privacidade</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A segurança dos seus dados é a nossa prioridade. Utilizamos as melhores práticas 
              da indústria para proteger a sua informação.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* GDPR Compliance */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 md:p-12"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileCheck className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Conformidade RGPD</h2>
                <p className="text-muted-foreground">Regulamento Geral sobre a Proteção de Dados</p>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-6">
              O WillFlow está em total conformidade com o RGPD (GDPR), garantindo que os seus direitos 
              como titular de dados são respeitados.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-3">
              {gdprPoints.map((point) => (
                <div key={point} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">{point}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Data Processing */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold mb-6 text-center">Como tratamos os seus dados</h2>
            
            <div className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-2">Dados que recolhemos</h3>
                <p className="text-muted-foreground text-sm">
                  Recolhemos apenas os dados necessários para fornecer o serviço: email, nome, 
                  dados de projetos e clientes que você insere na plataforma.
                </p>
              </div>
              
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-2">Como usamos os dados</h3>
                <p className="text-muted-foreground text-sm">
                  Os seus dados são usados exclusivamente para fornecer e melhorar o serviço. 
                  Não vendemos nem partilhamos dados com terceiros para marketing.
                </p>
              </div>
              
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-2">Retenção de dados</h3>
                <p className="text-muted-foreground text-sm">
                  Mantemos os seus dados enquanto a sua conta estiver ativa. Após cancelamento, 
                  os dados são eliminados em até 30 dias, exceto quando legalmente obrigados a reter.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-4">
              Tem dúvidas sobre segurança?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              A nossa equipa está disponível para esclarecer qualquer questão.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/ajuda">
                <Button variant="outline">Contactar suporte</Button>
              </Link>
              <Link to="/auth?trial=true">
                <Button className="gradient-primary">
                  Começar teste grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
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
