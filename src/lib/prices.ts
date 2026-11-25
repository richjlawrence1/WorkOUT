// Rough UK budget-supermarket prices per recipe ingredient use, in pounds.
// These are estimates for planning a weekly budget, not live shelf prices.
const PER_USE: [RegExp, number][] = [
  [/sirloin/i, 4.2], [/salmon/i, 2.6], [/cod/i, 2.2], [/prawn/i, 2.3], [/beef mince|jerky/i, 1.5],
  [/chicken/i, 1.5], [/turkey/i, 1.3], [/pork|bacon|chorizo/i, 1.0], [/tuna/i, 0.8], [/halloumi/i, 1.3],
  [/tofu/i, 1.1], [/whey|protein bar/i, 0.9], [/egg/i, 0.55], [/yoghurt|skyr|cottage|cream cheese/i, 0.7],
  [/cheddar|parmesan/i, 0.35], [/avocado/i, 0.6], [/berries|blueberr|raspberr/i, 0.8], [/nuts|almond|peanut/i, 0.35],
  [/milk/i, 0.25], [/rice|pasta|penne|linguine|noodle|oats|granola/i, 0.25], [/bread|toast|sourdough|bagel|wrap|pitta|rice cakes|crouton/i, 0.3],
  [/potato/i, 0.35], [/beans|chickpea|lentil|edamame|hummus/i, 0.45], [/broccoli|spinach|veg|pepper|tomato|salad|romaine|lettuce|rocket|carrot|cucumber|mushroom|onion|sweetcorn/i, 0.45],
  [/banana|apple|satsuma|lemon/i, 0.25], [/chocolate/i, 0.3],
];

export const ingredientCost = (item: string): number => PER_USE.find(([re]) => re.test(item))?.[1] ?? 0.15;

export const SUPERMARKETS: [string, string][] = [['', 'Any'], ['aldi', 'Aldi'], ['lidl', 'Lidl'], ['tesco', 'Tesco'], ['sainsbury-s', "Sainsbury's"], ['asda', 'Asda'], ['morrisons', 'Morrisons']];
