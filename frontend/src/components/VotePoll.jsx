import React from 'react';
import { getDishEmoji } from '../utils/dishEmoji';

/**
 * VotePoll — a single dish vote card
 * Props:
 *   dish      (string)  — dish name
 *   votes     (object)  — { up, down, total, net, approval }
 *   userVote  (string)  — 'up' | 'down' | null
 *   onVote    (fn)      — called with ('up' | 'down') when user clicks
 *   isLocked  (bool)    — whether voting is locked (before meal start)
 *   opensAt   (string)  — start time display
 */
const VotePoll = ({ dish, votes, userVote, onVote, isLocked, opensAt }) => {
  const up = votes?.up || 0;
  const down = votes?.down || 0;
  const total = up + down;
  const approval = total > 0 ? Math.round((up / total) * 100) : 0;
  const net = up - down;

  return (
    <div
      className={`glass-card rounded-3xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
        userVote
          ? 'border-orange-500/40 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500/30'
          : isLocked
            ? 'opacity-65 saturate-60 border-gray-200/40 dark:border-gray-700/40'
            : 'hover:shadow-md'
      }`}
    >
      <div>
        {/* Dish Title & Emoji */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-xl shrink-0">
              {getDishEmoji(dish)}
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-gray-900 dark:text-white leading-snug">
                {dish}
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                {total} community vote{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {isLocked ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              ⏳ Locked
            </span>
          ) : (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                net > 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : net < 0
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              {net > 0 ? `+${net}` : net} Net
            </span>
          )}
        </div>

        {/* Approval Sentiment Bar */}
        <div className="mb-5 p-3 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30">
          <div className="flex justify-between text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5">
            <span>{total > 0 ? `${approval}% Approval` : 'No votes yet'}</span>
            <span className="text-gray-400 dark:text-gray-500 font-normal">{total} total</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden flex">
            {total > 0 ? (
              <>
                <div
                  className="h-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${approval}%` }}
                />
                <div
                  className="h-full bg-linear-to-r from-rose-400 to-red-500 transition-all duration-500"
                  style={{ width: `${100 - approval}%` }}
                />
              </>
            ) : (
              <div className="h-full bg-gray-300/50 dark:bg-gray-600/50 w-full" />
            )}
          </div>
        </div>
      </div>

      {/* Vote Action Buttons */}
      <div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Upvote Button */}
          <button
            onClick={() => !isLocked && onVote('up')}
            disabled={isLocked}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              userVote === 'up'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                : isLocked
                  ? 'bg-gray-100/50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 active:scale-95 border border-emerald-500/20'
            }`}
          >
            <span>👍</span>
            <span>{userVote === 'up' ? 'Liked' : 'Tasty'}</span>
            {up > 0 && <span className="text-[11px] opacity-80">({up})</span>}
          </button>

          {/* Downvote Button */}
          <button
            onClick={() => !isLocked && onVote('down')}
            disabled={isLocked}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              userVote === 'down'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-[1.02]'
                : isLocked
                  ? 'bg-gray-100/50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 active:scale-95 border border-rose-500/20'
            }`}
          >
            <span>👎</span>
            <span>{userVote === 'down' ? 'Disliked' : 'Not Good'}</span>
            {down > 0 && <span className="text-[11px] opacity-80">({down})</span>}
          </button>
        </div>

        {/* Micro-hint */}
        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-2.5 italic">
          {userVote
            ? 'Tap opposite button to switch your vote'
            : isLocked
              ? `Voting unlocks at ${opensAt}`
              : 'Tap to cast your vote'}
        </p>
      </div>
    </div>
  );
};

export default VotePoll;