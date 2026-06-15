/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface WelcomeEmailProps {
  name?: string
  appUrl?: string
}

const APP_URL_DEFAULT = 'https://willflow.app'

export const WelcomeEmail = ({
  name,
  appUrl = APP_URL_DEFAULT,
}: WelcomeEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Bem-vindo ao WillFlow — vamos começar.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Bem-vindo ao WillFlow!</Heading>
          <Text style={subtitle}>Gestão de Projetos para Criativos</Text>
        </Section>

        <Section style={content}>
          <Heading as="h2" style={h2}>
            {name ? `Olá ${name}! 👋` : 'Olá! 👋'}
          </Heading>

          <Text style={paragraph}>
            Que bom ter-te connosco. O <strong>WillFlow</strong> foi criado
            para fotógrafos e filmmakers que querem organizar o seu trabalho
            de forma profissional — da captação à entrega final.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>🎁 Bónus de Lançamento</Text>
            <Text style={highlightItem}>
              30 dias grátis para experimentares todas as funcionalidades sem
              compromisso.
            </Text>
          </Section>

          <Heading as="h3" style={h3}>O que podes fazer já</Heading>

          <Section style={stepBox}>
            <Text style={stepTitle}>📋 Kanban Visual</Text>
            <Text style={stepDesc}>Acompanha cada projeto no fluxo certo.</Text>
          </Section>
          <Section style={stepBox}>
            <Text style={stepTitle}>👥 CRM Integrado</Text>
            <Text style={stepDesc}>Todos os teus clientes num só lugar.</Text>
          </Section>
          <Section style={stepBox}>
            <Text style={stepTitle}>💰 Financeiro</Text>
            <Text style={stepDesc}>Controla receitas, custos e pagamentos.</Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={`${appUrl}/app`} style={button}>
              Começar a usar
            </Button>
          </Section>

          <Text style={footerNote}>
            Precisas de ajuda? Responde a este email ou usa o separador de
            Feedback dentro da app.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>Obrigado por escolheres o WillFlow 💜</Text>
          <Text style={footerText}>© {new Date().getFullYear()} WillFlow</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '0' }
const header = { background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', padding: '40px 30px', textAlign: 'center' as const, borderRadius: '12px 12px 0 0' }
const h1 = { color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 8px' }
const subtitle = { color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: 0 }
const content = { padding: '32px 28px', backgroundColor: '#ffffff' }
const h2 = { color: '#18181b', fontSize: '22px', fontWeight: 600, margin: '0 0 16px' }
const h3 = { color: '#18181b', fontSize: '18px', fontWeight: 600, margin: '24px 0 12px' }
const paragraph = { color: '#52525b', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const highlightBox = { background: '#f5f3ff', borderLeft: '4px solid #7c3aed', borderRadius: '0 8px 8px 0', padding: '16px 18px', margin: '20px 0' }
const highlightTitle = { color: '#5b21b6', fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }
const highlightItem = { color: '#5b21b6', fontSize: '14px', margin: '2px 0' }
const stepBox = { background: '#f4f4f5', borderRadius: '8px', padding: '12px 16px', margin: '8px 0' }
const stepTitle = { color: '#18181b', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }
const stepDesc = { color: '#71717a', fontSize: '13px', margin: 0 }
const button = { background: '#7c3aed', color: '#ffffff', padding: '14px 36px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', textDecoration: 'none' }
const footerNote = { color: '#71717a', fontSize: '13px', textAlign: 'center' as const, marginTop: '24px' }
const footer = { padding: '20px 28px', backgroundColor: '#f4f4f5', textAlign: 'center' as const, borderRadius: '0 0 12px 12px' }
const footerText = { color: '#71717a', fontSize: '12px', margin: '2px 0' }
