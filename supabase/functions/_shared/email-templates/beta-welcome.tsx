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

interface BetaWelcomeEmailProps {
  name?: string
  appUrl?: string
}

const APP_URL_DEFAULT = 'https://willflow.app'

export const BetaWelcomeEmail = ({
  name,
  appUrl = APP_URL_DEFAULT,
}: BetaWelcomeEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Bem-vindo ao WillFlow Beta — a tua conta está pronta.</Preview>
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
            A tua conta foi criada com sucesso. Estás oficialmente entre os
            primeiros a experimentar o <strong>WillFlow</strong>.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>🎁 Benefícios de beta tester</Text>
            <Text style={highlightItem}>• Acesso antecipado a todas as funcionalidades</Text>
            <Text style={highlightItem}>• Desconto especial no lançamento</Text>
            <Text style={highlightItem}>• Canal direto para feedback</Text>
            <Text style={highlightItem}>• Contribuição para moldar o produto</Text>
          </Section>

          <Heading as="h3" style={h3}>Próximos passos</Heading>

          <Section style={stepBox}>
            <Text style={stepTitle}>1. Cria o teu workspace</Text>
            <Text style={stepDesc}>Personaliza o Kanban para o teu fluxo.</Text>
          </Section>
          <Section style={stepBox}>
            <Text style={stepTitle}>2. Adiciona os teus clientes</Text>
            <Text style={stepDesc}>Centraliza tudo num só lugar.</Text>
          </Section>
          <Section style={stepBox}>
            <Text style={stepTitle}>3. Cria o teu primeiro projeto</Text>
            <Text style={stepDesc}>Acompanha da captação à entrega.</Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={`${appUrl}/app`} style={button}>
              Começar a usar
            </Button>
          </Section>

          <Text style={footerNote}>
            Tens alguma dúvida ou feedback? Responde diretamente a este email.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>Obrigado por fazeres parte do beta 💜</Text>
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
const highlightBox = { background: '#f0fdf4', borderLeft: '4px solid #22c55e', borderRadius: '0 8px 8px 0', padding: '16px 18px', margin: '20px 0' }
const highlightTitle = { color: '#166534', fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }
const highlightItem = { color: '#166534', fontSize: '14px', margin: '2px 0' }
const stepBox = { background: '#f4f4f5', borderRadius: '8px', padding: '12px 16px', margin: '8px 0' }
const stepTitle = { color: '#18181b', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }
const stepDesc = { color: '#71717a', fontSize: '13px', margin: 0 }
const button = { background: '#7c3aed', color: '#ffffff', padding: '14px 36px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', textDecoration: 'none' }
const footerNote = { color: '#71717a', fontSize: '13px', textAlign: 'center' as const, marginTop: '24px' }
const footer = { padding: '20px 28px', backgroundColor: '#f4f4f5', textAlign: 'center' as const, borderRadius: '0 0 12px 12px' }
const footerText = { color: '#71717a', fontSize: '12px', margin: '2px 0' }
