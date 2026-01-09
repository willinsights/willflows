import { z } from 'zod';

// Project validation schema
export const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo (max 200 caracteres)').trim(),
  type: z.enum(['fotografia', 'video', 'foto_video']),
  category: z.enum(['hotel', 'experiencia', 'evento', 'outro']).optional(),
  client_id: z.string().uuid('ID de cliente inválido').nullable().optional(),
  custom_category_id: z.string().uuid('ID de categoria inválido').nullable().optional(),
  agreed_value: z.number().nonnegative('Valor não pode ser negativo').nullable().optional(),
  estimated_costs: z.number().nonnegative('Custo não pode ser negativo').nullable().optional(),
  custo_captacao: z.number().nonnegative('Custo não pode ser negativo').nullable().optional(),
  custo_edicao: z.number().nonnegative('Custo não pode ser negativo').nullable().optional(),
  notes: z.string().max(5000, 'Notas muito longas (max 5000 caracteres)').nullable().optional(),
  internal_notes: z.string().max(5000, 'Notas muito longas (max 5000 caracteres)').nullable().optional(),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
  shoot_date: z.string().nullable().optional(),
  delivery_date: z.string().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  project_code: z.string().max(50).nullable().optional(),
  drive_folder_url: z.string().url('URL inválida').or(z.literal('')).nullable().optional(),
  dropbox_folder_url: z.string().url('URL inválida').or(z.literal('')).nullable().optional(),
  google_meet_url: z.string().url('URL inválida').or(z.literal('')).nullable().optional(),
  frameio_project_id: z.string().max(100).nullable().optional(),
  payment_method: z.string().max(50).nullable().optional(),
  item_type: z.string().max(50).nullable().optional(),
});

export type ValidatedProject = z.infer<typeof projectSchema>;

// Client validation schema
export const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo (max 200 caracteres)').trim(),
  email: z.string().email('Email inválido').or(z.literal('')).nullable().optional(),
  phone: z.string().max(50, 'Telefone muito longo').nullable().optional(),
  company: z.string().max(200, 'Empresa muito longa').nullable().optional(),
  nif: z.string().max(20, 'NIF muito longo').nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  postal_code: z.string().max(20).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  notes: z.string().max(5000, 'Notas muito longas').nullable().optional(),
  tags: z.array(z.string().max(50)).nullable().optional(),
});

export type ValidatedClient = z.infer<typeof clientSchema>;

// Payment validation schema
export const paymentSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  is_receivable: z.boolean(),
  currency: z.string().max(10).default('EUR'),
  status: z.enum(['pendente', 'pago', 'vencido', 'cancelado']).optional(),
  description: z.string().max(1000, 'Descrição muito longa').nullable().optional(),
  due_date: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
  invoice_number: z.string().max(50).nullable().optional(),
  invoice_url: z.string().url('URL inválida').or(z.literal('')).nullable().optional(),
  bank_name: z.string().max(100).nullable().optional(),
  bank_iban: z.string().max(50).nullable().optional(),
  freelancer_name: z.string().max(200).nullable().optional(),
  client_id: z.string().uuid('ID de cliente inválido').nullable().optional(),
  project_id: z.string().uuid('ID de projeto inválido').nullable().optional(),
  collaborator_id: z.string().uuid('ID de colaborador inválido').nullable().optional(),
});

export type ValidatedPayment = z.infer<typeof paymentSchema>;

// Media link validation schema
export const mediaLinkSchema = z.object({
  url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
  title: z.string().max(200, 'Título muito longo').nullable().optional(),
  link_type: z.string().max(50).default('outro'),
  project_id: z.string().uuid('ID de projeto inválido'),
});

export type ValidatedMediaLink = z.infer<typeof mediaLinkSchema>;

// Comment validation schema
export const commentSchema = z.object({
  content: z.string().min(1, 'Comentário não pode estar vazio').max(5000, 'Comentário muito longo'),
  project_id: z.string().uuid('ID de projeto inválido'),
});

export type ValidatedComment = z.infer<typeof commentSchema>;

// Calendar event validation schema
export const calendarEventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  description: z.string().max(2000).nullable().optional(),
  start_at: z.string().min(1, 'Data de início é obrigatória'),
  end_at: z.string().nullable().optional(),
  all_day: z.boolean().default(false),
  location: z.string().max(500).nullable().optional(),
  event_type: z.string().max(50).default('meeting'),
  video_call_url: z.string().url('URL inválida').or(z.literal('')).nullable().optional(),
  project_id: z.string().uuid('ID de projeto inválido').nullable().optional(),
  task_id: z.string().uuid('ID de tarefa inválido').nullable().optional(),
});

export type ValidatedCalendarEvent = z.infer<typeof calendarEventSchema>;

// Helper type for validation result
export type ValidationResult<T> = 
  | { success: true; data: T; error?: undefined }
  | { success: false; data?: undefined; error: string };

// Helper function to safely validate and return errors
export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.errors[0]?.message || 'Dados inválidos' };
    }
    return { success: false, error: 'Erro de validação' };
  }
}

// Partial schemas for updates (all fields optional)
export const projectUpdateSchema = projectSchema.partial();
export const clientUpdateSchema = clientSchema.partial();
export const paymentUpdateSchema = paymentSchema.partial();
