import { Router } from 'express';
import {
  postFeedback,
  listFeedback,
  removeFeedback,
  changeFeedbackStatus,
} from '../controllers/feedbackController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { feedbackSchema, feedbackStatusSchema } from '../validators/feedbackValidator.js';
import { feedbackRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All feedback endpoints require authentication
router.use(requireAuth);

router.post('/', feedbackRateLimiter, validate(feedbackSchema), postFeedback);
router.get('/', listFeedback);
router.delete('/:id', removeFeedback);
router.patch('/:id/status', requireAdmin, validate(feedbackStatusSchema), changeFeedbackStatus);

export default router;
