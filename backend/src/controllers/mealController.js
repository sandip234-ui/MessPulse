import { getMealStatus } from '../services/timeService.js';
import { sendSuccess } from '../utils/response.js';

export const getStatus = (req, res) => {
  const status = getMealStatus();
  return sendSuccess(res, status);
};
