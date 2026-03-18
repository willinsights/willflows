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

interface WeeklySummaryEmailProps {
  userName: string
  weekLabel: string
  totalRevenue: string
  totalCost: string
  profit: string
  marginPercent: string
  projectsDelivered: number
  projectsActive: number
  pendingPayments: number
  overduePayments: number
}

export const WeeklySummaryEmail = ({
  userName,
  weekLabel,
  totalRevenue,
  totalCost,
  profit,
  marginPercent,
  projectsDelivered,
  projectsActive,
  pendingPayments,
  overduePayments,
}: WeeklySummaryEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Resumo semanal — {weekLabel}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={header}>
          <Text style={logoText}>WillFlow</Text>
        </div>
        <div style={content}>
          <Heading style={h1}>📊 Resumo Semanal</Heading>
          <Text style={text}>
            Olá {userName}, aqui está o resumo da semana <strong>{weekLabel}</strong>:
          </Text>

          <Text style={sectionTitle}>💰 Finanças</Text>
          <div style={statsGrid}>
            <div style={statCard}>
              <Text style={statValue}>{totalRevenue}</Text>
              <Text style={statLabel}>Receita</Text>
            </div>
            <div style={statCard}>
              <Text style={statValue}>{totalCost}</Text>
              <Text style={statLabel}>Custos</Text>
            </div>
            <div style={statCard}>
              <Text style={{...statValue, color: '#5B4AE4'}}>{profit}</Text>
              <Text style={statLabel}>Lucro ({marginPercent}%)</Text>
            </div>
          </div>

          <Text style={sectionTitle}>📋 Projetos</Text>
          <div style={detailsBox}>
            <Text style={detailRow}>
              <strong>{projectsDelivered}</strong> projetos entregues esta semana
            </Text>
            <Text style={detailRow}>
              <strong>{projectsActive}</strong> projetos ativos
            </Text>
          </div>

          {(pendingPayments > 0 || overduePayments > 0) && (
            <div>
              <Text style={sectionTitle}>⚠️ Atenção</Text>
              <div style={{...detailsBox, borderColor: overduePayments > 0 ? '#fecaca' : '#e8e5ff'}}>
                {pendingPayments > 0 && (
                  <Text style={detailRow}>
                    <strong>{pendingPayments}</strong> pagamentos pendentes
                  </Text>
                )}
                {overduePayments > 0 && (
                  <Text style={{...detailRow, color: '#dc2626'}}>
                    <strong>{overduePayments}</strong> pagamentos vencidos
                  </Text>
                )}
              </div>
            </div>
          )}
        </div>
        <Text style={footer}>
          Este resumo foi enviado automaticamente pelo WillFlow. Podes desativar nas definições da tua conta.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WeeklySummaryEmail

const main = { backgroundColor: '#f4f3ff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '0', borderRadius: '12px', margin: '40px auto', maxWidth: '480px', boxShadow: '0 4px 24px rgba(91, 74, 228, 0.08)' }
const header = { backgroundColor: '#5B4AE4', padding: '24px 25px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const logoText = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, margin: '0', letterSpacing: '-0.5px' }
const content = { padding: '24px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#555570', lineHeight: '1.6', margin: '0 0 20px' }
const sectionTitle = { fontSize: '16px', fontWeight: '600' as const, color: '#1a1a2e', margin: '20px 0 12px' }
const statsGrid = { display: 'flex' as const, gap: '8px', marginBottom: '16px' }
const statCard = { flex: '1', backgroundColor: '#f8f7ff', borderRadius: '8px', padding: '12px', textAlign: 'center' as const, border: '1px solid #e8e5ff' }
const statValue = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 4px' }
const statLabel = { fontSize: '12px', color: '#888', margin: '0' }
const detailsBox = { backgroundColor: '#f8f7ff', borderRadius: '8px', padding: '16px', border: '1px solid #e8e5ff', marginBottom: '16px' }
const detailRow = { fontSize: '14px', color: '#333', margin: '0 0 8px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#999', margin: '0', padding: '16px 25px 24px', borderTop: '1px solid #f0eeff' }
