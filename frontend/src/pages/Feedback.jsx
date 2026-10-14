import React, { useState, useEffect, useCallback } from 'react';
import FeedbackForm, { CATEGORIES } from '../components/FeedbackForm';
import { useAuth } from '../context/AuthContext';
import feedbackService from '../services/feedbackService';
import AuthModal from '../components/AuthModal';

const CATEGORY_COLORS = {
  food_quality: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  hygiene:      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  quantity:     'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  service:      'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  timing:       'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  suggestion:   'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
  other:        'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20',
};

const Feedback = () => {
  const { isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadFeedback = useCallback(async () => {
    if (!isAuthenticated) {
      setEntries([]);
      return;
    }

    try {
      setLoading(true);
      const data = await feedbackService.getFeedback();
      const list = data.items || data.feedback || (Array.isArray(data) ? data : []);
      setEntries(list);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleDelete = async (id) => {
    try {
      await feedbackService.deleteFeedback(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  const getCategoryLabel = (value) =>
    CATEGORIES.find((c) => c.value === value)?.label || value;

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Page Header ── */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-blue-500/20 bg-linear-to-r from-blue-600/90 via-indigo-600/90 to-violet-600/85 text-white shadow-xl shadow-blue-500/10 backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/25 text-xs font-bold text-blue-100 mb-3">
            <span>💬</span> Direct Voice to Mess Administration
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
            Feedback &amp; Suggestions
          </h1>
          <p className="text-blue-100 text-sm font-medium">
            Help improve mess hygiene, taste, and dining operations ·{' '}
            <span className="font-bold text-white">{entries.length} contributions submitted</span>
          </p>
        </div>
      </section>

      {/* ── Unauthenticated Welcome Prompt ── */}
      {!isAuthenticated && (
        <div className="glass-card-elevated rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner">
            💬
          </div>
          <h2 className="font-display text-2xl font-black text-gray-900 dark:text-white">
            Sign In to Share Feedback
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-md mx-auto">
            MessPulse links feedback to verified student registration numbers to ensure genuine suggestions reach the mess warden and student council.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-6 py-3 rounded-full bg-linear-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>🔐</span>
              <span>Sign In with Roll No. or Email</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Feedback Submission Form ── */}
      {isAuthenticated && (
        <FeedbackForm onSubmitted={loadFeedback} />
      )}

      {/* ── Submitted Feedback History ── */}
      {isAuthenticated && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
                Your Feedback History ({entries.length})
              </h2>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Tracked status updates
            </span>
          </div>

          {loading ? (
            <div className="glass-card rounded-3xl py-12 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-3" />
              <p className="text-sm">Loading your submissions...</p>
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-3.5">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="glass-card rounded-2xl p-5 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
                >
                  {/* Top row */}
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span
                      className={`text-xs font-bold px-3 py-0.5 rounded-full border ${
                        CATEGORY_COLORS[entry.category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {getCategoryLabel(entry.category)}
                    </span>

                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        entry.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : entry.status === 'reviewed'
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {entry.status === 'resolved' ? '🟢 Resolved' : entry.status === 'reviewed' ? '🔵 Under Review' : '🟡 Pending'}
                    </span>

                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-medium">
                      {formatDate(entry.created_at || entry.createdAt)}
                    </span>

                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="Delete entry"
                      className="text-gray-400 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 opacity-70 group-hover:opacity-100 cursor-pointer ml-1"
                    >
                      ✕ Delete
                    </button>
                  </div>

                  {/* Message content */}
                  <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-3xl py-12 text-center text-gray-500 dark:text-gray-400">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">No feedback submitted yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Use the form above to share your thoughts.</p>
            </div>
          )}
        </section>
      )}

      {/* Auth Modal fallback */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default Feedback;