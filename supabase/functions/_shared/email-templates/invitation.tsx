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

interface InvitationEmailProps {
  workspaceName: string
  inviterName?: string
  roleLabel?: string
  inviteLink: string
  appUrl?: string
}

const APP_URL_DEFAULT = 'https://willflow.app'

export const InvitationEmail = ({
  workspaceName,
  inviterName,
  roleLabel,
  inviteLink,
  appUrl = APP_URL_DEFAULT,
}: InvitationEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Foste convidado para colaborar no WillFlow</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Foste convidado(a)! 🎉</Heading>
          <Text style={subtitle}>WillFlow — Gestão para Criativos</Text>
        </Section>

        <Section style={content}>
          <Text style={paragraph}>
            <strong>{inviterName || 'Um utilizador'}</strong> convidou-te para
            te juntares ao workspace{' '}
            <strong>"{workspaceName}"</strong>
            {roleLabel ? <> como <strong>{roleLabel}</strong></> : null}.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>🎁 Bónus de Lançamento</Text>
            <Text style={highlightItem}>
              30 dias grátis para experimentares todas as funcionalidades.
            </Text>
          </Section>

          <Text style={paragraph}>
            Clica no botão abaixo para aceitar o convite e começar a colaborar:
          </Text>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={inviteLink} style={button}>
              Aceitar Convite
            </Button>
          </Section>

          <Text style={footerNote}>
            Se não conseguires clicar no botão, copia e cola este link:
          </Text>
          <Text style={linkText}>{inviteLink}</Text>

          <Text style={footerNote}>
            Este convite expira em 30 dias. Se não o esperavas, podes ignorar
            este email com segurança.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} WillFlow</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InvitationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '0' }
const header = { background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', padding: '40px 30px', textAlign: 'center' as const, borderRadius: '12px 12px 0 0' }
const h1 = { color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 8px' }
const subtitle = { color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: 0 }
const content = { padding: '32px 28px', backgroundColor: '#ffffff' }
const paragraph = { color: '#52525b', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const highlightBox = { background: '#f5f3ff', borderLeft: '4px solid #7c3aed', borderRadius: '0 8px 8px 0', padding: '16px 18px', margin: '20px 0' }
const highlightTitle = { color: '#5b21b6', fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }
const highlightItem = { color: '#5b21b6', fontSize: '14px', margin: '2px 0' }
const button = { background: '#7c3aed', color: '#ffffff', padding: '14px 36px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', textDecoration: 'none' }
const footerNote = { color: '#71717a', fontSize: '13px', textAlign: 'center' as const, marginTop: '16px' }
const linkText = { color: '#7c3aed', fontSize: '13px', wordBreak: 'break-all' as const, textAlign: 'center' as const, margin: '8px 0' }
const footer = { padding: '20px 28px', backgroundColor: '#f4f4f5', textAlign: 'center' as const, borderRadius: '0 0 12px 12px' }
const footerText = { color: '#71717a', fontSize: '12px', margin: '2px 0' }
