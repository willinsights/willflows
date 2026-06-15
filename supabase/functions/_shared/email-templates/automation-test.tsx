/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface AutomationTestEmailProps {
  subject: string
  body: string
  brandName: string
}

export const AutomationTestEmail = ({ subject, body, brandName }: AutomationTestEmailProps) => {
  const paragraphs = (body || '').split(/\n{2,}/).map(p => p.split('\n'))
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>{`[TESTE] ${subject}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{brandName} · TESTE</Heading>
            <Text style={subtitle}>Pré-visualização de automação</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={h2}>{subject}</Heading>
            {paragraphs.map((lines, i) => (
              <Text key={i} style={bodyText}>
                {lines.map((line, j) => (
                  <React.Fragment key={j}>
                    {line}
                    {j < lines.length - 1 ? <br /> : null}
                  </React.Fragment>
                ))}
              </Text>
            ))}
          </Section>

          <Section style={footer}>
            <Text style={footerText}>Email de teste · enviado manualmente para validar template</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '0' }
const header = { background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '24px 32px', borderRadius: '12px 12px 0 0' }
const h1 = { color: '#ffffff', fontSize: '18px', fontWeight: 600, margin: 0 }
const subtitle = { color: 'rgba(255,255,255,0.85)', fontSize: '12px', margin: '4px 0 0' }
const content = { padding: '32px', backgroundColor: '#ffffff' }
const h2 = { color: '#18181b', fontSize: '20px', margin: '0 0 16px' }
const bodyText = { color: '#3f3f46', fontSize: '15px', lineHeight: '1.6', margin: '0 0 14px' }
const footer = { padding: '16px 32px', borderTop: '1px solid #e4e4e7', borderRadius: '0 0 12px 12px' }
const footerText = { color: '#a1a1aa', fontSize: '12px', margin: 0 }
