import { motion } from 'framer-motion';
import { BillingTab } from '@/components/admin/BillingTab';

export default function AdminBilling() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Gestão de subscrições, pagamentos e webhooks</p>
      </motion.div>

      <BillingTab />
    </div>
  );
}
