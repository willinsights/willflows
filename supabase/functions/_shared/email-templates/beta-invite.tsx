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

interface BetaInviteEmailProps {
  name?: string
  inviteLink: string
  freeDays?: number
}

export const BetaInviteEmail = ({
  name,
  inviteLink,
  freeDays = 30,
}: BetaInviteEmailProps) => {
  const displayName = name || 'criativo(a)'
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>{`Convite exclusivo: ${freeDays} dias grátis no WillFlow`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Olá, {displayName}! 👋</Heading>
            <Text style={subtitle}>WillFlow — Acesso Exclusivo</Text>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>
              Foste selecionado(a) para aceder ao <strong>WillFlow</strong> com{' '}
              <strong>{freeDays} dias grátis</strong> — sem cartão de crédito.
            </Text>

            <Section style={highlightBox}>
              <Text style={highlightTitle}>✨ O que vais ter</Text>
              <Text style={highlightItem}>✓ Gestão completa de projetos</Text>
              <Text style={highlightItem}>✓ Calendário e agendamentos</Text>
              <Text style={highlightItem}>✓ Controlo financeiro simplificado</Text>
              <Text style={highlightItem}>✓ Chat e colaboração em equipa</Text>
            </Section>

            <Text style={paragraph}>
              Clica no botão abaixo para criar a tua conta:
            </Text>

            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button href={inviteLink} style={button}>
                Criar a Minha Conta →
              </Button>
            </Section>

            <Text style={footerNote}>
              Se não conseguires clicar no botão, copia e cola este link:
            </Text>
            <Text style={linkText}>{inviteLink}</Text>

            <Text style={footerNote}>
              Este convite expira em {freeDays} dias.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>© {new Date().getFullYear()} WillFlow — Feito com 💜 em Portugal</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default BetaInviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '0' }
const header = { background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', padding: '40px 30px', textAlign: 'center' as const, borderRadius: '12px 12px 0 0' }
const h1 = { color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 8px' }
const subtitle = { color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: 0 }
const content = { padding: '32px 28px', backgroundColor: '#ffffff' }
const paragraph = { color: '#52525b', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const highlightBox = { background: '#f0fdf4', borderLeft: '4px solid #16a34a', borderRadius: '0 8px 8px 0', padding: '16px 18px', margin: '20px 0' }
const highlightTitle = { color: '#166534', fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }
const highlightItem = { color: '#166534', fontSize: '14px', margin: '2px 0' }
const button = { background: '#7c3aed', color: '#ffffff', padding: '14px 36px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', textDecoration: 'none' }
const footerNote = { color: '#71717a', fontSize: '13px', textAlign: 'center' as const, marginTop: '16px' }
const linkText = { color: '#7c3aed', fontSize: '13px', wordBreak: 'break-all' as const, textAlign: 'center' as const, margin: '8px 0' }
const footer = { padding: '20px 28px', backgroundColor: '#f4f4f5', textAlign: 'center' as const, borderRadius: '0 0 12px 12px' }
const footerText = { color: '#71717a', fontSize: '12px', margin: '2px 0' }
