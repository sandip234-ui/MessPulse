import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import {
  TIMEZONE,
  getMealStatus,
  isMealRatingOpen,
  isMealVotingOpen,
  getMealOpensAt,
} from '../src/services/timeService.js';

describe('Time & Meal Window Calculation Engine (Asia/Kolkata)', () => {
  const makeKolkataTime = (hour, minute) => {
    return DateTime.fromObject(
      { year: 2026, month: 10, day: 8, hour, minute, second: 0 },
      { zone: TIMEZONE }
    );
  };

  it('At 07:30 AM (Before Breakfast): status is Closed, rating & voting unavailable', () => {
    const time = makeKolkataTime(7, 30);
    const status = getMealStatus(time);

    assert.equal(status.activeMealKey, 'Closed');
    assert.equal(status.activeMeal, null);
    assert.equal(status.nextMeal.key, 'breakfast');
    assert.equal(status.minutesUntilNext, 30); // 30 mins to 08:00

    assert.equal(isMealRatingOpen('breakfast', time), false);
    assert.equal(isMealVotingOpen('breakfast', time), false);
    assert.equal(getMealOpensAt('breakfast', time), '8:00 AM');
  });

  it('At 08:15 AM (During Breakfast): status is Active, rating & voting available', () => {
    const time = makeKolkataTime(8, 15);
    const status = getMealStatus(time);

    assert.equal(status.activeMealKey, 'breakfast');
    assert.equal(status.activeMeal.label, 'Breakfast');
    assert.equal(status.minutesLeft, 75); // 09:30 - 08:15 = 75 mins
    assert.equal(status.nextMeal.key, 'lunch');

    assert.equal(isMealRatingOpen('breakfast', time), true);
    assert.equal(isMealVotingOpen('breakfast', time), true);
    assert.equal(getMealOpensAt('breakfast', time), null);
  });

  it('At 10:00 AM (After Breakfast 09:30): Breakfast status is Closed, but rating & voting REMAIN open for the day', () => {
    const time = makeKolkataTime(10, 0);
    const status = getMealStatus(time);

    // Live status should be closed (between breakfast and lunch)
    assert.equal(status.activeMealKey, 'Closed');
    assert.equal(status.nextMeal.key, 'lunch');
    assert.equal(status.minutesUntilNext, 120); // 2 hours to 12:00 PM

    // Critical MessPulse Rule: Rating and voting for breakfast remain open!
    assert.equal(isMealRatingOpen('breakfast', time), true);
    assert.equal(isMealVotingOpen('breakfast', time), true);

    // Lunch is not open yet
    assert.equal(isMealRatingOpen('lunch', time), false);
    assert.equal(isMealVotingOpen('lunch', time), false);
    assert.equal(getMealOpensAt('lunch', time), '12:00 PM');
  });

  it('At 13:00 PM (During Lunch 12:00-14:00): Lunch is Active, Breakfast and Lunch ratings both available', () => {
    const time = makeKolkataTime(13, 0);
    const status = getMealStatus(time);

    assert.equal(status.activeMealKey, 'lunch');
    assert.equal(status.minutesLeft, 60);

    assert.equal(isMealRatingOpen('breakfast', time), true);
    assert.equal(isMealRatingOpen('lunch', time), true);
    assert.equal(isMealRatingOpen('snacks', time), false);
    assert.equal(isMealRatingOpen('dinner', time), false);
  });

  it('At 23:00 PM (After Dinner 22:00): All 4 meal ratings & votes are open, next meal is Breakfast tomorrow', () => {
    const time = makeKolkataTime(23, 0);
    const status = getMealStatus(time);

    assert.equal(status.activeMealKey, 'Closed');
    assert.equal(status.nextMeal.key, 'breakfast');
    assert.equal(status.minutesUntilNext, 9 * 60); // 9 hours to 08:00 AM next day

    // All meals are open for today
    assert.equal(isMealRatingOpen('breakfast', time), true);
    assert.equal(isMealRatingOpen('lunch', time), true);
    assert.equal(isMealRatingOpen('snacks', time), true);
    assert.equal(isMealRatingOpen('dinner', time), true);
  });
});
