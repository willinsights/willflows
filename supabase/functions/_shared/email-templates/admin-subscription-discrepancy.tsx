/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface DiscrepancyItem {
  workspaceName?: string
  userEmail?: string
  stripeSubscriptionId?: string
  stripeStatus?: string
  dbStatus?: string
  detail?: string
}

interface Props {
  totalDiscrepancies: number
  items: DiscrepancyItem[]
  adminUrl?: string
}

export const AdminSubscriptionDiscrepancyEmail = ({
  totalDiscrepancies,
  items,
  adminUrl = 'https://willflow.app/admin/billing',
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>{totalDiscrepancies} divergência(s) de subscrição detetada(s)</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Divergências de subscrição Stripe</Heading>
        <Text style={text}>
          A reconciliação automática detetou <strong>{totalDiscrepancies}</strong>{' '}
          divergência(s) entre o Stripe e a base de dados do WillFlow.
        </Text>

        <Section style={listSection}>
          {items.slice(0, 10).map((item, i) => (
            <Section key={i} style={card}>
              <Text style={cardTitle}>
                {item.workspaceName || item.userEmail || 'Workspace desconhecido'}
              </Text>
              {item.userEmail && item.workspaceName && (
                <Text style={cardMeta}>{item.userEmail}</Text>
              )}
              <Text style={cardRow}>
                <strong>Stripe:</strong> {item.stripeStatus || '—'} · {' '}
                <strong>DB:</strong> {item.dbStatus || '—'}
              </Text>
              {item.stripeSubscriptionId && (
                <Text style={cardSub}>sub: {item.stripeSubscriptionId}</Text>
              )}
              {item.detail && <Text style={cardSub}>{item.detail}</Text>}
            </Section>
          ))}
          {items.length > 10 && (
            <Text style={text}>
              ... e mais {items.length - 10} no painel admin.
            </Text>
          )}
        </Section>

        <Text style={text}>
          <Link href={adminUrl} style={btn}>
            Abrir painel de billing
          </Link>
        </Text>

        <Text style={footer}>
          Esta mensagem é enviada automaticamente pelo job de reconciliação Stripe do WillFlow.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default AdminSubscriptionDiscrepancyEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '20px', color: '#111827', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '22px' }
const listSection = { margin: '16px 0' }
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px 14px',
  margin: '8px 0',
  backgroundColor: '#f9fafb',
}
const cardTitle = { fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }
const cardMeta = { fontSize: '12px', color: '#6b7280', margin: '2px 0 6px' }
const cardRow = { fontSize: '13px', color: '#374151', margin: '4px 0' }
const cardSub = { fontSize: '11px', color: '#6b7280', margin: '2px 0', fontFamily: 'monospace' }
const btn = {
  display: 'inline-block',
  backgroundColor: '#111827',
  color: '#ffffff',
  padding: '10px 16px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
}
const footer = { fontSize: '11px', color: '#9ca3af', marginTop: '24px' }
