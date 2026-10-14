import React, { useState } from 'react';

/**
 * RatingStars — interactive 1–5 star rating widget
 * Props:
 *   rating    (number)   — current saved rating (0 = none)
 *   onRate    (function) — called with new rating value when user clicks
 *   size      (string)   — 'sm' | 'md' | 'lg' (default 'md')
 *   readonly  (bool)     — shows stars without interaction (full opacity, summary strip)
 *   disabled  (bool)     — locked state: dimmed opacity, cursor-not-allowed, no clicks
 */
const RatingStars = ({ rating = 0, onRate, size = 'md', readonly = false, disabled = false }) => {
  const [hovered, setHovered] = useState(0);

  const sizeConfig = {
    sm: { star: 'text-xl', gap: 'gap-1' },
    md: { star: 'text-3xl', gap: 'gap-1.5' },
    lg: { star: 'text-4xl', gap: 'gap-2' },
  }[size] || { star: 'text-3xl', gap: 'gap-1.5' };

  const blocked = readonly || disabled;
  const activeIndex = hovered || rating;

  return (
    <div
      className={`flex items-center ${sizeConfig.gap} ${disabled ? 'opacity-40 select-none' : ''}`}
      role="group"
      aria-label="Star rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= activeIndex;
        return (
          <button
            key={star}
            type="button"
            disabled={blocked}
            onClick={() => !blocked && onRate && onRate(star)}
            onMouseEnter={() => !blocked && setHovered(star)}
            onMouseLeave={() => !blocked && setHovered(0)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            className={`
              ${sizeConfig.star}
              leading-none transition-all duration-150 transform
              ${disabled ? 'cursor-not-allowed' :
                readonly ? 'cursor-default' :
                           'cursor-pointer hover:scale-125 active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg'}
              ${isFilled ? 'text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]' : 'text-gray-300 dark:text-gray-600 opacity-60'}
            `}
          >
            {isFilled ? '★' : '☆'}
          </button>
        );
      })}

      {/* Numeric label — only shown when interactive and rated */}
      {!blocked && rating > 0 && (
        <span className="ml-2.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          {rating}/5
        </span>
      )}
    </div>
  );
};

export default RatingStars;
