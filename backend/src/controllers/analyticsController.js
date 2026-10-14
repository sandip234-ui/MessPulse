import { getAdminAnalyticsOverview } from '../services/analyticsService.js';
import { sendSuccess } from '../utils/response.js';

export const getOverview = async (req, res, next) => {
  try {
    const data = await getAdminAnalyticsOverview();
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};
