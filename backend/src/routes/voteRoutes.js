import { Router } from 'express';
import { getTodayVotes, submitVote } from '../controllers/voteController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { voteSchema } from '../validators/voteValidator.js';

const router = Router();

// All voting endpoints require authenticated student/user
router.use(requireAuth);

router.get('/today', getTodayVotes);
router.post('/', validate(voteSchema), submitVote);

export default router;
