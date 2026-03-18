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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Foste convidado para o WillFlow</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={header}>
          <Text style={logoText}>WillFlow</Text>
        </div>
        <Heading style={h1}>Foste convidado</Heading>
        <Text style={text}>
          Foste convidado para te juntares ao{' '}
          <Link href={siteUrl} style={link}>
            <strong>WillFlow</strong>
          </Link>
          . Clica no botão abaixo para aceitar o convite e criar a tua conta.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Aceitar Convite
        </Button>
        <Text style={footer}>
          Se não estavas à espera deste convite, podes ignorar este email com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#f4f3ff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '0', borderRadius: '12px', margin: '40px auto', maxWidth: '480px', boxShadow: '0 4px 24px rgba(91, 74, 228, 0.08)' }
const header = { backgroundColor: '#5B4AE4', padding: '24px 25px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const logoText = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', padding: '28px 25px 0' }
const text = { fontSize: '14px', color: '#555570', lineHeight: '1.6', margin: '0 0 20px', padding: '0 25px' }
const link = { color: '#5B4AE4', textDecoration: 'underline' }
const button = { backgroundColor: '#5B4AE4', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', display: 'block', textAlign: 'center' as const, margin: '0 25px 24px' }
const footer = { fontSize: '12px', color: '#999', margin: '0', padding: '16px 25px 24px', borderTop: '1px solid #f0eeff' }
