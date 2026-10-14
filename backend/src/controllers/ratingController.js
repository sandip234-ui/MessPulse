import { getTodayUserRatings, submitRating, deleteRating } from '../services/ratingService.js';
import { sendSuccess } from '../utils/response.js';

export const getTodayRatings = async (req, res, next) => {
  try {
    const data = await getTodayUserRatings(req.user.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const rateMeal = async (req, res, next) => {
  try {
    const mealSlot = req.body.mealSlot || req.body.meal;
    const { rating } = req.body;
    const result = await submitRating(req.user.id, { mealSlot, rating });
    return sendSuccess(res, result, 'Rating recorded successfully.');
  } catch (error) {
    next(error);
  }
};

export const removeRating = async (req, res, next) => {
  try {
    const { meal } = req.params;
    const result = await deleteRating(req.user.id, meal);
    return sendSuccess(res, result, 'Rating cleared successfully.');
  } catch (error) {
    next(error);
  }
};
