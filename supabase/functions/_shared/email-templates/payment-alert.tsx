/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface PaymentAlertEmailProps {
  alertType: string
  projectName?: string
  clientName?: string
  amount: string
  currency: string
  dueDate: string
  daysOverdue?: number
  isReceivable?: boolean
}

export const PaymentAlertEmail = ({
  alertType,
  projectName,
  clientName,
  amount,
  currency,
  dueDate,
  daysOverdue,
  isReceivable,
}: PaymentAlertEmailProps) => {
  const isOverdue = alertType?.startsWith('overdue')
  const tipo = isReceivable ? 'a receber' : 'a pagar'

  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>
        {isOverdue ? `Pagamento vencido — ${amount} ${currency}` : `Pagamento próximo — ${amount} ${currency}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={header}>
            <Text style={logoText}>WillFlow</Text>
          </div>
          <div style={alertBanner(isOverdue)}>
            <Text style={alertIcon}>{isOverdue ? '🔴' : '⏰'}</Text>
            <Text style={alertTitle}>
              {isOverdue ? 'Pagamento Vencido' : 'Pagamento Próximo do Vencimento'}
            </Text>
          </div>
          <div style={content}>
            <Text style={text}>
              Tens um pagamento {tipo} que {isOverdue ? 'está vencido' : 'está próximo do vencimento'}:
            </Text>
            <div style={detailsBox}>
              <Text style={detailRow}>
                <strong>Valor:</strong> {amount} {currency}
              </Text>
              {projectName && (
                <Text style={detailRow}>
                  <strong>Projeto:</strong> {projectName}
                </Text>
              )}
              {clientName && (
                <Text style={detailRow}>
                  <strong>Cliente:</strong> {clientName}
                </Text>
              )}
              <Text style={detailRow}>
                <strong>Vencimento:</strong> {dueDate}
              </Text>
              {isOverdue && daysOverdue && (
                <Text style={{...detailRow, color: '#dc2626', fontWeight: 'bold' as const}}>
                  Vencido há {daysOverdue} dia(s)
                </Text>
              )}
            </div>
          </div>
          <Text style={footer}>
            Este alerta foi enviado automaticamente pelo WillFlow.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PaymentAlertEmail

const main = { backgroundColor: '#f4f3ff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '0', borderRadius: '12px', margin: '40px auto', maxWidth: '480px', boxShadow: '0 4px 24px rgba(91, 74, 228, 0.08)' }
const header = { backgroundColor: '#5B4AE4', padding: '24px 25px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const logoText = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, margin: '0', letterSpacing: '-0.5px' }
const alertBanner = (isOverdue: boolean) => ({
  backgroundColor: isOverdue ? '#fef2f2' : '#fffbeb',
  padding: '16px 25px',
  borderBottom: `2px solid ${isOverdue ? '#fecaca' : '#fde68a'}`,
  textAlign: 'center' as const,
})
const alertIcon = { fontSize: '28px', margin: '0 0 4px' }
const alertTitle = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0' }
const content = { padding: '24px 25px' }
const text = { fontSize: '14px', color: '#555570', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f8f7ff', borderRadius: '8px', padding: '16px', border: '1px solid #e8e5ff' }
const detailRow = { fontSize: '14px', color: '#333', margin: '0 0 8px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#999', margin: '0', padding: '16px 25px 24px', borderTop: '1px solid #f0eeff' }
