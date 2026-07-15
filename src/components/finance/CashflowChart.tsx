import { Card, CardContent } from '@/components/ui/card';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { TimeSeriesPoint } from '@/lib/finance/types';

export function CashflowChart({ data, title = 'Cashflow', subtitle = 'Últimos 6 meses' }: {
  data: TimeSeriesPoint[];
  title?: string;
  subtitle?: string;
}) {
  const { formatCurrency } = useFormatCurrency();

  return (
    <Card className="glass-card h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Bar
                dataKey="revenue"
                name="Receita"
                fill="hsl(var(--success))"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                dataKey="cost"
                name="Custo"
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Lucro"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
