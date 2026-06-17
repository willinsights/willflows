import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from 'react-router-dom';

interface MockDiscrepancy {
  id: string;
  workspace_id: string;
  workspace_name: string;
  stripe_status: string;
  db_status: string;
  detected_at: string;
  resolved: boolean;
}

const MOCK_DATA: MockDiscrepancy[] = [
  {
    id: '1',
    workspace_id: 'ws-a1b2c3d4',
    workspace_name: 'Studio Criativo Lda',
    stripe_status: 'canceled',
    db_status: 'active',
    detected_at: '2026-06-16T08:30:00Z',
    resolved: false,
  },
  {
    id: '2',
    workspace_id: 'ws-e5f6g7h8',
    workspace_name: 'Produtora Visual',
    stripe_status: 'past_due',
    db_status: 'active',
    detected_at: '2026-06-15T14:20:00Z',
    resolved: false,
  },
  {
    id: '3',
    workspace_id: 'ws-i9j0k1l2',
    workspace_name: 'Films & Co',
    stripe_status: 'active',
    db_status: 'canceled',
    detected_at: '2026-06-14T09:15:00Z',
    resolved: false,
  },
];

export function StripeBillingDiscrepanciesCard() {
  const [items, setItems] = useState<MockDiscrepancy[]>(MOCK_DATA);

  const handleResolve = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, resolved: true } : item))
    );
  };

  const activeCount = items.filter((i) => !i.resolved).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Divergências de Billing Stripe
              {activeCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {activeCount} ativa{activeCount === 1 ? '' : 's'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Workspaces onde o status de subscrição na DB pode estar desalinhado com o Stripe.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link to="/admin/billing">
              Ver detalhes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 || activeCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p>Sem divergências activas. Tudo sincronizado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Stripe</TableHead>
                  <TableHead>DB</TableHead>
                  <TableHead>Detetada</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items
                  .filter((i) => !i.resolved)
                  .map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{d.workspace_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {d.workspace_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {d.stripe_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {d.db_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(d.detected_at), 'dd MMM HH:mm', { locale: pt })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResolve(d.id)}
                        >
                          Resolver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
