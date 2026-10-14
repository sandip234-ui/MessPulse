import { getTodayVotesAndLeaderboard, castVote } from '../services/voteService.js';
import { sendSuccess } from '../utils/response.js';

export const getTodayVotes = async (req, res, next) => {
  try {
    const data = await getTodayVotesAndLeaderboard(req.user.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const submitVote = async (req, res, next) => {
  try {
    const { dishId, dish, dishName, mealSlot, meal, voteType } = req.body;
    const result = await castVote(req.user.id, {
      dishId,
      dishName: dishName || dish,
      mealSlot: mealSlot || meal,
      voteType,
    });
    return sendSuccess(res, result, 'Vote recorded successfully.');
  } catch (error) {
    next(error);
  }
};
