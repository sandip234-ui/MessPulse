import { query } from '../config/database.js';
import { isMealRatingOpen, getMealOpensAt, MEAL_SCHEDULE } from './timeService.js';

/**
 * Get current authenticated user's ratings for today
 */
export const getTodayUserRatings = async (userId) => {
  const sql = `
    SELECT meal_slot, rating
    FROM meal_ratings
    WHERE user_id = $1 AND rating_date = CURRENT_DATE;
  `;

  const result = await query(sql, [userId]);

  const ratings = {
    breakfast: 0,
    lunch: 0,
    snacks: 0,
    dinner: 0,
  };

  result.rows.forEach((row) => {
    ratings[row.meal_slot] = row.rating;
  });

  const windows = {};
  MEAL_SCHEDULE.forEach((meal) => {
    const isOpen = isMealRatingOpen(meal.key);
    windows[meal.key] = {
      isOpen,
      opensAt: isOpen ? null : getMealOpensAt(meal.key),
      label: meal.label,
    };
  });

  const ratedMeals = Object.values(ratings).filter((r) => r > 0);
  const ratedCount = ratedMeals.length;
  const averageRating = ratedCount > 0
    ? parseFloat((ratedMeals.reduce((sum, r) => sum + r, 0) / ratedCount).toFixed(1))
    : 0;

  return {
    ratings,
    windows,
    ratedCount,
    averageRating,
  };
};

/**
 * Submit or update a meal rating
 * Enforces timing window check and atomic UPSERT
 */
export const submitRating = async (userId, { mealSlot, rating }) => {
  // 1. Enforce meal timing rule: rating opens when meal starts and remains open all day
  if (!isMealRatingOpen(mealSlot)) {
    const opensAt = getMealOpensAt(mealSlot);
    const error = new Error(`Rating for ${mealSlot} is not available yet. Opens at ${opensAt}.`);
    error.statusCode = 400;
    error.code = 'MEAL_RATING_LOCKED';
    throw error;
  }

  // 2. Perform Atomic PostgreSQL UPSERT
  const upsertSql = `
    INSERT INTO meal_ratings (user_id, rating_date, meal_slot, rating)
    VALUES ($1, CURRENT_DATE, $2, $3)
    ON CONFLICT (user_id, rating_date, meal_slot)
    DO UPDATE SET rating = EXCLUDED.rating, updated_at = CURRENT_TIMESTAMP
    RETURNING id, rating_date, meal_slot, rating, updated_at;
  `;

  const result = await query(upsertSql, [userId, mealSlot, rating]);
  const row = result.rows[0];

  return {
    id: row.id,
    mealSlot: row.meal_slot,
    rating: row.rating,
    ratingDate: row.rating_date,
    updatedAt: row.updated_at,
  };
};

/**
 * Delete / clear authenticated user's rating for a specific meal today
 */
export const deleteRating = async (userId, mealSlot) => {
  const deleteSql = `
    DELETE FROM meal_ratings
    WHERE user_id = $1 AND rating_date = CURRENT_DATE AND meal_slot = $2
    RETURNING id;
  `;

  const result = await query(deleteSql, [userId, mealSlot]);

  if (result.rowCount === 0) {
    const error = new Error(`No rating found to clear for ${mealSlot} today.`);
    error.statusCode = 404;
    error.code = 'RATING_NOT_FOUND';
    throw error;
  }

  return {
    mealSlot,
    cleared: true,
  };
};
