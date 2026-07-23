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
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReactivationEmailProps {
  name?: string
  bodyText: string
  appUrl?: string
  unsubscribeUrl: string
  variant?: 'default' | 'active'
}

const LOGO_URL = 'https://willflow.app/logo-willflow-purple.png'

/**
 * Reactivation campaign template.
 * Renders the admin-provided body (plain text with \n line breaks) into paragraphs,
 * appends brand CTA + legal footer with unsubscribe.
 */
export const ReactivationEmail = ({
  name,
  bodyText,
  appUrl = 'https://willflow.app',
  unsubscribeUrl,
}: ReactivationEmailProps) => {
  const greetingName = name?.trim() || null
  // Strip em/en dashes (AI-tell) and split body into paragraphs on blank lines
  const paragraphs = bodyText
    .replace(/\{nome\}/g, greetingName ?? '')
    .replace(/\s*[—–]\s*/g, ', ')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>Temos novidades no WillFlow.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={LOGO_URL}
              alt="WillFlow"
              width="140"
              style={{ margin: '0 auto', display: 'block' }}
            />
          </Section>

          <Section style={newsBadge}>
            <Text style={badgeLabel}>NOVIDADES</Text>
            <Text style={badgeText}>
              Temos novidades no sistema. Entra para veres o que mudou.
            </Text>
          </Section>

          <Section style={content}>
            {paragraphs.map((p, i) => (
              <Text key={i} style={paragraph}>{p}</Text>
            ))}

            <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
              <Button href={appUrl} style={button}>
                Entrar no WillFlow
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              WillFlow, gestão para criativos
            </Text>
            <Text style={footerSmall}>
              Recebeste este email porque tens uma conta no WillFlow.{' '}
              <Link href={unsubscribeUrl} style={footerLink}>
                Cancelar subscrição
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 24px',
}
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const newsBadge = {
  backgroundColor: '#f5f3ff',
  border: '1px solid #ddd6fe',
  borderRadius: '10px',
  padding: '14px 18px',
  margin: '0 0 20px 0',
}
const badgeLabel = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#6d28d9',
  letterSpacing: '0.08em',
  margin: '0 0 4px 0',
}
const badgeText = {
  fontSize: '14px',
  color: '#4c1d95',
  margin: '0',
  lineHeight: '1.5',
}
const content = { padding: '8px 0' }
const paragraph = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#334155',
  margin: '0 0 14px 0',
  whiteSpace: 'pre-line' as const,
}
const button = {
  backgroundColor: '#6d28d9',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '32px 0 16px' }
const footer = { textAlign: 'center' as const }
const footerText = { fontSize: '13px', color: '#64748b', margin: '0 0 8px 0' }
const footerSmall = { fontSize: '12px', color: '#94a3b8', margin: '0' }
const footerLink = { color: '#64748b', textDecoration: 'underline' }
