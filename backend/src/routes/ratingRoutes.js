import { Router } from 'express';
import { getTodayRatings, rateMeal, removeRating } from '../controllers/ratingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { ratingSchema } from '../validators/ratingValidator.js';

const router = Router();

// All rating endpoints require authenticated student/user
router.use(requireAuth);

router.get('/today', getTodayRatings);
router.post('/', validate(ratingSchema), rateMeal);
router.delete('/:meal', removeRating);

export default router;
