/**
 * src/utils/timeHelper.js
 * Meal schedule definitions and real-time meal detection logic.
 */

export const MEAL_SCHEDULE = [
  {
    key:       'breakfast',
    label:     'Breakfast',
    emoji:     '🌅',
    startH:    8,  startM:  0,
    endH:      9,  endM:   30,
    display:   '8:00 AM – 9:30 AM',
    startDisplay: '8:00 AM',
  },
  {
    key:       'lunch',
    label:     'Lunch',
    emoji:     '☀️',
    startH:    12, startM: 0,
    endH:      14, endM:   0,
    display:   '12:00 PM – 2:00 PM',
    startDisplay: '12:00 PM',
  },
  {
    key:       'snacks',
    label:     'Snacks',
    emoji:     '🍩',
    startH:    17, startM: 0,
    endH:      18, endM:   0,
    display:   '5:00 PM – 6:00 PM',
    startDisplay: '5:00 PM',
  },
  {
    key:       'dinner',
    label:     'Dinner',
    emoji:     '🌙',
    startH:    20, startM: 0,
    endH:      22, endM:   0,
    display:   '8:00 PM – 10:00 PM',
    startDisplay: '8:00 PM',
  },
];

/** Convert hours + minutes to total minutes since midnight. */
const toMinutes = (h, m) => h * 60 + m;

/**
 * Format a remaining-minutes value as "Xh Ym" or "Xm".
 */
export const formatRemaining = (totalMinutes) => {
  if (totalMinutes <= 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0)          return `${h}h`;
  return `${m}m`;
};

/**
 * Get the current meal status based on the current time.
 *
 * @returns {{
 *   activeMeal:   object | null,   // MEAL_SCHEDULE entry currently serving
 *   minutesLeft:  number,          // minutes remaining in active meal
 *   nextMeal:     object | null,   // MEAL_SCHEDULE entry for next meal
 * }}
 */
export const getMealStatus = () => {
  const now      = new Date();
  const curMin   = toMinutes(now.getHours(), now.getMinutes());

  let activeMeal  = null;
  let minutesLeft = 0;
  let nextMeal    = null;

  for (let i = 0; i < MEAL_SCHEDULE.length; i++) {
    const meal    = MEAL_SCHEDULE[i];
    const start   = toMinutes(meal.startH, meal.startM);
    const end     = toMinutes(meal.endH, meal.endM);

    if (curMin >= start && curMin < end) {
      // Currently inside this meal window
      activeMeal  = meal;
      minutesLeft = end - curMin;
      // Next meal wraps to breakfast tomorrow if dinner is active
      nextMeal = MEAL_SCHEDULE[(i + 1) % MEAL_SCHEDULE.length];
      break;
    }

    // Track the next upcoming meal (first one whose start is still in the future)
    if (curMin < start && nextMeal === null) {
      nextMeal = meal;
    }
  }

  // If no next meal found (we're past dinner), next is breakfast tomorrow
  if (nextMeal === null) {
    nextMeal = MEAL_SCHEDULE[0];
  }

  // Compute minutes until next meal starts (handles tomorrow wrap-around)
  const nextStart = toMinutes(nextMeal.startH, nextMeal.startM);
  let minutesUntilNext = nextStart - curMin;
  if (minutesUntilNext <= 0) {
    // next meal is tomorrow — add a full day of minutes
    minutesUntilNext += 24 * 60;
  }

  return { activeMeal, minutesLeft, nextMeal, minutesUntilNext };
};

/** Return today's day name matching weeklyMenu.json keys */
export const getTodayName = () => {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[new Date().getDay()];
};

/**
 * Returns the simple key (e.g., 'lunch') of the currently active meal,
 * or 'Closed' if no meal is currently serving.
 */
export const getCurrentMeal = () => {
  const { activeMeal } = getMealStatus();
  return activeMeal ? activeMeal.key : 'Closed';
};

/**
 * Returns true if the given mealKey is currently within its rating window.
 * @param {string} mealKey — e.g. 'breakfast' | 'lunch' | 'snacks' | 'dinner'
 */
export const isMealRatingOpen = (mealKey) => {
  const now = new Date();
  const curMin = toMinutes(now.getHours(), now.getMinutes());
  const meal = MEAL_SCHEDULE.find((m) => m.key === mealKey);
  if (!meal) return false;
  // Rating opens at meal start time and stays open for the rest of the day
  const start = toMinutes(meal.startH, meal.startM);
  return curMin >= start;
};

/**
 * Returns minutes remaining in the given meal's window, or 0 if not active.
 * @param {string} mealKey
 */
/**
 * No longer used — rating has no closing time within the same day.
 * Kept for API compatibility; always returns 0.
 */
export const mealMinutesLeft = () => 0;

/**
 * For a meal that hasn't started yet, returns its startDisplay string.
 * Returns null if it's already open or past.
 * @param {string} mealKey
 */
export const mealOpensAt = (mealKey) => {
  const now = new Date();
  const curMin = toMinutes(now.getHours(), now.getMinutes());
  const meal = MEAL_SCHEDULE.find((m) => m.key === mealKey);
  if (!meal) return null;
  const start = toMinutes(meal.startH, meal.startM);
  return curMin < start ? meal.startDisplay : null;
};
