import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(150),
  regNo: z.string().trim().min(3, 'Registration number must be at least 3 characters').max(50),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or Registration Number is required'),
  password: z.string().min(1, 'Password is required'),
});
