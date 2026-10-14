import { query } from '../config/database.js';

/**
 * Submit feedback
 * Authenticated users only; user_id is strictly derived from session
 */
export const submitFeedback = async (userId, { category, message }) => {
  const insertSql = `
    INSERT INTO feedback (user_id, category, message, status, is_deleted)
    VALUES ($1, $2, $3, 'pending', FALSE)
    RETURNING id, category, message, status, created_at;
  `;

  const result = await query(insertSql, [userId, category, message.trim()]);
  const row = result.rows[0];

  return {
    id: row.id,
    category: row.category,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    feedback: {
      id: row.id,
      category: row.category,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    },
  };
};

/**
 * Get feedback list
 * Students see only their own active feedback; Admins see all active feedback.
 */
export const getFeedbackList = async (user, { category, status, limit = 50, offset = 0 } = {}) => {
  const isAdmin = user.role === 'admin';
  const conditions = ['f.is_deleted = FALSE'];
  const params = [];
  let paramIndex = 1;

  if (!isAdmin) {
    conditions.push(`f.user_id = $${paramIndex++}`);
    params.push(user.id);
  }

  if (category) {
    conditions.push(`f.category = $${paramIndex++}`);
    params.push(category);
  }

  if (status) {
    conditions.push(`f.status = $${paramIndex++}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*)::INT AS total
    FROM feedback f
    ${whereClause};
  `;
  const countRes = await query(countSql, params);
  const totalCount = countRes.rows[0].total;

  const dataSql = `
    SELECT 
      f.id,
      f.category,
      f.message,
      f.status,
      f.created_at,
      u.id AS user_id,
      u.full_name,
      u.reg_no,
      u.email
    FROM feedback f
    LEFT JOIN users u ON f.user_id = u.id
    ${whereClause}
    ORDER BY f.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;

  const dataRes = await query(dataSql, [...params, limit, offset]);

  const items = dataRes.rows.map((row) => {
    const dateObj = new Date(row.created_at);
    return {
      id: row.id,
      category: row.category,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      date: dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      time: dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
      user: row.user_id
        ? {
            id: row.user_id,
            fullName: row.full_name,
            regNo: row.reg_no,
            email: row.email,
          }
        : null,
      user_full_name: row.full_name,
      user_reg_no: row.reg_no,
    };
  });

  return {
    total: totalCount,
    limit,
    offset,
    items,
    feedback: items,
  };
};

/**
 * Soft delete feedback
 * Students can only delete their own feedback; Admins can delete any.
 */
export const deleteFeedback = async (user, feedbackId) => {
  const isAdmin = user.role === 'admin';

  // Check if feedback exists and is not already deleted
  const checkSql = `
    SELECT id, user_id, is_deleted
    FROM feedback
    WHERE id = $1;
  `;
  const checkRes = await query(checkSql, [feedbackId]);

  if (checkRes.rowCount === 0 || checkRes.rows[0].is_deleted) {
    const error = new Error('Feedback not found or already deleted.');
    error.statusCode = 404;
    error.code = 'FEEDBACK_NOT_FOUND';
    throw error;
  }

  const feedback = checkRes.rows[0];

  if (!isAdmin && feedback.user_id !== user.id) {
    const error = new Error('Access denied. You can only delete your own feedback.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN_OWNER_ONLY';
    throw error;
  }

  await query(
    `UPDATE feedback
     SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1;`,
    [feedbackId]
  );

  return {
    id: feedbackId,
    deleted: true,
  };
};

/**
 * Update feedback status (Admin only)
 */
export const updateFeedbackStatus = async (feedbackId, status) => {
  const updateSql = `
    UPDATE feedback
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND is_deleted = FALSE
    RETURNING id, category, message, status, updated_at;
  `;

  const result = await query(updateSql, [status, feedbackId]);

  if (result.rowCount === 0) {
    const error = new Error('Feedback not found.');
    error.statusCode = 404;
    error.code = 'FEEDBACK_NOT_FOUND';
    throw error;
  }

  return result.rows[0];
};
