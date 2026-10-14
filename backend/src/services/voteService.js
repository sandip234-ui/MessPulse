import { query } from '../config/database.js';
import { isMealVotingOpen, getMealOpensAt, getMealStatus } from './timeService.js';

/**
 * Fetch all of today's dishes with sentiment aggregation and user's cast vote
 */
export const getTodayVotesAndLeaderboard = async (userId) => {
  const { todayName, todayDate } = getMealStatus();

  const sql = `
    SELECT 
      d.id AS dish_id,
      d.name AS dish_name,
      d.emoji,
      w.meal_slot,
      w.display_order,
      COUNT(CASE WHEN v.vote_type = 1 THEN 1 END)::INT AS up_votes,
      COUNT(CASE WHEN v.vote_type = -1 THEN 1 END)::INT AS down_votes,
      COUNT(v.id)::INT AS total_votes,
      (COUNT(CASE WHEN v.vote_type = 1 THEN 1 END) - COUNT(CASE WHEN v.vote_type = -1 THEN 1 END))::INT AS net_score,
      CASE 
        WHEN COUNT(v.id) > 0 THEN ROUND((COUNT(CASE WHEN v.vote_type = 1 THEN 1 END)::DECIMAL / COUNT(v.id)::DECIMAL) * 100)::INT
        ELSE 0 
      END AS approval_percentage,
      MAX(CASE WHEN v.user_id = $1 THEN v.vote_type ELSE NULL END) AS user_vote_raw
    FROM weekly_menu_items w
    JOIN dishes d ON w.dish_id = d.id
    LEFT JOIN dish_votes v ON d.id = v.dish_id AND v.vote_date = CURRENT_DATE
    WHERE w.day_of_week = $2
    GROUP BY d.id, d.name, d.emoji, w.meal_slot, w.display_order
    ORDER BY w.meal_slot, w.display_order ASC;
  `;

  const result = await query(sql, [userId, todayName]);

  let totalVotesCount = 0;
  const dishes = result.rows.map((row) => {
    totalVotesCount += row.total_votes;
    const isLocked = !isMealVotingOpen(row.meal_slot);
    const opensAt = isLocked ? getMealOpensAt(row.meal_slot) : null;

    let userVote = null;
    if (row.user_vote_raw === 1) userVote = 'up';
    if (row.user_vote_raw === -1) userVote = 'down';

    return {
      dishId: row.dish_id,
      dishName: row.dish_name,
      emoji: row.emoji,
      mealSlot: row.meal_slot,
      upVotes: row.up_votes,
      downVotes: row.down_votes,
      total: row.total_votes,
      net: row.net_score,
      approval: row.approval_percentage,
      userVote,
      isLocked,
      opensAt,
    };
  });

  // Unique dishes for global leaderboard (deduplicated by dishId if same dish in multiple slots)
  const dishMap = new Map();
  dishes.forEach((d) => {
    if (!dishMap.has(d.dishId)) {
      dishMap.set(d.dishId, d);
    }
  });

  const leaderboard = Array.from(dishMap.values()).sort((a, b) => {
    return b.net - a.net || b.total - a.total;
  });

  const votes = {};
  const userVotes = {};
  dishes.forEach((d) => {
    votes[d.dishName] = {
      dishId: d.dishId,
      dish: d.dishName,
      dishName: d.dishName,
      emoji: d.emoji,
      mealSlot: d.mealSlot,
      up: d.upVotes,
      down: d.downVotes,
      total: d.total,
      net: d.net,
      approval: d.approval,
    };
    if (d.userVote) {
      userVotes[d.dishName] = d.userVote;
    }
  });

  const enrichedLeaderboard = leaderboard.map((item) => ({
    ...item,
    dish: item.dishName,
    up: item.upVotes,
    down: item.downVotes,
  }));

  return {
    today: todayName,
    date: todayDate,
    totalVotesToday: totalVotesCount,
    totalVotesAcrossAll: totalVotesCount,
    dishes,
    votes,
    userVotes,
    leaderboard: enrichedLeaderboard,
  };
};

/**
 * Cast or change a dish vote
 * Enforces timing window check and atomic UPSERT
 */
export const castVote = async (userId, { dishId, dishName, mealSlot, voteType }) => {
  // 1. Enforce meal timing rule: voting opens when meal starts
  if (!isMealVotingOpen(mealSlot)) {
    const opensAt = getMealOpensAt(mealSlot);
    const error = new Error(`Voting for ${mealSlot} dishes is locked until ${opensAt}.`);
    error.statusCode = 400;
    error.code = 'VOTING_LOCKED_FOR_MEAL';
    throw error;
  }

  // 2. Normalize vote type to +1 or -1
  const numericVote = (voteType === 'up' || voteType === 'positive' || voteType === 1 || voteType === '1') ? 1 : -1;

  // 3. Verify dish exists
  let dish;
  if (dishId) {
    const dishCheck = await query('SELECT id, name, emoji FROM dishes WHERE id = $1', [dishId]);
    if (dishCheck.rowCount === 0) {
      const error = new Error('Selected dish does not exist.');
      error.statusCode = 404;
      error.code = 'DISH_NOT_FOUND';
      throw error;
    }
    dish = dishCheck.rows[0];
  } else if (dishName) {
    const dishCheck = await query('SELECT id, name, emoji FROM dishes WHERE LOWER(name) = LOWER($1)', [dishName.trim()]);
    if (dishCheck.rowCount === 0) {
      const error = new Error(`Dish '${dishName}' not found.`);
      error.statusCode = 404;
      error.code = 'DISH_NOT_FOUND';
      throw error;
    }
    dish = dishCheck.rows[0];
  } else {
    const error = new Error('Dish identifier is required.');
    error.statusCode = 400;
    error.code = 'DISH_REQUIRED';
    throw error;
  }

  const resolvedDishId = dish.id;

  // 4. Atomic PostgreSQL UPSERT (1 vote per user per dish per day)
  const upsertSql = `
    INSERT INTO dish_votes (user_id, dish_id, vote_date, meal_slot, vote_type)
    VALUES ($1, $2, CURRENT_DATE, $3, $4)
    ON CONFLICT (user_id, dish_id, vote_date)
    DO UPDATE SET 
      vote_type = EXCLUDED.vote_type,
      meal_slot = EXCLUDED.meal_slot,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, dish_id, vote_date, vote_type;
  `;

  await query(upsertSql, [userId, resolvedDishId, mealSlot, numericVote]);

  // 5. Fetch updated aggregation for this dish today
  const aggSql = `
    SELECT 
      COUNT(CASE WHEN vote_type = 1 THEN 1 END)::INT AS up_votes,
      COUNT(CASE WHEN vote_type = -1 THEN 1 END)::INT AS down_votes,
      COUNT(id)::INT AS total_votes,
      (COUNT(CASE WHEN vote_type = 1 THEN 1 END) - COUNT(CASE WHEN vote_type = -1 THEN 1 END))::INT AS net_score,
      CASE 
        WHEN COUNT(id) > 0 THEN ROUND((COUNT(CASE WHEN vote_type = 1 THEN 1 END)::DECIMAL / COUNT(id)::DECIMAL) * 100)::INT
        ELSE 0 
      END AS approval_percentage
    FROM dish_votes
    WHERE dish_id = $1 AND vote_date = CURRENT_DATE;
  `;

  const aggRes = await query(aggSql, [dishId]);
  const agg = aggRes.rows[0];

  return {
    dishId,
    dishName: dish.name,
    emoji: dish.emoji,
    userVote: numericVote === 1 ? 'up' : 'down',
    upVotes: agg.up_votes,
    downVotes: agg.down_votes,
    total: agg.total_votes,
    net: agg.net_score,
    approval: agg.approval_percentage,
  };
};
