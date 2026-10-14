import { z } from 'zod';

export const voteSchema = z
  .preprocess((data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };
      if (!copy.mealSlot && copy.meal) copy.mealSlot = copy.meal;
      return copy;
    }
    return data;
  }, z.object({
    dishId: z.string().uuid('dishId must be a valid UUID').optional(),
    dish: z.string().min(1).optional(),
    dishName: z.string().min(1).optional(),
    mealSlot: z.enum(['breakfast', 'lunch', 'snacks', 'dinner'], {
      errorMap: () => ({ message: 'mealSlot must be breakfast, lunch, snacks, or dinner' }),
    }),
    voteType: z.enum(['up', 'down', 'positive', 'negative', '1', '-1'], {
      errorMap: () => ({ message: "voteType must be 'up' / 'positive' or 'down' / 'negative'" }),
    }),
  }))
  .refine((data) => Boolean(data.dishId || data.dish || data.dishName), {
    message: 'Either dishId or dish name must be provided',
    path: ['dishId'],
  });

