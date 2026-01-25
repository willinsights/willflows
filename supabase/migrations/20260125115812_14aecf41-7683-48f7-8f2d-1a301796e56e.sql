-- Add client payment status and paid_at fields to projects table
-- These fields track the payment status of the agreed_value (Preço Cliente)

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS client_payment_status text DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS client_payment_due_date date,
ADD COLUMN IF NOT EXISTS client_paid_at timestamp with time zone;

-- Add constraint to ensure valid payment status values
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_client_payment_status_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_client_payment_status_check 
CHECK (client_payment_status IN ('pendente', 'pago', 'vencido', 'cancelado'));

-- Create index for efficient filtering by payment status
CREATE INDEX IF NOT EXISTS idx_projects_client_payment_status 
ON public.projects(workspace_id, client_payment_status) 
WHERE agreed_value > 0;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.client_payment_status IS 'Payment status for the agreed_value from client: pendente, pago, vencido, cancelado';
COMMENT ON COLUMN public.projects.client_payment_due_date IS 'Due date for receiving payment from client';
COMMENT ON COLUMN public.projects.client_paid_at IS 'Timestamp when client payment was marked as paid';