import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Receipt, AlertTriangle, Webhook, RotateCcw } from 'lucide-react';
import { BillingTab } from '@/components/admin/BillingTab';

export default function AdminBilling() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Gestão de subscrições, pagamentos e webhooks</p>
      </div>

      <BillingTab />
    </div>
  );
}
