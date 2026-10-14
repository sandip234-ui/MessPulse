import { Router } from 'express';
import { getWeekly, getToday, updateMenu } from '../controllers/menuController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { updateMenuSchema } from '../validators/menuValidator.js';

const router = Router();

// Public / Authenticated read routes
router.get('/weekly', getWeekly);
router.get('/today', getToday);

// Admin-only menu update routes (supports both /manage and /admin/menu)
router.put('/manage', requireAuth, requireAdmin, validate(updateMenuSchema), updateMenu);

export default router;
