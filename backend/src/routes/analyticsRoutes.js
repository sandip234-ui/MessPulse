import { Router } from 'express';
import { getOverview } from '../controllers/analyticsController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Analytics is admin-only
router.use(requireAuth, requireAdmin);

router.get('/overview', getOverview);

export default router;
