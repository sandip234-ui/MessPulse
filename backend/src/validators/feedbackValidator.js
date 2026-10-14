import { z } from 'zod';

export const feedbackSchema = z.object({
  category: z.enum(
    ['food_quality', 'hygiene', 'quantity', 'service', 'timing', 'suggestion', 'other'],
    { errorMap: () => ({ message: 'Invalid feedback category' }) }
  ),
  message: z
    .string()
    .trim()
    .min(10, 'Feedback message must be at least 10 characters')
    .max(500, 'Feedback message cannot exceed 500 characters'),
});

export const feedbackStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'resolved'], {
    errorMap: () => ({ message: 'Status must be pending, reviewed, or resolved' }),
  }),
});
