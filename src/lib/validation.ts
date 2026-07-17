import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const uuidSchema = z.string().uuid('ID inválido');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email é obrigatório')
  .max(254, 'Email muito longo')
  .email('Email inválido');

/**
 * Trims, enforces length, and rejects HTML/script injection in free-text fields.
 */
export const safeStringSchema = (min: number, max: number, label = 'Campo') =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(min, `${label} deve ter pelo menos ${min} caractere(s)`)
        .max(max, `${label} deve ter no máximo ${max} caracteres`)
        .refine(
          (s) => !/<[^>]+>/.test(s),
          `${label} não pode conter HTML`,
        )
        .refine(
          (s) => !/javascript\s*:/i.test(s),
          `${label} contém conteúdo inválido`,
        ),
    );

export const positiveAmountSchema = z
  .number({ invalid_type_error: 'Valor deve ser um número' })
  .positive('Valor deve ser positivo')
  .finite('Valor inválido')
  .max(999_999_999.99, 'Valor máximo excedido (R$ 999.999.999,99)');

/** YYYY-MM-DD format, validates that it is a real calendar date. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato esperado: AAAA-MM-DD)')
  .refine((s) => {
    const d = new Date(s + 'T00:00:00');
    return !isNaN(d.getTime());
  }, 'Data inválida');

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (formato esperado: #RRGGBB)');

// ---------------------------------------------------------------------------
// Domain schemas
// ---------------------------------------------------------------------------

export const transactionSchema = z.object({
  description: safeStringSchema(1, 200, 'Descrição'),
  amount: positiveAmountSchema,
  type: z.enum(['entrada', 'saida'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  date: isoDateSchema,
  category_id: uuidSchema.nullable().optional(),
  // Storage path of the receipt (e.g. "<userId>/<uuid>.jpg"); set programmatically.
  receipt_url: z.string().max(500).nullable().optional(),
  account_id: uuidSchema.nullable().optional(),
});

export const creditCardSchema = z.object({
  name: safeStringSchema(1, 100, 'Nome'),
  limit_amount: z
    .number({ invalid_type_error: 'Limite deve ser um número' })
    .min(0, 'Limite não pode ser negativo')
    .finite('Limite inválido')
    .max(999_999_999.99, 'Limite máximo excedido'),
  closing_day: z.number().int().min(1, 'Dia inválido').max(28, 'Use um dia entre 1 e 28'),
  due_day: z.number().int().min(1, 'Dia inválido').max(28, 'Use um dia entre 1 e 28'),
  color: hexColorSchema,
});

export const cardPurchaseSchema = z.object({
  card_id: uuidSchema,
  description: safeStringSchema(1, 200, 'Descrição'),
  amount: positiveAmountSchema,
  purchase_date: isoDateSchema,
  installments: z.number().int().min(1, 'Mínimo 1 parcela').max(48, 'Máximo 48 parcelas'),
  category_id: uuidSchema.nullable().optional(),
});

export const recurringSchema = z.object({
  description: safeStringSchema(1, 200, 'Descrição'),
  amount: positiveAmountSchema,
  type: z.enum(['entrada', 'saida'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: 'Frequência inválida' }),
  }),
  next_due_date: isoDateSchema,
  category_id: uuidSchema.nullable().optional(),
});

export const goalSchema = z.object({
  targetAmount: positiveAmountSchema,
  month: z.number().int('Mês deve ser inteiro').min(1, 'Mês inválido').max(12, 'Mês inválido'),
  year: z
    .number()
    .int('Ano deve ser inteiro')
    .min(2000, 'Ano inválido')
    .max(2100, 'Ano inválido'),
});

export const categorySchema = z.object({
  name: safeStringSchema(1, 50, 'Nome'),
  icon: z
    .string()
    .min(1, 'Ícone obrigatório')
    .max(60, 'Ícone inválido')
    .regex(/^[A-Za-z0-9-]+$/, 'Nome de ícone inválido'),
  color: hexColorSchema,
  type: z.enum(['entrada', 'saida'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
});

export const budgetSchema = z.object({
  categoryId: uuidSchema,
  limit: positiveAmountSchema,
});

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment'] as const;

export const accountSchema = z.object({
  name: safeStringSchema(1, 100, 'Nome da conta'),
  type: z.enum(ACCOUNT_TYPES, { errorMap: () => ({ message: 'Tipo de conta inválido' }) }),
  balance: z
    .number({ invalid_type_error: 'Saldo inválido' })
    .finite('Saldo inválido')
    .min(-999_999_999.99, 'Saldo mínimo excedido')
    .max(999_999_999.99, 'Saldo máximo excedido'),
  color: hexColorSchema,
  icon: z.string().min(1).max(60),
  is_default: z.boolean(),
});

const ASSET_CLASSES = ['acao', 'fii', 'etf', 'cripto', 'moeda', 'outro'] as const;

export const investmentSchema = z.object({
  ticker: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(
      z
        .string()
        .min(1, 'Ticker obrigatório')
        .max(12, 'Ticker muito longo')
        .regex(/^[A-Z0-9.]+$/, 'Ticker inválido (use letras, números ou ponto)'),
    ),
  asset_class: z.enum(ASSET_CLASSES, {
    errorMap: () => ({ message: 'Classe de ativo inválida' }),
  }),
  quantity: z
    .number({ invalid_type_error: 'Quantidade deve ser um número' })
    .positive('Quantidade deve ser positiva')
    .finite('Quantidade inválida')
    .max(999_999_999, 'Quantidade máxima excedida'),
  avg_price: z
    .number({ invalid_type_error: 'Preço deve ser um número' })
    .min(0, 'Preço não pode ser negativo')
    .finite('Preço inválido')
    .max(999_999_999.99, 'Preço máximo excedido'),
  notes: safeStringSchema(1, 200, 'Observação').nullable().optional(),
});

export const notificationSettingsSchema = z.object({
  email: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.union([z.literal(''), emailSchema]))
    .optional(),
  limit: z
    .number()
    .positive('Limite deve ser positivo')
    .finite('Limite inválido')
    .max(999_999_999.99, 'Limite máximo excedido')
    .nullable()
    .optional(),
});

// ---------------------------------------------------------------------------
// Helper: throw a formatted error from Zod result
// ---------------------------------------------------------------------------
export function assertValid<T>(
  schema: z.ZodType<T>,
  data: unknown,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.errors[0];
    throw new Error(first?.message ?? 'Dados inválidos');
  }
  return result.data;
}
