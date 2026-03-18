/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Confirma a alteração de email no WillFlow</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={header}>
          <Text style={logoText}>WillFlow</Text>
        </div>
        <Heading style={h1}>Alteração de email</Heading>
        <Text style={text}>
          Pediste para alterar o teu email no WillFlow de{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          para{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Clica no botão abaixo para confirmar esta alteração:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar Alteração
        </Button>
        <Text style={footer}>
          Se não pediste esta alteração, protege a tua conta imediatamente.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#f4f3ff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '0', borderRadius: '12px', margin: '40px auto', maxWidth: '480px', boxShadow: '0 4px 24px rgba(91, 74, 228, 0.08)' }
const header = { backgroundColor: '#5B4AE4', padding: '24px 25px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const logoText = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', padding: '28px 25px 0' }
const text = { fontSize: '14px', color: '#555570', lineHeight: '1.6', margin: '0 0 20px', padding: '0 25px' }
const link = { color: '#5B4AE4', textDecoration: 'underline' }
const button = { backgroundColor: '#5B4AE4', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', display: 'block', textAlign: 'center' as const, margin: '0 25px 24px' }
const footer = { fontSize: '12px', color: '#999', margin: '0', padding: '16px 25px 24px', borderTop: '1px solid #f0eeff' }
