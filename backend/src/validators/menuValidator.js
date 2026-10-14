import { z } from 'zod';

export const updateMenuSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], {
    errorMap: () => ({ message: 'Invalid day of week' }),
  }),
  meal: z.enum(['breakfast', 'lunch', 'snacks', 'dinner'], {
    errorMap: () => ({ message: 'Invalid meal slot' }),
  }),
  dishes: z.array(z.string().trim().min(1, 'Dish name cannot be empty')).min(1, 'At least one dish is required'),
});
