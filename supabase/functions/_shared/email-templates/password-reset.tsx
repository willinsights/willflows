/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface PasswordResetEmailProps {
  name?: string
  resetLink: string
}

export const PasswordResetEmail = ({ name, resetLink }: PasswordResetEmailProps) => {
  const displayName = name || 'Olá'
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>Redefine a tua password no WillFlow</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>WillFlow</Text>
          </Section>
          <Section style={content}>
            <div style={iconWrap}>
              <Text style={iconText}>🔐</Text>
            </div>
            <Heading style={h1}>Redefinir password</Heading>
            <Text style={text}>{displayName},</Text>
            <Text style={text}>
              Recebemos um pedido para redefinir a password da tua conta WillFlow. Clica no botão
              abaixo para criar uma nova password.
            </Text>
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button style={button} href={resetLink}>
                Redefinir password
              </Button>
            </Section>
            <Text style={smallText}>Se o botão não funcionar, copia e cola este link:</Text>
            <Text style={linkBox}>{resetLink}</Text>
            <Hr style={hr} />
            <Section style={warning}>
              <Text style={warningText}>
                <strong>⚠️ Nota de segurança:</strong> este link expira em 1 hora. Se não pediste
                para redefinir a password, podes ignorar este email com segurança.
              </Text>
            </Section>
          </Section>
          <Section style={footer}>
            <Text style={footerText}>© 2026 WillFlow. Todos os direitos reservados.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default PasswordResetEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  maxWidth: '560px',
  borderRadius: '12px',
  overflow: 'hidden' as const,
  boxShadow: '0 4px 24px rgba(91, 74, 228, 0.08)',
}
const header = {
  background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
  padding: '32px 24px',
  textAlign: 'center' as const,
}
const logoText = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: 0,
  letterSpacing: '-0.5px',
}
const content = { padding: '32px 28px' }
const iconWrap = { textAlign: 'center' as const, marginBottom: '16px' }
const iconText = { fontSize: '40px', margin: 0 }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#18181b',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const text = { fontSize: '15px', color: '#52525b', lineHeight: '1.6', margin: '0 0 14px' }
const smallText = { fontSize: '13px', color: '#71717a', margin: '16px 0 8px' }
const linkBox = {
  fontSize: '12px',
  color: '#7c3aed',
  backgroundColor: '#f4f4f5',
  padding: '12px',
  borderRadius: '8px',
  wordBreak: 'break-all' as const,
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 32px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e4e4e7', margin: '24px 0' }
const warning = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  borderRadius: '8px',
  padding: '14px 16px',
}
const warningText = { fontSize: '13px', color: '#92400e', lineHeight: '1.5', margin: 0 }
const footer = { padding: '20px 24px', backgroundColor: '#f4f4f5', textAlign: 'center' as const }
const footerText = { fontSize: '12px', color: '#a1a1aa', margin: 0 }
