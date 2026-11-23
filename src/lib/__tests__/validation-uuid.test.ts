import { describe, expect, it } from 'vitest';
import { paymentSchema, calendarEventSchema, checklistItemSchema, projectSchema } from '../validation-schemas';

// S22: zod 4 made z.string().uuid() RFC-strict. Stored IDs that are not RFC
// (seeds, nil-style fixtures) must keep validating; non-UUID text must fail.
const RFC = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const NON_RFC = '00000000-0000-0000-0000-000000000001';
const fields = [
  paymentSchema.shape.project_id,
  paymentSchema.shape.client_id,
  calendarEventSchema.shape.task_id,
  checklistItemSchema.shape.task_id,
  projectSchema.shape.custom_category_id,
];

describe('S22 — IDs aceites como antes do zod 4', () => {
  it.each(fields.map((f, i) => [i, f] as const))('campo %i aceita UUID RFC e não RFC', (_i, f) => {
    expect(f.safeParse(RFC).success).toBe(true);
    expect(f.safeParse(NON_RFC).success).toBe(true);
  });
  it.each(fields.map((f, i) => [i, f] as const))('campo %i recusa texto que não é ID', (_i, f) => {
    expect(f.safeParse('não-é-um-id').success).toBe(false);
  });
});
