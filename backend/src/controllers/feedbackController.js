import {
  submitFeedback,
  getFeedbackList,
  deleteFeedback,
  updateFeedbackStatus,
} from '../services/feedbackService.js';
import { sendSuccess } from '../utils/response.js';

export const postFeedback = async (req, res, next) => {
  try {
    const { category, message } = req.body;
    // Strict requirement: user_id is automatically assigned from req.user.id
    const result = await submitFeedback(req.user.id, { category, message });
    return sendSuccess(res, result, 'Feedback submitted successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const listFeedback = async (req, res, next) => {
  try {
    const { category, status, limit, offset } = req.query;
    const result = await getFeedbackList(req.user, {
      category,
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const removeFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteFeedback(req.user, id);
    return sendSuccess(res, result, 'Feedback removed successfully.');
  } catch (error) {
    next(error);
  }
};

export const changeFeedbackStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await updateFeedbackStatus(id, status);
    return sendSuccess(res, result, 'Feedback status updated.');
  } catch (error) {
    next(error);
  }
};
