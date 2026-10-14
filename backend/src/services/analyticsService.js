import { query } from '../config/database.js';
import { getMealStatus } from './timeService.js';

const CATEGORY_LABELS = {
  food_quality: 'Food Quality',
  hygiene: 'Hygiene & Cleanliness',
  quantity: 'Quantity / Portions',
  service: 'Staff & Service',
  timing: 'Meal Timing',
  suggestion: 'Suggestions',
  other: 'Other',
};

const MEAL_DISPLAY = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

/**
 * Compute Admin Analytics Overview via PostgreSQL aggregation queries
 */
export const getAdminAnalyticsOverview = async () => {
  const { todayName } = getMealStatus();

  // 1. Core KPIs
  const kpiSql = `
    SELECT 
      (SELECT COUNT(*)::INT FROM meal_ratings) AS total_ratings,
      (SELECT COUNT(*)::INT FROM feedback WHERE is_deleted = FALSE) AS total_feedback,
      (SELECT COUNT(*)::INT FROM dish_votes) AS total_votes,
      (SELECT ROUND(AVG(rating), 2) FROM meal_ratings) AS overall_avg_rating;
  `;
  const kpiRes = await query(kpiSql);
  const kpi = kpiRes.rows[0];

  // 2. Average Rating Per Meal Slot
  const mealAvgSql = `
    SELECT 
      key AS meal_slot,
      label,
      COALESCE(ROUND(AVG(r.rating), 2), 0) AS avg_rating,
      COUNT(r.id)::INT AS total_ratings
    FROM meal_slots m
    LEFT JOIN meal_ratings r ON m.key = r.meal_slot
    GROUP BY key, label, display_order
    ORDER BY display_order ASC;
  `;
  const mealAvgRes = await query(mealAvgSql);

  const averageRatings = {
    breakfast: 0,
    lunch: 0,
    snacks: 0,
    dinner: 0,
  };
  mealAvgRes.rows.forEach((row) => {
    averageRatings[row.meal_slot] = parseFloat(row.avg_rating) || 0;
  });

  // Calculate highest & lowest rated meals
  const ratedMeals = mealAvgRes.rows
    .filter((r) => r.total_ratings > 0 && parseFloat(r.avg_rating) > 0)
    .sort((a, b) => parseFloat(b.avg_rating) - parseFloat(a.avg_rating));

  let highest = null;
  let lowest = null;

  if (ratedMeals.length > 0) {
    const high = ratedMeals[0];
    const low = ratedMeals[ratedMeals.length - 1];
    highest = {
      meal: high.meal_slot,
      label: MEAL_DISPLAY[high.meal_slot] || high.meal_slot,
      value: parseFloat(high.avg_rating),
    };
    if (high.meal_slot !== low.meal_slot) {
      lowest = {
        meal: low.meal_slot,
        label: MEAL_DISPLAY[low.meal_slot] || low.meal_slot,
        value: parseFloat(low.avg_rating),
      };
    }
  }

  // 3. Weekly Satisfaction Trend (Grouped Mon-Sun)
  const weeklySql = `
    SELECT 
      TRIM(TO_CHAR(rating_date, 'Day')) AS day_name,
      EXTRACT(ISODOW FROM rating_date) AS day_num,
      ROUND(AVG(rating), 1) AS avg_rating,
      COUNT(id)::INT AS count
    FROM meal_ratings
    WHERE rating_date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY TRIM(TO_CHAR(rating_date, 'Day')), EXTRACT(ISODOW FROM rating_date)
    ORDER BY day_num ASC;
  `;
  const weeklyRes = await query(weeklySql);

  const daysLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayNameMapping = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
  const weeklyMap = {};
  weeklyRes.rows.forEach((r) => {
    weeklyMap[dayNameMapping[r.day_num]] = parseFloat(r.avg_rating);
  });
  const weeklyTrendData = daysLabels.map((day) => weeklyMap[day] ?? null);

  // 4. Feedback Category Breakdown and Status Counts (excluding soft-deleted)
  const feedbackCatSql = `
    SELECT 
      category,
      COUNT(*)::INT AS count
    FROM feedback
    WHERE is_deleted = FALSE
    GROUP BY category
    ORDER BY count DESC;
  `;
  const feedbackCatRes = await query(feedbackCatSql);

  const totalFeedbackCount = kpi.total_feedback || 0;
  const categoriesBreakdown = feedbackCatRes.rows.map((row) => ({
    category: row.category,
    label: CATEGORY_LABELS[row.category] || row.category,
    count: row.count,
    percentage: totalFeedbackCount > 0 ? Math.round((row.count / totalFeedbackCount) * 100) : 0,
  }));

  const topCategory = categoriesBreakdown.length > 0 ? categoriesBreakdown[0] : null;

  const feedbackStatusSql = `
    SELECT 
      status,
      COUNT(*)::INT AS count
    FROM feedback
    WHERE is_deleted = FALSE
    GROUP BY status;
  `;
  const feedbackStatusRes = await query(feedbackStatusSql);
  const statusCounts = { pending: 0, reviewed: 0, resolved: 0 };
  feedbackStatusRes.rows.forEach((r) => {
    statusCounts[r.status] = r.count;
  });

  // 5. Voting Sentiment & Dish Leaderboard for Today's Scheduled Dishes
  const votingSql = `
    SELECT 
      d.id AS dish_id,
      d.name AS dish_name,
      d.emoji,
      w.meal_slot,
      COUNT(CASE WHEN v.vote_type = 1 THEN 1 END)::INT AS up_votes,
      COUNT(CASE WHEN v.vote_type = -1 THEN 1 END)::INT AS down_votes,
      COUNT(v.id)::INT AS total_votes,
      (COUNT(CASE WHEN v.vote_type = 1 THEN 1 END) - COUNT(CASE WHEN v.vote_type = -1 THEN 1 END))::INT AS net_score,
      CASE 
        WHEN COUNT(v.id) > 0 THEN ROUND((COUNT(CASE WHEN v.vote_type = 1 THEN 1 END)::DECIMAL / COUNT(v.id)::DECIMAL) * 100)::INT
        ELSE 0 
      END AS approval_percentage
    FROM weekly_menu_items w
    JOIN dishes d ON w.dish_id = d.id
    LEFT JOIN dish_votes v ON d.id = v.dish_id AND v.vote_date = CURRENT_DATE
    WHERE w.day_of_week = $1
    GROUP BY d.id, d.name, d.emoji, w.meal_slot, w.display_order
    ORDER BY net_score DESC, total_votes DESC;
  `;
  const votingRes = await query(votingSql, [todayName]);

  // Deduplicate dishes for sentiment metrics
  const uniqueDishMap = new Map();
  votingRes.rows.forEach((r) => {
    if (!uniqueDishMap.has(r.dish_id)) {
      uniqueDishMap.set(r.dish_id, r);
    }
  });
  const sentimentStats = Array.from(uniqueDishMap.values());
  const activeVotedDishes = sentimentStats.filter((d) => d.total_votes > 0);

  let mostLiked = null;
  let mostDisliked = null;
  let mostEngaged = null;
  let avgApproval = 0;

  if (activeVotedDishes.length > 0) {
    const sortedByNet = [...activeVotedDishes].sort((a, b) => b.net_score - a.net_score || b.approval_percentage - a.approval_percentage);
    const sortedByLowNet = [...activeVotedDishes].sort((a, b) => a.net_score - b.net_score || a.approval_percentage - b.approval_percentage);
    const sortedByTotal = [...activeVotedDishes].sort((a, b) => b.total_votes - a.total_votes);

    mostLiked = {
      dish: sortedByNet[0].dish_name,
      score: sortedByNet[0].net_score,
      percentage: sortedByNet[0].approval_percentage,
    };

    mostDisliked = {
      dish: sortedByLowNet[0].dish_name,
      score: sortedByLowNet[0].net_score,
      percentage: sortedByLowNet[0].approval_percentage,
    };

    mostEngaged = {
      dish: sortedByTotal[0].dish_name,
      count: sortedByTotal[0].total_votes,
    };

    const totalApprovalSum = activeVotedDishes.reduce((acc, curr) => acc + curr.approval_percentage, 0);
    avgApproval = Math.round(totalApprovalSum / activeVotedDishes.length);
  }

  // 6. Assemble Generated Insights
  const insights = [];
  if (highest) {
    insights.push({
      icon: '⭐',
      text: `${highest.label} has the highest average rating — ${highest.value}/5`,
      highlight: true,
    });
  }
  if (lowest) {
    const needsWork = lowest.value < 3;
    insights.push({
      icon: needsWork ? '⚠️' : '📉',
      text: `${lowest.label} has the lowest rating (${lowest.value}/5)${needsWork ? ' — needs improvement' : ''}`,
      highlight: false,
    });
  }
  if (topCategory && topCategory.count > 0) {
    insights.push({
      icon: '💬',
      text: `Most common feedback category: "${topCategory.label}" (${topCategory.percentage}% of ${totalFeedbackCount} submissions)`,
      highlight: false,
    });
  }
  if (mostEngaged) {
    insights.push({
      icon: '🗳️',
      text: `Highest participation: "${mostEngaged.dish}" with ${mostEngaged.count} total response${mostEngaged.count !== 1 ? 's' : ''}.`,
      highlight: false,
    });
  }
  if (mostLiked) {
    insights.push({
      icon: '👍',
      text: `Most Liked: "${mostLiked.dish}" (${mostLiked.percentage}% approval).`,
      highlight: true,
    });
  }
  if (mostDisliked && mostDisliked.score < 0) {
    insights.push({
      icon: '👎',
      text: `Most Disliked: "${mostDisliked.dish}" (${mostDisliked.percentage}% approval).`,
      highlight: false,
    });
  }

  return {
    kpis: {
      totalRatings: kpi.total_ratings,
      totalFeedback: kpi.total_feedback,
      totalVotes: kpi.total_votes,
      overallAverageRating: parseFloat(kpi.overall_avg_rating) || 0,
    },
    averageRatings,
    highestLowest: { highest, lowest },
    weeklySatisfaction: {
      labels: daysLabels,
      data: weeklyTrendData,
    },
    feedbackBreakdown: {
      topCategory: topCategory ? topCategory.category : null,
      topLabel: topCategory ? topCategory.label : null,
      topCount: topCategory ? topCategory.count : 0,
      percentage: topCategory ? topCategory.percentage : 0,
      total: totalFeedbackCount,
      categories: categoriesBreakdown,
      statusCounts,
    },
    sentimentInsights: {
      mostLiked,
      mostDisliked,
      mostEngaged,
      avgApproval,
    },
    leaderboard: sentimentStats.map((s) => ({
      dishId: s.dish_id,
      dishName: s.dish_name,
      emoji: s.emoji,
      mealSlot: s.meal_slot,
      upVotes: s.up_votes,
      downVotes: s.down_votes,
      total: s.total_votes,
      net: s.net_score,
      approval: s.approval_percentage,
    })),
    insights,
  };
};
