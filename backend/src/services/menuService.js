import { query, getClient } from '../config/database.js';
import { getMealStatus } from './timeService.js';
import { getDishEmoji } from '../utils/dishEmoji.js';

/**
 * Fetch the entire weekly menu from PostgreSQL
 * Returns both structured JSON and rich object array representations.
 */
export const getWeeklyMenu = async () => {
  const sql = `
    SELECT 
      w.id AS menu_item_id,
      w.day_of_week,
      w.meal_slot,
      w.display_order,
      d.id AS dish_id,
      d.name AS dish_name,
      d.emoji
    FROM weekly_menu_items w
    JOIN dishes d ON w.dish_id = d.id
    ORDER BY 
      CASE w.day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
      END,
      w.meal_slot,
      w.display_order ASC;
  `;

  const result = await query(sql);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const meals = ['breakfast', 'lunch', 'snacks', 'dinner'];

  // Initialize empty weekly structure
  const structuredMenu = {};
  const detailedMenu = {};

  days.forEach((day) => {
    structuredMenu[day] = {};
    detailedMenu[day] = {};
    meals.forEach((meal) => {
      structuredMenu[day][meal] = [];
      detailedMenu[day][meal] = [];
    });
  });

  for (const row of result.rows) {
    structuredMenu[row.day_of_week][row.meal_slot].push(row.dish_name);
    detailedMenu[row.day_of_week][row.meal_slot].push({
      id: row.dish_id,
      name: row.dish_name,
      emoji: row.emoji,
      displayOrder: row.display_order,
    });
  }

  return {
    menu: structuredMenu,
    details: detailedMenu,
  };
};

/**
 * Fetch today's menu for the current day in Asia/Kolkata
 */
export const getTodayMenu = async () => {
  const { todayName, todayDate, activeMealKey } = getMealStatus();

  const sql = `
    SELECT 
      w.id AS menu_item_id,
      w.day_of_week,
      w.meal_slot,
      w.display_order,
      d.id AS dish_id,
      d.name AS dish_name,
      d.emoji
    FROM weekly_menu_items w
    JOIN dishes d ON w.dish_id = d.id
    WHERE w.day_of_week = $1
    ORDER BY w.meal_slot, w.display_order ASC;
  `;

  const result = await query(sql, [todayName]);

  const meals = ['breakfast', 'lunch', 'snacks', 'dinner'];
  const todayMenu = {};
  const todayDetails = {};

  meals.forEach((m) => {
    todayMenu[m] = [];
    todayDetails[m] = [];
  });

  for (const row of result.rows) {
    todayMenu[row.meal_slot].push(row.dish_name);
    todayDetails[row.meal_slot].push({
      id: row.dish_id,
      name: row.dish_name,
      emoji: row.emoji,
      displayOrder: row.display_order,
    });
  }

  return {
    day: todayName,
    date: todayDate,
    activeMealKey,
    menu: todayMenu,
    details: todayDetails,
  };
};

/**
 * Admin: Update a single meal slot's dishes for a specific day
 * Enforces single PostgreSQL transaction.
 * Does NOT delete dishes from master catalog, preserving historical votes.
 */
export const updateWeeklyMenuSlot = async ({ day, meal, dishes }) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const cleanDishes = dishes.map((d) => d.trim()).filter(Boolean);
    if (cleanDishes.length === 0) {
      const error = new Error('At least one non-empty dish is required.');
      error.statusCode = 400;
      throw error;
    }

    // Step 1: Ensure all dishes exist in the dishes table and retrieve their IDs
    const dishIds = [];
    for (const dishName of cleanDishes) {
      const emoji = getDishEmoji(dishName);
      const dishRes = await client.query(
        `INSERT INTO dishes (name, emoji, is_active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (name) DO UPDATE SET emoji = EXCLUDED.emoji
         RETURNING id;`,
        [dishName, emoji]
      );
      dishIds.push(dishRes.rows[0].id);
    }

    // Step 2: Clear old schedule items for this (day, meal) slot ONLY
    await client.query(
      `DELETE FROM weekly_menu_items
       WHERE day_of_week = $1 AND meal_slot = $2;`,
      [day, meal]
    );

    // Step 3: Insert new weekly_menu_items
    for (let i = 0; i < dishIds.length; i++) {
      await client.query(
        `INSERT INTO weekly_menu_items (day_of_week, meal_slot, dish_id, display_order)
         VALUES ($1, $2, $3, $4);`,
        [day, meal, dishIds[i], i]
      );
    }

    await client.query('COMMIT');

    return {
      day,
      meal,
      dishes: cleanDishes,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
