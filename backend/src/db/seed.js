import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { getDishEmoji } from '../utils/dishEmoji.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');
    await client.query('BEGIN');

    // ─── 1. Seed Initial Admin User ──────────────────────────────
    console.log('  👤 Seeding admin user from environment...');
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt);

    const adminQuery = `
      INSERT INTO users (reg_no, full_name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, 'admin', TRUE)
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        reg_no = EXCLUDED.reg_no,
        password_hash = EXCLUDED.password_hash,
        role = 'admin',
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, reg_no, email, role;
    `;
    const adminRes = await client.query(adminQuery, [
      env.ADMIN_REG_NO.trim(),
      env.ADMIN_NAME.trim(),
      env.ADMIN_EMAIL.trim().toLowerCase(),
      passwordHash,
    ]);
    console.log(`  ✅ Admin user ready: ${adminRes.rows[0].email} (${adminRes.rows[0].reg_no})`);

    // ─── 2. Seed Master Dishes and Weekly Menu ────────────────────
    console.log('  🍲 Seeding weekly menu & dish catalog...');
    
    // Locate weeklyMenu.json from backend data or frontend backup
    const localMenuPath = path.resolve(__dirname, '../data/weeklyMenu.json');
    const frontendMenuPath = path.resolve(__dirname, '../../../frontend/src/data/weeklyMenu.json');
    let weeklyMenuData;
    
    if (fs.existsSync(localMenuPath)) {
      weeklyMenuData = JSON.parse(fs.readFileSync(localMenuPath, 'utf8'));
    } else if (fs.existsSync(frontendMenuPath)) {
      weeklyMenuData = JSON.parse(fs.readFileSync(frontendMenuPath, 'utf8'));
    } else {
      throw new Error(`Cannot find weeklyMenu.json at ${localMenuPath} or ${frontendMenuPath}`);
    }

    // Step 2a: Collect unique dishes across the entire week
    const dishMap = new Map(); // name -> emoji
    for (const [day, meals] of Object.entries(weeklyMenuData)) {
      for (const [meal, dishes] of Object.entries(meals)) {
        if (Array.isArray(dishes)) {
          for (const dish of dishes) {
            const trimmed = dish.trim();
            if (trimmed && !dishMap.has(trimmed)) {
              dishMap.set(trimmed, getDishEmoji(trimmed));
            }
          }
        }
      }
    }

    // Step 2b: Upsert each unique dish and retrieve its UUID
    const dishDbMap = new Map(); // name.toLowerCase() -> uuid
    for (const [dishName, emoji] of dishMap.entries()) {
      const dishRes = await client.query(
        `INSERT INTO dishes (name, emoji, is_active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (name) DO UPDATE SET emoji = EXCLUDED.emoji
         RETURNING id, name;`,
        [dishName, emoji]
      );
      dishDbMap.set(dishName.toLowerCase(), dishRes.rows[0].id);
    }
    console.log(`  ✅ ${dishDbMap.size} unique dishes indexed into master catalog.`);

    // Step 2c: Seed weekly_menu_items
    let menuItemsCount = 0;
    for (const [day, meals] of Object.entries(weeklyMenuData)) {
      for (const [meal, dishes] of Object.entries(meals)) {
        if (Array.isArray(dishes)) {
          for (let i = 0; i < dishes.length; i++) {
            const dishName = dishes[i].trim();
            const dishId = dishDbMap.get(dishName.toLowerCase());
            if (dishId) {
              await client.query(
                `INSERT INTO weekly_menu_items (day_of_week, meal_slot, dish_id, display_order)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (day_of_week, meal_slot, dish_id) DO UPDATE SET
                   display_order = EXCLUDED.display_order;`,
                [day, meal, dishId, i]
              );
              menuItemsCount++;
            }
          }
        }
      }
    }
    console.log(`  ✅ ${menuItemsCount} weekly menu schedule items established.`);

    await client.query('COMMIT');
    console.log('✨ Database seeding finished successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct execution: `node src/db/seed.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
