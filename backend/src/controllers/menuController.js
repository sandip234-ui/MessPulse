import { getWeeklyMenu, getTodayMenu, updateWeeklyMenuSlot } from '../services/menuService.js';
import { sendSuccess } from '../utils/response.js';

export const getWeekly = async (req, res, next) => {
  try {
    const data = await getWeeklyMenu();
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const getToday = async (req, res, next) => {
  try {
    const data = await getTodayMenu();
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const updateMenu = async (req, res, next) => {
  try {
    const { day, meal, dishes } = req.body;
    const result = await updateWeeklyMenuSlot({ day, meal, dishes });
    return sendSuccess(res, result, 'Menu updated successfully.');
  } catch (error) {
    next(error);
  }
};
