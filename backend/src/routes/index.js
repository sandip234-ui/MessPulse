import { Router } from 'express';
import authRoutes from './authRoutes.js';
import menuRoutes from './menuRoutes.js';
import mealRoutes from './mealRoutes.js';
import ratingRoutes from './ratingRoutes.js';
import voteRoutes from './voteRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import { updateMenu } from '../controllers/menuController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { updateMenuSchema } from '../validators/menuValidator.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Module Routes
router.use('/auth', authRoutes);
router.use('/menu', menuRoutes);
router.use('/meals', mealRoutes);
router.use('/ratings', ratingRoutes);
router.use('/votes', voteRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/analytics', analyticsRoutes);

// Admin Menu Management alias: PUT /api/v1/admin/menu
router.put('/admin/menu', requireAuth, requireAdmin, validate(updateMenuSchema), updateMenu);

// Admin-only test/guard endpoint (for RBAC verification)
router.get('/admin/test', requireAuth, requireAdmin, (req, res) => {
  return sendSuccess(res, { message: 'Admin access verified', user: req.user });
});

export default router;
