/**
 * Dish Emoji Mapping Helper
 * Replicates the exact emoji classification logic from the frontend.
 */

const EMOJI_MAP = [
  // Bread / Flatbreads
  { keywords: ['paratha', 'parata'], emoji: '🫓' },
  { keywords: ['roti', 'chapati', 'chapathi'], emoji: '🫓' },
  { keywords: ['puri', 'poori'], emoji: '🫓' },
  { keywords: ['naan', 'kulcha'], emoji: '🫓' },
  { keywords: ['bread'], emoji: '🍞' },

  // Rice
  { keywords: ['rice', 'biryani', 'pulao', 'fried rice'], emoji: '🍚' },
  { keywords: ['khichdi'], emoji: '🍲' },

  // Dal / Lentils
  { keywords: ['dal', 'dhal', 'lentil'], emoji: '🥣' },
  { keywords: ['sambhar', 'sambar'], emoji: '🥣' },

  // Vegetables
  { keywords: ['paneer'], emoji: '🧀' },
  { keywords: ['aloo', 'potato'], emoji: '🥔' },
  { keywords: ['palak', 'spinach'], emoji: '🥬' },
  { keywords: ['gobi', 'cauliflower', 'gobhi'], emoji: '🥦' },
  { keywords: ['baingan', 'brinjal', 'eggplant'], emoji: '🍆' },
  { keywords: ['matar', 'peas'], emoji: '🫛' },
  { keywords: ['mixed veg', 'sabzi', 'sabji'], emoji: '🥗' },
  { keywords: ['tomato'], emoji: '🍅' },
  { keywords: ['onion'], emoji: '🧅' },
  { keywords: ['salad'], emoji: '🥗' },

  // Non-veg
  { keywords: ['chicken'], emoji: '🍗' },
  { keywords: ['egg', 'omelette', 'boiled egg'], emoji: '🥚' },
  { keywords: ['fish', 'prawn', 'seafood'], emoji: '🐟' },
  { keywords: ['mutton', 'lamb', 'keema'], emoji: '🍖' },

  // Curries & Gravies
  { keywords: ['kadhi', 'kadai'], emoji: '🍛' },
  { keywords: ['curry', 'masala', 'gravy'], emoji: '🍛' },
  { keywords: ['kofta'], emoji: '🍛' },
  { keywords: ['chhole', 'chole', 'chana'], emoji: '🫘' },
  { keywords: ['rajma'], emoji: '🫘' },

  // Snacks & Fried
  { keywords: ['samosa'], emoji: '🥟' },
  { keywords: ['cutlet', 'tikki'], emoji: '🥙' },
  { keywords: ['pakoda', 'pakora', 'bhajja', 'bhaji'], emoji: '🧆' },
  { keywords: ['vada', 'wada'], emoji: '🧆' },
  { keywords: ['idli'], emoji: '🫓' },
  { keywords: ['dosa'], emoji: '🥞' },
  { keywords: ['upma'], emoji: '🥣' },
  { keywords: ['poha'], emoji: '🥣' },

  // Sweets & Desserts
  { keywords: ['halwa', 'ladoo', 'mithai'], emoji: '🍯' },
  { keywords: ['kheer', 'payasam'], emoji: '🍮' },
  { keywords: ['ice cream', 'kulfi'], emoji: '🍨' },
  { keywords: ['jalebi'], emoji: '🍩' },
  { keywords: ['rasgulla', 'gulab jamun'], emoji: '🍡' },

  // Dairy / Sides
  { keywords: ['curd', 'dahi', 'yogurt'], emoji: '🥛' },
  { keywords: ['raita'], emoji: '🥛' },
  { keywords: ['butter', 'ghee'], emoji: '🧈' },
  { keywords: ['pickle', 'achar'], emoji: '🫙' },
  { keywords: ['papad', 'pappad'], emoji: '🫓' },

  // Drinks
  { keywords: ['tea', 'chai'], emoji: '🍵' },
  { keywords: ['coffee'], emoji: '☕' },
  { keywords: ['milk'], emoji: '🥛' },
  { keywords: ['juice', 'lassi', 'sharbat'], emoji: '🥤' },
  { keywords: ['water', 'buttermilk'], emoji: '💧' },

  // Soups
  { keywords: ['soup'], emoji: '🍜' },
];

export const getDishEmoji = (dishName) => {
  if (!dishName) return '🍽️';
  const lower = dishName.toLowerCase();

  for (const { keywords, emoji } of EMOJI_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return emoji;
    }
  }

  return '🍽️';
};
