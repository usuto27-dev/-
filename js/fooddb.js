// A small built-in reference database of common foods for the "chat" quick
// entry: values are approximate standard nutrition-table figures per 100g
// (edible portion), not measurements of any specific product. servingGrams
// is the assumed weight when the user gives a count ("1杯", "2個") instead
// of an explicit gram amount. For composite dishes (e.g. curry rice) the
// kcal/protein/carb/fat fields represent ONE typical serving directly and
// servingGrams is fixed at 100 so the same 100g-based scaling math applies
// uniformly (an implementation detail, invisible to the user).
const FOOD_DB = [
  // 主食
  { name: '白米(ご飯)', aliases: ['ご飯', 'ごはん', '米'], kcal: 156, protein: 2.5, carb: 37.1, fat: 0.3, servingGrams: 150 },
  { name: '玄米ご飯', aliases: ['玄米'], kcal: 152, protein: 2.8, carb: 35.6, fat: 1.0, servingGrams: 150 },
  { name: '食パン', aliases: ['パン', 'トースト'], kcal: 264, protein: 9.3, carb: 46.7, fat: 4.4, servingGrams: 60 },
  { name: 'うどん', aliases: [], kcal: 105, protein: 2.6, carb: 21.6, fat: 0.4, servingGrams: 250 },
  { name: 'そば', aliases: [], kcal: 132, protein: 4.8, carb: 26.0, fat: 1.0, servingGrams: 250 },
  { name: 'スパゲッティ', aliases: ['パスタ'], kcal: 165, protein: 5.8, carb: 32.2, fat: 0.9, servingGrams: 250 },
  { name: 'オートミール', aliases: [], kcal: 380, protein: 13.7, carb: 69.1, fat: 5.7, servingGrams: 40 },
  { name: 'おにぎり(鮭)', aliases: ['鮭おにぎり'], kcal: 170, protein: 4.5, carb: 35.0, fat: 1.5, servingGrams: 100 },
  { name: '白米おにぎり', aliases: ['おにぎり'], kcal: 179, protein: 2.7, carb: 39.4, fat: 0.3, servingGrams: 100 },

  // 肉類
  { name: '鶏むね肉(皮なし)', aliases: ['鶏胸肉', '鶏むね', 'むね肉'], kcal: 116, protein: 23.3, carb: 0.1, fat: 1.9, servingGrams: 100 },
  { name: '鶏もも肉(皮なし)', aliases: ['鶏もも', 'もも肉'], kcal: 127, protein: 19.0, carb: 0.0, fat: 5.0, servingGrams: 100 },
  { name: '鶏ささみ', aliases: ['ささみ'], kcal: 105, protein: 23.9, carb: 0.1, fat: 0.8, servingGrams: 100 },
  { name: '豚ロース(赤身)', aliases: ['豚肉', '豚ロース'], kcal: 150, protein: 22.7, carb: 0.2, fat: 5.6, servingGrams: 100 },
  { name: '豚バラ肉', aliases: [], kcal: 386, protein: 14.4, carb: 0.1, fat: 35.4, servingGrams: 100 },
  { name: '牛もも肉(赤身)', aliases: ['牛肉', '赤身肉'], kcal: 165, protein: 21.3, carb: 0.5, fat: 8.6, servingGrams: 100 },
  { name: '牛肩ロース', aliases: [], kcal: 295, protein: 16.2, carb: 0.2, fat: 26.4, servingGrams: 100 },
  { name: '合いびき肉', aliases: ['ひき肉'], kcal: 224, protein: 17.9, carb: 0.4, fat: 16.5, servingGrams: 100 },
  { name: 'ウインナー', aliases: ['ソーセージ'], kcal: 321, protein: 11.5, carb: 3.3, fat: 30.6, servingGrams: 20 },
  { name: 'コンビニサラダチキン', aliases: ['サラダチキン'], kcal: 108, protein: 23.0, carb: 0.5, fat: 1.2, servingGrams: 100 },
  { name: 'から揚げ', aliases: ['唐揚げ'], kcal: 290, protein: 16.7, carb: 8.7, fat: 20.1, servingGrams: 100 },

  // 魚介類
  { name: '鮭', aliases: ['さけ'], kcal: 133, protein: 22.3, carb: 0.1, fat: 4.1, servingGrams: 80 },
  { name: 'まぐろ赤身', aliases: ['マグロ', '刺身'], kcal: 125, protein: 26.4, carb: 0.1, fat: 1.4, servingGrams: 80 },
  { name: 'さば', aliases: ['サバ'], kcal: 202, protein: 20.6, carb: 0.3, fat: 12.1, servingGrams: 80 },
  { name: 'えび', aliases: ['エビ'], kcal: 82, protein: 18.4, carb: 0.1, fat: 0.3, servingGrams: 60 },
  { name: 'ツナ缶(水煮)', aliases: ['ツナ'], kcal: 71, protein: 16.0, carb: 0.2, fat: 0.7, servingGrams: 70 },

  // 卵・乳製品
  { name: '卵', aliases: ['たまご', '玉子'], kcal: 151, protein: 12.3, carb: 0.3, fat: 10.3, servingGrams: 50 },
  { name: 'ゆで卵', aliases: ['茹で卵'], kcal: 151, protein: 12.9, carb: 0.3, fat: 10.0, servingGrams: 50 },
  { name: '牛乳', aliases: ['ミルク'], kcal: 67, protein: 3.3, carb: 4.8, fat: 3.8, servingGrams: 200 },
  { name: 'プレーンヨーグルト', aliases: ['ヨーグルト'], kcal: 62, protein: 3.6, carb: 4.9, fat: 3.0, servingGrams: 100 },
  { name: 'ギリシャヨーグルト', aliases: [], kcal: 71, protein: 8.3, carb: 3.8, fat: 3.5, servingGrams: 100 },
  { name: 'プロセスチーズ', aliases: ['チーズ'], kcal: 313, protein: 22.7, carb: 1.3, fat: 26.0, servingGrams: 20 },
  { name: 'カッテージチーズ', aliases: [], kcal: 99, protein: 13.3, carb: 1.9, fat: 4.5, servingGrams: 50 },

  // 大豆製品
  { name: '木綿豆腐', aliases: ['豆腐'], kcal: 73, protein: 6.7, carb: 1.6, fat: 4.5, servingGrams: 150 },
  { name: '絹ごし豆腐', aliases: [], kcal: 56, protein: 4.9, carb: 2.0, fat: 3.0, servingGrams: 150 },
  { name: '納豆', aliases: [], kcal: 190, protein: 16.5, carb: 12.1, fat: 10.0, servingGrams: 45 },
  { name: '豆乳(無調整)', aliases: ['豆乳'], kcal: 46, protein: 3.6, carb: 2.9, fat: 2.0, servingGrams: 200 },

  // 野菜・きのこ
  { name: 'キャベツ', aliases: [], kcal: 23, protein: 1.3, carb: 5.2, fat: 0.2, servingGrams: 100 },
  { name: 'レタス', aliases: [], kcal: 12, protein: 0.6, carb: 2.8, fat: 0.1, servingGrams: 50 },
  { name: 'ブロッコリー', aliases: [], kcal: 33, protein: 4.3, carb: 5.2, fat: 0.5, servingGrams: 80 },
  { name: 'トマト', aliases: [], kcal: 20, protein: 0.7, carb: 4.7, fat: 0.1, servingGrams: 150 },
  { name: 'きゅうり', aliases: [], kcal: 14, protein: 1.0, carb: 3.0, fat: 0.1, servingGrams: 100 },
  { name: 'ほうれん草', aliases: [], kcal: 20, protein: 2.2, carb: 3.1, fat: 0.4, servingGrams: 80 },
  { name: 'にんじん', aliases: [], kcal: 39, protein: 0.7, carb: 9.3, fat: 0.2, servingGrams: 50 },
  { name: '玉ねぎ', aliases: ['たまねぎ'], kcal: 37, protein: 1.0, carb: 8.8, fat: 0.1, servingGrams: 100 },
  { name: 'じゃがいも', aliases: [], kcal: 76, protein: 1.6, carb: 17.6, fat: 0.1, servingGrams: 100 },
  { name: 'さつまいも', aliases: [], kcal: 134, protein: 1.2, carb: 31.5, fat: 0.2, servingGrams: 100 },
  { name: 'かぼちゃ', aliases: [], kcal: 91, protein: 1.9, carb: 20.6, fat: 0.3, servingGrams: 100 },
  { name: 'もやし', aliases: [], kcal: 14, protein: 1.7, carb: 2.6, fat: 0.1, servingGrams: 100 },
  { name: 'なす', aliases: [], kcal: 22, protein: 1.1, carb: 5.1, fat: 0.1, servingGrams: 80 },
  { name: 'ピーマン', aliases: [], kcal: 22, protein: 0.9, carb: 5.1, fat: 0.2, servingGrams: 30 },
  { name: 'しめじ', aliases: [], kcal: 18, protein: 2.7, carb: 4.8, fat: 0.5, servingGrams: 50 },
  { name: 'えのき', aliases: [], kcal: 22, protein: 2.7, carb: 7.6, fat: 0.2, servingGrams: 50 },

  // 果物
  { name: 'バナナ', aliases: [], kcal: 93, protein: 1.1, carb: 22.5, fat: 0.2, servingGrams: 100 },
  { name: 'りんご', aliases: ['リンゴ'], kcal: 56, protein: 0.1, carb: 14.6, fat: 0.2, servingGrams: 200 },
  { name: 'みかん', aliases: [], kcal: 46, protein: 0.7, carb: 11.0, fat: 0.1, servingGrams: 100 },
  { name: 'キウイ', aliases: [], kcal: 51, protein: 1.0, carb: 11.0, fat: 0.2, servingGrams: 100 },

  // 調味料・油
  { name: 'サラダ油', aliases: ['油'], kcal: 921, protein: 0, carb: 0, fat: 100, servingGrams: 5 },
  { name: 'オリーブオイル', aliases: [], kcal: 921, protein: 0, carb: 0, fat: 100, servingGrams: 5 },
  { name: 'マヨネーズ', aliases: [], kcal: 703, protein: 1.4, carb: 3.6, fat: 75.3, servingGrams: 12 },
  { name: '醤油', aliases: ['しょうゆ'], kcal: 71, protein: 7.7, carb: 10.1, fat: 0, servingGrams: 15 },
  { name: '味噌', aliases: ['みそ'], kcal: 217, protein: 12.5, carb: 21.9, fat: 6.0, servingGrams: 18 },
  { name: 'ケチャップ', aliases: [], kcal: 119, protein: 1.6, carb: 27.6, fat: 0.2, servingGrams: 15 },

  // 汁物・その他
  { name: '味噌汁', aliases: [], kcal: 40, protein: 2.5, carb: 4.0, fat: 1.5, servingGrams: 180 },
  { name: 'プロテイン(ホエイ)', aliases: ['プロテイン'], kcal: 400, protein: 80, carb: 8, fat: 5, servingGrams: 30 },

  // 一皿料理(1食分の値を直接格納し、servingGramsは常に100の内部仕様)
  { name: 'カレーライス', aliases: ['カレー'], kcal: 760, protein: 15, carb: 110, fat: 25, servingGrams: 100 },
  { name: 'ラーメン', aliases: [], kcal: 500, protein: 20, carb: 65, fat: 18, servingGrams: 100 },
  { name: '牛丼(並盛)', aliases: ['牛丼'], kcal: 733, protein: 20, carb: 110, fat: 22, servingGrams: 100 },
  { name: 'チャーハン', aliases: ['炒飯'], kcal: 650, protein: 15, carb: 95, fat: 20, servingGrams: 100 },
];

function searchFoodDatabase(query, limit = 5) {
  const q = query.trim();
  if (!q) return [];
  const scored = FOOD_DB.map(item => {
    let score = 0;
    if (item.name === q) score = 100;
    else if (item.aliases.includes(q)) score = 90;
    else if (item.name.startsWith(q)) score = 80;
    else if (item.name.includes(q)) score = 60;
    else if (q.includes(item.name)) score = 50;
    else if (item.aliases.some(a => a.includes(q) || q.includes(a))) score = 40;
    return { item, score };
  }).filter(s => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.item);
}

// Splits free-form Japanese text like "鶏むね肉200g、ご飯1杯、卵2個" into
// individual food segments.
function splitFoodSegments(text) {
  return text
    .split(/[、,，\n]+|\s+と\s+|・/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Pulls a trailing quantity (grams, or a count like "2個") off a segment,
// returning the remaining food name plus either `grams` or `count`.
function extractFoodQuantity(segment) {
  let m = segment.match(/^(.*?)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:g|グラム)\s*$/);
  if (m) return { name: m[1].trim(), grams: parseFloat(m[2]) };

  m = segment.match(/^(.*?)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:個|枚|杯|本|切れ|パック|皿|缶|丁|尾)?\s*$/);
  if (m && m[1].trim()) return { name: m[1].trim(), count: parseFloat(m[2]) };

  return { name: segment.trim(), count: 1 };
}

// Parses a whole chat message into matched/unmatched food line items with
// estimated calories and PFC, ready for review before saving.
function parseFoodChatText(text) {
  return splitFoodSegments(text).map(seg => {
    const { name, grams, count } = extractFoodQuantity(seg);
    const [item] = searchFoodDatabase(name, 1);
    if (!item) return { query: seg, matched: null };
    const g = grams != null ? grams : (count != null ? count : 1) * item.servingGrams;
    const factor = g / 100;
    return {
      query: seg,
      matched: item,
      grams: Math.round(g),
      cal: Math.round(item.kcal * factor),
      protein: Math.round(item.protein * factor * 10) / 10,
      carb: Math.round(item.carb * factor * 10) / 10,
      fat: Math.round(item.fat * factor * 10) / 10,
    };
  });
}
