import React, { useState } from 'react';
import feedbackService from '../services/feedbackService';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'food_quality', label: '🍛 Food Quality & Taste' },
  { value: 'hygiene',      label: '🧹 Hygiene & Dining Cleanliness' },
  { value: 'quantity',     label: '⚖️ Portion Sizes & Quantity' },
  { value: 'service',      label: '🤝 Mess Staff & Counter Service' },
  { value: 'timing',       label: '⏰ Meal Timing & Delays' },
  { value: 'suggestion',   label: '💡 Menu Suggestions' },
  { value: 'other',        label: '📝 Other Concerns' },
];

const FeedbackForm = ({ onSubmitted }) => {
  const { isAuthenticated } = useAuth();
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) {
      setError('Please select a feedback category.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Message must be at least 10 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const data = await feedbackService.submitFeedback({
        category,
        message: message.trim(),
      });

      setSubmitted(true);
      setCategory('');
      setMessage('');

      if (onSubmitted) onSubmitted(data.feedback || data);
      setTimeout(() => setSubmitted(false), 3500);
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card-elevated rounded-3xl p-6 sm:p-8 space-y-5 transition-all duration-300"
    >
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <h2 className="font-display font-bold text-base text-gray-900 dark:text-white">
          Submit Dining Feedback
        </h2>
      </div>

      {/* Success banner */}
      {submitted && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <span className="text-xl">✅</span>
          <span>Your feedback has been sent to the Mess Committee. Thank you!</span>
        </div>
      )}

      {/* Category Dropdown */}
      <div className="space-y-1.5">
        <label htmlFor="feedback-category" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
          Feedback Category <span className="text-orange-500">*</span>
        </label>
        <div className="relative">
          <select
            id="feedback-category"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setError(''); }}
            className="glass-input w-full appearance-none text-sm rounded-xl px-4 py-3 pr-10 font-medium cursor-pointer"
          >
            <option value="" className="text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
              — Select a Category —
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                {c.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs">
            ▼
          </span>
        </div>
      </div>

      {/* Feedback Message */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label htmlFor="feedback-message" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
            Detailed Observations <span className="text-orange-500">*</span>
          </label>
          <span className={`text-[11px] font-semibold ${message.length > 450 ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
            {message.length} / 500
          </span>
        </div>
        <textarea
          id="feedback-message"
          rows={4}
          maxLength={500}
          value={message}
          onChange={(e) => { setMessage(e.target.value); setError(''); }}
          placeholder="Describe your dining experience, specific dish quality, cleanliness observations, or constructive recommendations..."
          className="glass-input w-full text-sm rounded-xl p-4 font-medium resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 leading-relaxed"
        />
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 px-6 rounded-xl bg-linear-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span>Sending Feedback...</span>
          </>
        ) : (
          <span>Submit Direct Feedback →</span>
        )}
      </button>
    </form>
  );
};

export { CATEGORIES };
export default FeedbackForm;