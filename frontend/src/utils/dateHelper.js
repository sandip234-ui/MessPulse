/**
 * Returns the current day name as it appears in weeklyMenu.json
 * e.g., "Monday", "Tuesday", ...
 */
export const getTodayName = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date().getDay(); // 0 = Sunday
  return days[today];
};
