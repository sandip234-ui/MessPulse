import { z } from 'zod';

export const ratingSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object' && !data.mealSlot && data.meal) {
      return { ...data, mealSlot: data.meal };
    }
    return data;
  },
  z.object({
    mealSlot: z.enum(['breakfast', 'lunch', 'snacks', 'dinner'], {
      errorMap: () => ({ message: 'mealSlot must be breakfast, lunch, snacks, or dinner' }),
    }),
    rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  })
);

