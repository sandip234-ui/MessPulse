import { DateTime } from 'luxon';

export const TIMEZONE = 'Asia/Kolkata';

export const MEAL_SCHEDULE = [
  {
    key: 'breakfast',
    label: 'Breakfast',
    emoji: '🌅',
    startH: 8,
    startM: 0,
    endH: 9,
    endM: 30,
    display: '8:00 AM – 9:30 AM',
    startDisplay: '8:00 AM',
  },
  {
    key: 'lunch',
    label: 'Lunch',
    emoji: '☀️',
    startH: 12,
    startM: 0,
    endH: 14,
    endM: 0,
    display: '12:00 PM – 2:00 PM',
    startDisplay: '12:00 PM',
  },
  {
    key: 'snacks',
    label: 'Snacks',
    emoji: '🍩',
    startH: 17,
    startM: 0,
    endH: 18,
    endM: 0,
    display: '5:00 PM – 6:00 PM',
    startDisplay: '5:00 PM',
  },
  {
    key: 'dinner',
    label: 'Dinner',
    emoji: '🌙',
    startH: 20,
    startM: 0,
    endH: 22,
    endM: 0,
    display: '8:00 PM – 10:00 PM',
    startDisplay: '8:00 PM',
  },
];

const toMinutes = (h, m) => h * 60 + m;

/**
 * Format total minutes as "Xh Ym" or "Xm"
 */
export const formatRemainingMinutes = (totalMinutes) => {
  if (totalMinutes <= 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

/**
 * Get current server date/time in Asia/Kolkata
 * @param {Date | DateTime | string} [customTime] - Optional time for deterministic testing
 */
export const getKolkataDateTime = (customTime = null) => {
  if (customTime instanceof DateTime) {
    return customTime.setZone(TIMEZONE);
  }
  if (customTime) {
    return DateTime.fromJSDate(new Date(customTime)).setZone(TIMEZONE);
  }
  return DateTime.now().setZone(TIMEZONE);
};

/**
 * Check if rating is open for a meal slot
 * Rule: Rating opens at meal start time and remains available for the rest of that day
 */
export const isMealRatingOpen = (mealKey, customTime = null) => {
  const dt = getKolkataDateTime(customTime);
  const curMin = toMinutes(dt.hour, dt.minute);
  const meal = MEAL_SCHEDULE.find((m) => m.key === mealKey);
  if (!meal) return false;

  const start = toMinutes(meal.startH, meal.startM);
  return curMin >= start;
};

/**
 * Check if voting is open for a meal slot
 * Rule: Voting opens at meal start time and remains available for the rest of that day
 */
export const isMealVotingOpen = (mealKey, customTime = null) => {
  const dt = getKolkataDateTime(customTime);
  const curMin = toMinutes(dt.hour, dt.minute);
  const meal = MEAL_SCHEDULE.find((m) => m.key === mealKey);
  if (!meal) return false;

  const start = toMinutes(meal.startH, meal.startM);
  return curMin >= start;
};

/**
 * Get start display string if upcoming, or null if open/past
 */
export const getMealOpensAt = (mealKey, customTime = null) => {
  const dt = getKolkataDateTime(customTime);
  const curMin = toMinutes(dt.hour, dt.minute);
  const meal = MEAL_SCHEDULE.find((m) => m.key === mealKey);
  if (!meal) return null;

  const start = toMinutes(meal.startH, meal.startM);
  return curMin < start ? meal.startDisplay : null;
};

/**
 * Compute the complete live meal state for a given timestamp
 * @param {Date | DateTime | string} [customTime]
 */
export const getMealStatus = (customTime = null) => {
  const dt = getKolkataDateTime(customTime);
  const curMin = toMinutes(dt.hour, dt.minute);
  const todayName = dt.toFormat('cccc'); // 'Monday'..'Sunday'
  const todayDate = dt.toISODate();      // 'YYYY-MM-DD'

  let activeMeal = null;
  let minutesLeft = 0;
  let nextMeal = null;
  const completedMeals = [];
  const mealWindows = {};

  for (let i = 0; i < MEAL_SCHEDULE.length; i++) {
    const meal = MEAL_SCHEDULE[i];
    const start = toMinutes(meal.startH, meal.startM);
    const end = toMinutes(meal.endH, meal.endM);

    let status = 'upcoming';

    if (curMin >= start && curMin < end) {
      activeMeal = meal;
      minutesLeft = end - curMin;
      nextMeal = MEAL_SCHEDULE[(i + 1) % MEAL_SCHEDULE.length];
      status = 'active';
    } else if (curMin >= end) {
      completedMeals.push(meal.key);
      status = 'completed';
    }

    if (curMin < start && nextMeal === null) {
      nextMeal = meal;
    }

    mealWindows[meal.key] = {
      label: meal.label,
      emoji: meal.emoji,
      display: meal.display,
      status,
      ratingOpen: curMin >= start,
      votingOpen: curMin >= start,
      opensAt: curMin < start ? meal.startDisplay : null,
    };
  }

  // If no upcoming meal today (e.g. after dinner 22:00), next meal is tomorrow's breakfast
  if (nextMeal === null) {
    nextMeal = MEAL_SCHEDULE[0];
  }

  const nextStart = toMinutes(nextMeal.startH, nextMeal.startM);
  let minutesUntilNext = nextStart - curMin;
  if (minutesUntilNext <= 0) {
    minutesUntilNext += 24 * 60; // Next meal is tomorrow
  }

  return {
    todayName,
    todayDate,
    activeMealKey: activeMeal ? activeMeal.key : 'Closed',
    activeMeal,
    minutesLeft,
    formattedMinutesLeft: formatRemainingMinutes(minutesLeft),
    nextMeal,
    minutesUntilNext,
    formattedMinutesUntilNext: formatRemainingMinutes(minutesUntilNext),
    completedMeals,
    mealWindows,
  };
};
