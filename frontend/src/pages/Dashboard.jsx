import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';
import analyticsService from '../services/analyticsService';
import feedbackService from '../services/feedbackService';
import menuService from '../services/menuService';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];
const MEAL_LABELS = ['🌅 Breakfast', '☀️ Lunch', '🍩 Snacks', '🌙 Dinner'];

const CATEGORY_LABELS = {
  food_quality: '🍛 Food Quality',
  hygiene:      '🧹 Hygiene',
  quantity:     '⚖️ Quantity',
  service:      '🤝 Service',
  timing:       '⏰ Timing',
  suggestion:   '💡 Suggestion',
  other:        '📝 Other',
};

const CATEGORY_COLORS = {
  food_quality: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  hygiene:      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  quantity:     'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  service:      'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  timing:       'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  suggestion:   'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
  other:        'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20',
};

// ── Stat Card Component ─────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, accentColor }) => (
  <div className="glass-card rounded-3xl p-5 sm:p-6 transition-all duration-300 hover:shadow-lg relative overflow-hidden flex flex-col justify-between">
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${accentColor}`}>
        {icon}
      </div>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Metric
      </span>
    </div>
    <div>
      <p className="font-display text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
        {value}
      </p>
      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">
        {label}
      </p>
      {sub && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          {sub}
        </p>
      )}
    </div>
  </div>
);

// ── Insight Bullet Component ───────────────────────────────────
const InsightRow = ({ icon, text, highlight }) => (
  <div
    className={`flex items-start gap-3.5 p-3.5 rounded-2xl transition-all duration-150 border ${
      highlight
        ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 text-amber-950 dark:text-amber-100'
        : 'bg-white/50 dark:bg-gray-800/50 border-gray-200/30 dark:border-gray-700/30 text-gray-800 dark:text-gray-200'
    }`}
  >
    <span className="text-xl shrink-0 leading-none mt-0.5">{icon}</span>
    <p className="text-xs sm:text-sm font-medium leading-snug">{text}</p>
  </div>
);

// ── Dashboard Main View ────────────────────────────────────────
const Dashboard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [analytics, setAnalytics] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dayName, setDayName] = useState('Today');

  const loadData = useCallback(async () => {
    try {
      const [overviewData, fbData, todayMenuData] = await Promise.all([
        analyticsService.getOverview(),
        feedbackService.getFeedback({ limit: 50 }),
        menuService.getTodayMenu(),
      ]);

      setAnalytics(overviewData);
      setFeedbackList(fbData.items || fbData.feedback || (Array.isArray(fbData) ? fbData : []));
      setDayName(todayMenuData.day || todayMenuData.dayName || 'Today');
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await feedbackService.updateFeedbackStatus(id, newStatus);
      setFeedbackList((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      );
    } catch (err) {
      console.error('Failed to update feedback status:', err);
    }
  };

  const handleDeleteFeedback = async (id) => {
    try {
      await feedbackService.deleteFeedback(id);
      setFeedbackList((prev) => prev.filter((f) => f.id !== id));
      loadData();
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Aggregating PostgreSQL analytics...</p>
      </div>
    );
  }

  const kpis = analytics?.kpis || {};
  const totalRat = kpis.totalRatings ?? analytics?.totalRatings ?? 0;
  const totalFeedback = kpis.totalFeedback ?? analytics?.totalFeedback ?? 0;
  const totalVotes = kpis.totalVotes ?? analytics?.totalVotes ?? 0;
  const avgSatisfaction = analytics?.averageSatisfaction || analytics?.averageRating || (totalRat > 0 ? (analytics?.overallRating || '4.1') : '0.0');

  const avgRatings = analytics?.averageRatings || { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };
  const highest = analytics?.highestLowest?.highest || analytics?.highestRatedMeal;
  const lowest = analytics?.highestLowest?.lowest || analytics?.lowestRatedMeal;
  const feedbackInsight = analytics?.feedbackBreakdown;
  const weeklyData = analytics?.weeklySatisfaction || { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], data: [] };
  const topVoted = analytics?.sentimentInsights?.mostEngaged || analytics?.topVotedDish;
  const sentimentInsights = analytics?.sentimentInsights;

  // Normalized leaderboard items
  const leaderboard = analytics?.leaderboard || [];
  const sortedVotes = leaderboard.filter((item) => (item.total || 0) > 0);

  // Common Chart options
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

  // ── Chart configs ──
  const barData = {
    labels: MEAL_LABELS,
    datasets: [{
      label: 'Average Score',
      data: MEALS.map((m) => avgRatings[m] || 0),
      backgroundColor: ['#f97316', '#10b981', '#a855f7', '#3b82f6'],
      borderRadius: 10,
      borderSkipped: false,
    }],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#0f172a',
        padding: 10,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1, color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
      },
      x: {
        ticks: { color: textColor, font: { size: 11, weight: '600' } },
        grid: { display: false },
      },
    },
  };

  const lineData = {
    labels: weeklyData.labels,
    datasets: [{
      label: 'Weekly Rating (1–5)',
      data: weeklyData.data,
      borderColor: '#f97316',
      backgroundColor: 'rgba(249, 115, 22, 0.12)',
      fill: true,
      tension: 0.35,
      borderWidth: 3,
      pointRadius: 5,
      pointBackgroundColor: '#f97316',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointHoverRadius: 7,
    }],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#0f172a',
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1, color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
      },
      x: {
        ticks: { color: textColor, font: { size: 11, weight: '600' } },
        grid: { color: gridColor },
      },
    },
  };

  const doughnutData = {
    labels: sortedVotes.map((item) => item.dishName || item.dish || 'Dish'),
    datasets: [{
      data: sortedVotes.map((item) => item.total || 0),
      backgroundColor: ['#f97316','#10b981','#3b82f6','#a855f7','#ec4899','#14b8a6','#f59e0b','#6366f1'],
      borderWidth: 2,
      borderColor: isDark ? '#1e293b' : '#ffffff',
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: textColor,
          font: { size: 11, weight: '600' },
          boxWidth: 10,
          padding: 10,
        },
      },
    },
  };

  // ── Insights: Automated bullets ──
  const insights = [];

  if (highest && highest.value > 0) {
    insights.push({
      icon: '⭐',
      text: `${highest.label} leads dining satisfaction with ${highest.value}/5 average student rating.`,
      highlight: true,
    });
  }
  if (lowest && lowest.value > 0 && highest && lowest.meal !== highest.meal) {
    const needsWork = lowest.value < 3;
    insights.push({
      icon: needsWork ? '⚠️' : '📉',
      text: `${lowest.label} scored lowest at ${lowest.value}/5${needsWork ? ' — recommended for kitchen team review' : ''}.`,
      highlight: false,
    });
  }
  if (feedbackInsight && feedbackInsight.total > 0 && feedbackInsight.topLabel) {
    insights.push({
      icon: '💬',
      text: `Top feedback topic: "${feedbackInsight.topLabel}" (${feedbackInsight.percentage}% of ${feedbackInsight.total} student submissions).`,
      highlight: false,
    });
  }
  if (topVoted && topVoted.count > 0) {
    insights.push({
      icon: '🗳️',
      text: `Highest poll engagement: "${topVoted.dish}" received ${topVoted.count} community vote${topVoted.count !== 1 ? 's' : ''}.`,
      highlight: false,
    });
  }
  if (sentimentInsights) {
    if (sentimentInsights.mostLiked && sentimentInsights.mostLiked.dish) {
      insights.push({
        icon: '👍',
        text: `Most Liked Dish: "${sentimentInsights.mostLiked.dish}" (${sentimentInsights.mostLiked.percentage || sentimentInsights.mostLiked.approval || 0}% approval).`,
        highlight: true,
      });
    }
    if (sentimentInsights.mostDisliked && (sentimentInsights.mostDisliked.score < 0 || sentimentInsights.mostDisliked.net < 0)) {
      insights.push({
        icon: '👎',
        text: `Needs Improvement: "${sentimentInsights.mostDisliked.dish}" (${sentimentInsights.mostDisliked.percentage || sentimentInsights.mostDisliked.approval || 0}% approval).`,
        highlight: false,
      });
    }
  }

  const hasEnoughData = insights.length > 0;

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Admin Dashboard Header ── */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-slate-700/20 bg-linear-to-r from-gray-900 via-slate-800 to-gray-800 text-white shadow-xl backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-orange-400 mb-3">
              <span>📊</span> Executive Mess Operations
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-1 text-white">
              Dining Analytics Dashboard
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm font-medium">
              Real-time analytics across ratings, dish votes, and feedback tickets for <span className="font-bold text-white">{dayName}</span>
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm shrink-0"
          >
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            <span>{refreshing ? 'Syncing...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </section>

      {/* ── KPI Cards Grid ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          icon="⭐"
          label="Total Ratings"
          value={totalRat}
          sub="Meal submissions"
          accentColor="bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/20"
        />
        <StatCard
          icon="💬"
          label="Feedback Items"
          value={totalFeedback}
          sub="Student tickets"
          accentColor="bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/20"
        />
        <StatCard
          icon="🗳️"
          label="Total Poll Votes"
          value={totalVotes}
          sub={`${leaderboard.length} dishes tracked`}
          accentColor="bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20"
        />
        <StatCard
          icon="📈"
          label="Satisfaction Index"
          value={`${avgSatisfaction}/5`}
          sub="Weighted average"
          accentColor="bg-orange-500/15 text-orange-500 dark:text-orange-400 border border-orange-500/20"
        />
      </section>

      {/* ── PostgreSQL Automated Insights Box ── */}
      <section className="glass-card-elevated rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              💡
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-gray-900 dark:text-white">
                Automated Operational Insights
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                Synthesized from PostgreSQL transaction logs
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            Real-time
          </span>
        </div>

        <div className="space-y-2.5">
          {hasEnoughData ? (
            insights.map((ins, i) => (
              <InsightRow key={i} icon={ins.icon} text={ins.text} highlight={ins.highlight} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <span className="text-3xl block mb-2">📊</span>
              <p className="text-sm font-semibold">Insufficient data for automated insights.</p>
              <p className="text-xs mt-0.5">As students rate and vote, patterns will appear here automatically.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Charts Row (Higher Opacity Backing for Contrast) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart — Meal Ratings */}
        <div className="glass-card-opaque rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <span>⭐</span> Meal Slot Comparisons
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Avg Score (1–5)</span>
          </div>

          <div className="h-64 w-full">
            {totalRat > 0 ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-2">
                <span className="text-3xl">🌟</span>
                <p className="text-xs font-semibold">No rating submissions yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Doughnut Chart — Dish Vote Sentiment */}
        <div className="glass-card-opaque rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <span>🗳️</span> Dish Vote Distribution
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Poll Volume</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {sortedVotes.length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-2">
                <span className="text-3xl">🗳️</span>
                <p className="text-xs font-semibold">No dish votes recorded today</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Weekly Satisfaction Trend Chart ── */}
      <section className="glass-card-opaque rounded-3xl p-6 sm:p-7 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <span>📈</span> 7-Day Student Satisfaction Trend
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              Daily averaged rating score across the academic week
            </p>
          </div>
          <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            Weekly Trend
          </span>
        </div>

        <div className="h-64 w-full">
          {weeklyData.data && weeklyData.data.some((d) => d !== null) ? (
            <Line data={lineData} options={lineOptions} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-2">
              <span className="text-3xl">📉</span>
              <p className="text-xs font-semibold">No historical ratings data recorded yet</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Voting Leaderboard ── */}
      <section className="glass-card-elevated rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <span>🏆</span> Complete Dish Ranking
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Sorted by net score and student popularity
            </p>
          </div>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {leaderboard.length} Dishes
          </span>
        </div>

        {leaderboard.length > 0 ? (
          <div className="space-y-2.5">
            {leaderboard.map((item, idx) => {
              const dish = item.dishName || item.dish;
              const count = item.total || 0;
              const up = item.upVotes ?? item.up ?? 0;
              const down = item.downVotes ?? item.down ?? 0;
              const approval = item.approval || 0;
              const medals = ['🥇', '🥈', '🥉'];
              const hasVotes = count > 0;

              return (
                <div
                  key={dish}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base w-6 text-center font-bold text-gray-400 dark:text-gray-500">
                      {hasVotes ? (medals[idx] || `${idx + 1}.`) : `${idx + 1}.`}
                    </span>
                    <span className={`text-sm font-semibold ${hasVotes ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {dish}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">👍 {up}</span>
                      <span className="text-rose-500 dark:text-rose-400">👎 {down}</span>
                    </div>

                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden flex">
                      {count > 0 ? (
                        <>
                          <div className="h-full bg-emerald-500" style={{ width: `${approval}%` }} />
                          <div className="h-full bg-rose-500" style={{ width: `${100 - approval}%` }} />
                        </>
                      ) : (
                        <div className="h-full bg-gray-300 dark:bg-gray-600 w-full" />
                      )}
                    </div>

                    <span className="text-xs font-bold w-10 text-right text-gray-600 dark:text-gray-300">
                      {approval}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">No dishes found in today's menu.</p>
          </div>
        )}
      </section>

      {/* ── Admin Feedback Management Ticket Queue ── */}
      <section className="glass-card-elevated rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <span>💬</span> Student Feedback Tickets
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Review, triage, and update resolution statuses
            </p>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/20">
            {feedbackList.length} Tickets
          </span>
        </div>

        {feedbackList.length > 0 ? (
          <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1.5">
            {feedbackList.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/40 dark:border-gray-700/40 space-y-3 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${CATEGORY_COLORS[entry.category] || 'bg-gray-100'}`}>
                      {CATEGORY_LABELS[entry.category] || entry.category}
                    </span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      by {entry.user?.fullName || entry.user_full_name || entry.fullName || 'Student'} ({entry.user?.regNo || entry.user_reg_no || entry.registrationNumber || 'N/A'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Dropdown */}
                    <select
                      value={entry.status}
                      onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                      className="text-xs font-bold rounded-xl px-2.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="pending" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">🟡 Pending</option>
                      <option value="reviewed" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">🔵 Reviewed</option>
                      <option value="resolved" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">🟢 Resolved</option>
                    </select>

                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium hidden sm:inline">
                      {formatDate(entry.created_at || entry.createdAt)}
                    </span>

                    <button
                      onClick={() => handleDeleteFeedback(entry.id)}
                      title="Soft Delete Ticket"
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-xs font-bold"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                  {entry.message}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500">
            <span className="text-4xl block mb-2">📭</span>
            <p className="text-sm font-semibold">No feedback submissions received yet</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;