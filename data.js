const MENU_DATA = {
  categories: [
    { id: "all", name: "すべて", emoji: "✨" },
    { id: "system", name: "システム", emoji: "🎀" },
    { id: "shot", name: "ショット", emoji: "🥃" },
    { id: "drink", name: "ドリンク", emoji: "🥤" },
    { id: "bottle", name: "ボトル", emoji: "🍾" },
    { id: "champagne", name: "シャンパン", emoji: "🥂" },
    { id: "original", name: "オリジナル", emoji: "💎" },
    { id: "wine", name: "ワイン", emoji: "🍷" },
    { id: "food", name: "フード", emoji: "🍫" },
  ],
  items: [
    // ===== システム =====
    { id: 1,  name: "60分セット (21-23時)", price: 3000, category: "system", emoji: "🕘" },
    { id: 2,  name: "60分セット (23時-Last)", price: 3500, category: "system", emoji: "🌙" },
    { id: 3,  name: "シングルチャージ", price: 1000, category: "system", emoji: "👤" },
    { id: 4,  name: "30分延長", price: 2000, category: "system", emoji: "⏱️" },
    { id: 5,  name: "60分延長", price: 3500, category: "system", emoji: "⏱️" },
    { id: 6,  name: "推しドリンク", price: 2000, category: "system", emoji: "💖" },
    { id: 7,  name: "場内推しドリンク", price: 1000, category: "system", emoji: "💗" },
    { id: 8,  name: "キャストドリンク", price: 1000, category: "system", emoji: "🍹" },

    // ===== ショット =====
    { id: 10, name: "イエガー", price: 1500, category: "shot", emoji: "🥃" },
    { id: 11, name: "クライナー", price: 1500, category: "shot", emoji: "🥃" },
    { id: 12, name: "テキーラ", price: 1500, category: "shot", emoji: "🥃" },
    { id: 13, name: "コカボム", price: 2000, category: "shot", emoji: "💣" },
    { id: 14, name: "テキーラ観覧車", price: 20000, category: "shot", emoji: "🎡" },
    { id: 15, name: "クライナーセット", price: 30000, category: "shot", emoji: "🎉" },

    // ===== ドリンク (+1,000円メニュー & ソフトドリンク) =====
    { id: 20, name: "瓶コーラ", price: 1000, category: "drink", emoji: "🥤" },
    { id: 21, name: "ビール", price: 1000, category: "drink", emoji: "🍺" },
    { id: 22, name: "炭酸水", price: 1000, category: "drink", emoji: "💧" },
    { id: 23, name: "午後の無糖", price: 1000, category: "drink", emoji: "🍵" },
    { id: 24, name: "オレンジジュース", price: 1000, category: "drink", emoji: "🍊" },
    { id: 25, name: "りんごジュース", price: 1000, category: "drink", emoji: "🍎" },
    { id: 26, name: "レモンサワー", price: 1000, category: "drink", emoji: "🍋" },

    // ===== ボトル: 焼酎 =====
    { id: 30, name: "チャミスル", price: 5000, category: "bottle", emoji: "🍶" },
    { id: 31, name: "鏡月", price: 5000, category: "bottle", emoji: "🍶" },
    { id: 32, name: "キンミヤ", price: 5000, category: "bottle", emoji: "🍶" },
    { id: 33, name: "だいやめ", price: 6000, category: "bottle", emoji: "🍶" },
    { id: 34, name: "吉四六", price: 9000, category: "bottle", emoji: "🍶" },

    // ===== ボトル: ウイスキー =====
    { id: 35, name: "角", price: 7000, category: "bottle", emoji: "🥃" },
    { id: 36, name: "ジャックダニエル", price: 13000, category: "bottle", emoji: "🥃" },
    { id: 37, name: "マッカラン12年", price: 55000, category: "bottle", emoji: "🥃" },
    { id: 38, name: "山崎12年", price: 66000, category: "bottle", emoji: "🥃" },

    // ===== ボトル: 日本酒 =====
    { id: 40, name: "澪", price: 2000, category: "bottle", emoji: "🍶" },
    { id: 41, name: "すず音", price: 2500, category: "bottle", emoji: "🍶" },

    // ===== ボトル: ビール =====
    { id: 42, name: "コロナ", price: 2000, category: "bottle", emoji: "🍺" },
    { id: 43, name: "ハイネケン", price: 2000, category: "bottle", emoji: "🍺" },
    { id: 44, name: "バドワイザー", price: 2000, category: "bottle", emoji: "🍺" },

    // ===== シャンパン: Moët & Chandon =====
    { id: 50, name: "モエ ブリュット", price: 25000, category: "champagne", emoji: "🥂" },
    { id: 51, name: "モエ ロゼ", price: 28000, category: "champagne", emoji: "🌹" },
    { id: 52, name: "モエ アイスアンペリアル", price: 33000, category: "champagne", emoji: "❄️" },
    { id: 53, name: "モエ N.I.R", price: 35000, category: "champagne", emoji: "🖤" },

    // ===== シャンパン: Soumei =====
    { id: 54, name: "ソウメイ ブリュット ゴールド", price: 80000, category: "champagne", emoji: "👑" },

    // ===== シャンパン: Café de Paris =====
    { id: 55, name: "カフェ ド パリ ルージュセンセーション", price: 10000, category: "champagne", emoji: "🫧" },

    // ===== シャンパン: MAVAM =====
    { id: 56, name: "マバム テンテーション", price: 18000, category: "champagne", emoji: "🫧" },

    // ===== シャンパン: Veuve Clicquot =====
    { id: 57, name: "ヴーヴ・クリコ イエローラベル", price: 28000, category: "champagne", emoji: "🏷️" },
    { id: 58, name: "ヴーヴ・クリコ ホワイトラベル", price: 28000, category: "champagne", emoji: "🤍" },

    // ===== シャンパン: Dom Pérignon =====
    { id: 60, name: "ドン・ペリニヨン", price: 100000, category: "champagne", emoji: "👑" },

    // ===== シャンパン: Armand de Brignac =====
    { id: 61, name: "アルマン・ド・ブリニャック ゴールド", price: 150000, category: "champagne", emoji: "🏆" },
    { id: 62, name: "アルマン・ド・ブリニャック ロゼ", price: 320000, category: "champagne", emoji: "🌸" },

    // ===== シャンパン: Angel =====
    { id: 63, name: "エンジェル ブリュット ブラック", price: 150000, category: "champagne", emoji: "🖤" },
    { id: 64, name: "エンジェル ドゥミセック ブルー", price: 300000, category: "champagne", emoji: "💙" },
    { id: 65, name: "エンジェル ドゥミセック ロゼ", price: 350000, category: "champagne", emoji: "💗" },

    // ===== シャンパン: Perrier-Jouët =====
    { id: 66, name: "ペリエ・ジュエ グランブリュット", price: 30000, category: "champagne", emoji: "🌿" },
    { id: 67, name: "ペリエ・ジュエ ブラン ド ブラン", price: 50000, category: "champagne", emoji: "🤍" },
    { id: 68, name: "ペリエ・ジュエ ベルエポック", price: 80000, category: "champagne", emoji: "🌸" },
    { id: 69, name: "ペリエ・ジュエ ベルエポックロゼ", price: 200000, category: "champagne", emoji: "🌹" },
    { id: 70, name: "ペリエ・ジュエ ベルエポックブランドブラン", price: 350000, category: "champagne", emoji: "✨" },

    // ===== オリジナルシャンパン =====
    { id: 80, name: "GIFTオリジナル ホワイト", price: 15000, category: "original", emoji: "🤍" },
    { id: 81, name: "GIFTオリジナル ロゼ", price: 30000, category: "original", emoji: "🩷" },
    { id: 82, name: "GIFTオリジナル ゴールド", price: 55000, category: "original", emoji: "💛" },
    { id: 83, name: "GIFTオリジナル ゴールド (大)", price: 100000, category: "original", emoji: "👑" },
    { id: 84, name: "エンジェル 3本セット", price: 150000, category: "original", emoji: "👼" },

    // ===== ワイン =====
    { id: 90, name: "紫鈴 rindo (赤)", price: 30000, category: "wine", emoji: "🍷" },
    { id: 91, name: "夢久 muku (白)", price: 26000, category: "wine", emoji: "🥂" },

    // ===== フード =====
    { id: 100, name: "お菓子盛り合わせ", price: 1000, category: "food", emoji: "🍬" },
    { id: 101, name: "乾物盛り", price: 1500, category: "food", emoji: "🥜" },
    { id: 102, name: "チョコレート", price: 500, category: "food", emoji: "🍫" },
  ],
};
