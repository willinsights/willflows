ALTER TABLE public.projects 
ADD COLUMN custos_extras_payment_status text 
DEFAULT 'pendente' 
CHECK (custos_extras_payment_status IN ('pendente', 'pago', 'vencido', 'cancelado'));