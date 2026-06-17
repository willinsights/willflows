
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS vat_source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_vat_source_check'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_vat_source_check
      CHECK (vat_source IS NULL OR vat_source IN ('workspace','client','manual'));
  END IF;
END $$;
