/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ContactMessageEmailProps {
  name: string
  email: string
  subject: string
  message: string
}

export const ContactMessageEmail = ({
  name,
  email,
  subject,
  message,
}: ContactMessageEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>{`Nova mensagem de contacto: ${subject}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Nova Mensagem de Contacto</Heading>
          <Text style={subtitle}>Formulário público — willflow.app</Text>
        </Section>

        <Section style={content}>
          <Section style={infoBox}>
            <Text style={label}>Nome</Text>
            <Text style={value}>{name}</Text>

            <Hr style={divider} />

            <Text style={label}>Email</Text>
            <Text style={value}>
              <Link href={`mailto:${email}`} style={emailLink}>{email}</Link>
            </Text>

            <Hr style={divider} />

            <Text style={label}>Assunto</Text>
            <Text style={value}>{subject}</Text>
          </Section>

          <Heading as="h3" style={h3}>Mensagem</Heading>
          <Section style={messageBox}>
            <Text style={messageText}>{message}</Text>
          </Section>

          <Text style={footerNote}>
            Para responder, usa o email do remetente acima.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} WillFlow</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '0' }
const header = { background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', padding: '32px 28px', textAlign: 'center' as const, borderRadius: '12px 12px 0 0' }
const h1 = { color: '#ffffff', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }
const subtitle = { color: 'rgba(255,255,255,0.9)', fontSize: '13px', margin: 0 }
const content = { padding: '28px', backgroundColor: '#ffffff' }
const infoBox = { background: '#f4f4f5', borderRadius: '8px', padding: '16px 18px', margin: '0 0 20px' }
const label = { color: '#71717a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px' }
const value = { color: '#18181b', fontSize: '15px', margin: '0 0 4px' }
const emailLink = { color: '#7c3aed', textDecoration: 'none' }
const divider = { borderColor: '#e4e4e7', margin: '12px 0' }
const h3 = { color: '#18181b', fontSize: '16px', fontWeight: 600, margin: '0 0 10px' }
const messageBox = { background: '#faf5ff', borderLeft: '4px solid #7c3aed', borderRadius: '0 8px 8px 0', padding: '14px 16px' }
const messageText = { color: '#3f3f46', fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' as const }
const footerNote = { color: '#71717a', fontSize: '12px', textAlign: 'center' as const, marginTop: '20px' }
const footer = { padding: '16px 28px', backgroundColor: '#f4f4f5', textAlign: 'center' as const, borderRadius: '0 0 12px 12px' }
const footerText = { color: '#71717a', fontSize: '11px', margin: 0 }
