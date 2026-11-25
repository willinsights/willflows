import { Link } from 'react-router-dom';
import { Check, Minus, Plug, X, HelpCircle } from 'lucide-react';
import { ReleaseBadge } from './ReleaseBadge';
import {
  COMPARISON_CATALOG, COMPARISON_VERIFIED_AT, COMPETITOR_NAMES,
  type Competitor, type CompetitorStatus,
} from '@/data/comparisonCatalog';

const STATUS: Record<CompetitorStatus, { label: string; icon: typeof Check; cls: string }> = {
  yes: { label: 'Nativo', icon: Check, cls: 'text-success' },
  partial: { label: 'Parcial', icon: Minus, cls: 'text-warning' },
  integration: { label: 'Via integração', icon: Plug, cls: 'text-muted-foreground' },
  no: { label: 'Não nativo', icon: X, cls: 'text-muted-foreground' },
  unknown: { label: 'Não confirmado', icon: HelpCircle, cls: 'text-muted-foreground' },
};

function Status({ s }: { s: CompetitorStatus }) {
  const { label, icon: Icon, cls } = STATUS[s];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${cls}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}
    </span>
  );
}

function WillFlow({ plans }: { plans: string }) {
  return (
    <span className="inline-flex flex-col items-start gap-0.5 text-sm">
      <span className="inline-flex items-center gap-1.5 font-medium text-primary"><Check className="h-4 w-4" aria-hidden="true" />Incluído</span>
      <span className="text-xs text-muted-foreground">{plans}</span>
    </span>
  );
}

export function CompetitorComparison({ competitor }: { competitor: Competitor }) {
  const name = COMPETITOR_NAMES[competitor];
  return (
    <div className="space-y-8">
      {COMPARISON_CATALOG.map((cat) => (
        <section key={cat.title} aria-labelledby={`cat-${cat.title}`}>
          <h3 id={`cat-${cat.title}`} className="mb-3 text-lg font-semibold">{cat.title}</h3>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-sm">
                <tr>
                  <th scope="col" className="p-4 font-semibold">Funcionalidade</th>
                  <th scope="col" className="w-44 p-4 font-semibold">{name}</th>
                  <th scope="col" className="w-44 p-4 font-semibold text-primary">WillFlow</th>
                </tr>
              </thead>
              <tbody>
                {cat.features.map((f, i) => (
                  <tr key={f.name} className={i % 2 ? 'bg-muted/20' : ''}>
                    <th scope="row" className="p-4 align-top font-normal">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {f.href ? <Link to={f.href} className="hover:text-primary hover:underline">{f.name}</Link> : f.name}
                        {f.release && <ReleaseBadge kind={f.release} />}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">{f.detail}</span>
                    </th>
                    <td className="p-4 align-top"><Status s={f.competitors[competitor]} /></td>
                    <td className="p-4 align-top"><WillFlow plans={f.plans} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards with persistent product labels */}
          <ul className="space-y-3 md:hidden">
            {cat.features.map((f) => (
              <li key={f.name} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  {f.href ? <Link to={f.href} className="underline-offset-2 hover:underline">{f.name}</Link> : f.name}
                  {f.release && <ReleaseBadge kind={f.release} />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <div><dt className="text-xs text-muted-foreground">{name}</dt><dd><Status s={f.competitors[competitor]} /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">WillFlow</dt><dd><WillFlow plans={f.plans} /></dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">
        Informação sobre o {name} baseada na documentação pública, verificada a {COMPARISON_VERIFIED_AT}. “Parcial” indica que existe de forma genérica,
        num plano superior ou sem foco em foto e vídeo; “Via integração” depende de apps ou extensões externas. Pode mudar — confirme no site oficial do {name}.
      </p>
    </div>
  );
}
