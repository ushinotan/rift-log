import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';

/** 自分視点の試合サマリ（1試合1行） */
export const matches = sqliteTable('matches', {
  matchId: text('match_id').primaryKey(),
  gameStartMs: integer('game_start_ms').notNull(),
  /** 開始日時（JST, "YYYY-MM-DD HH:mm"） */
  startJst: text('start_jst').notNull(),
  durationSec: integer('duration_sec').notNull(),
  /** 勝利 / 敗北 / リメイク */
  result: text('result').notNull(),
  win: integer('win', { mode: 'boolean' }).notNull(),
  remake: integer('remake', { mode: 'boolean' }).notNull().default(false),
  myTeamId: integer('my_team_id').notNull(),
  myParticipantId: integer('my_participant_id').notNull(),
  myChampionId: integer('my_champion_id').notNull(),
  myChampion: text('my_champion').notNull(),
  /** TOP / JUNGLE / MIDDLE / BOTTOM / UTILITY */
  myRole: text('my_role').notNull(),
  opponentParticipantId: integer('opponent_participant_id'),
  opponentChampionId: integer('opponent_champion_id'),
  opponentChampion: text('opponent_champion'),
  /** 例: "16.22" */
  patch: text('patch').notNull(),
  gameVersion: text('game_version').notNull(),
  /** 名前解決に使った Data Dragon のバージョン */
  ddragonVersion: text('ddragon_version').notNull(),
  importedAt: text('imported_at').notNull(),
});

export const participants = sqliteTable(
  'participants',
  {
    matchId: text('match_id').notNull().references(() => matches.matchId, { onDelete: 'cascade' }),
    participantId: integer('participant_id').notNull(),
    puuid: text('puuid').notNull(),
    isMe: integer('is_me', { mode: 'boolean' }).notNull(),
    teamId: integer('team_id').notNull(),
    win: integer('win', { mode: 'boolean' }).notNull(),
    role: text('role').notNull(),
    championId: integer('champion_id').notNull(),
    /** Data Dragon の内部ID（画像用, 例: "Sion"） */
    championKey: text('champion_key').notNull(),
    champion: text('champion').notNull(),
    playerName: text('player_name').notNull(),
    kills: integer('kills').notNull(),
    deaths: integer('deaths').notNull(),
    assists: integer('assists').notNull(),
    /** (K+A) / チームキル（0〜1） */
    killParticipation: real('kill_participation').notNull(),
    damageDealt: integer('damage_dealt').notNull(),
    damageTaken: integer('damage_taken').notNull(),
    gold: integer('gold').notNull(),
    cs: integer('cs').notNull(),
    level: integer('level').notNull(),
    visionScore: integer('vision_score').notNull(),
    wardsPlaced: integer('wards_placed').notNull(),
    wardsKilled: integer('wards_killed').notNull(),
    controlWardsBought: integer('control_wards_bought').notNull(),
    /** JSON: { primaryStyle, subStyle, keystone, primary: [...], secondary: [...] }（{id,name}） */
    runes: text('runes', { mode: 'json' }).notNull(),
    /** JSON: [{id,name,key}] */
    summonerSpells: text('summoner_spells', { mode: 'json' }).notNull(),
    /** JSON: [{slot,id,name}]（item0〜item6, 空き枠は除外） */
    items: text('items', { mode: 'json' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.participantId] })],
);

/** チーム単位のオブジェクト集計（match-v5 teams[].objectives） */
export const teamStats = sqliteTable(
  'team_stats',
  {
    matchId: text('match_id').notNull().references(() => matches.matchId, { onDelete: 'cascade' }),
    teamId: integer('team_id').notNull(),
    isMyTeam: integer('is_my_team', { mode: 'boolean' }).notNull(),
    win: integer('win', { mode: 'boolean' }).notNull(),
    kills: integer('kills').notNull(),
    towers: integer('towers').notNull(),
    inhibitors: integer('inhibitors').notNull(),
    dragons: integer('dragons').notNull(),
    barons: integer('barons').notNull(),
    heralds: integer('heralds').notNull(),
    voidGrubs: integer('void_grubs').notNull(),
    atakhans: integer('atakhans').notNull(),
    firstBlood: integer('first_blood', { mode: 'boolean' }).notNull(),
    firstTower: integer('first_tower', { mode: 'boolean' }).notNull(),
    firstDragon: integer('first_dragon', { mode: 'boolean' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.teamId] })],
);

export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    matchId: text('match_id').notNull().references(() => matches.matchId, { onDelete: 'cascade' }),
    timeSec: integer('time_sec').notNull(),
    /** キル / タワー / インヒビター / ドラゴン / バロン / ヘラルド / ヴォイドグラブ / アタカン */
    type: text('type').notNull(),
    /** 例: "インファーナルドラゴン", "ミッド アウタータワー" */
    detail: text('detail'),
    /** その出来事を「取った」側のチーム（100 / 200） */
    teamId: integer('team_id').notNull(),
    isAlly: integer('is_ally', { mode: 'boolean' }).notNull(),
    killer: text('killer'),
    victim: text('victim'),
    /** JSON: string[]（アシストしたチャンピオン名） */
    assists: text('assists', { mode: 'json' }),
    involvesMe: integer('involves_me', { mode: 'boolean' }).notNull(),
    /** 自分の関わり方: キル / デス / アシスト / ラストヒット / null */
    myInvolvement: text('my_involvement'),
    x: integer('x'),
    y: integer('y'),
  },
  (t) => [index('events_match_idx').on(t.matchId, t.timeSec)],
);

/** 自分のアイテム購入・売却・取り消し */
export const itemEvents = sqliteTable(
  'item_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    matchId: text('match_id').notNull().references(() => matches.matchId, { onDelete: 'cascade' }),
    timeSec: integer('time_sec').notNull(),
    /** 購入 / 売却 / 取り消し */
    action: text('action').notNull(),
    itemId: integer('item_id').notNull(),
    item: text('item').notNull(),
  },
  (t) => [index('item_events_match_idx').on(t.matchId, t.timeSec)],
);

export const skillOrder = sqliteTable(
  'skill_order',
  {
    matchId: text('match_id').notNull().references(() => matches.matchId, { onDelete: 'cascade' }),
    /** 何回目のスキル上げか（≒チャンピオンレベル） */
    level: integer('level').notNull(),
    timeSec: integer('time_sec').notNull(),
    /** Q / W / E / R */
    slot: text('slot').notNull(),
    /** Data Dragon ja_JP のスキル名 */
    skill: text('skill').notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.level] })],
);

/** 1分ごとのスナップショット（10人分） */
export const frames = sqliteTable(
  'frames',
  {
    matchId: text('match_id').notNull().references(() => matches.matchId, { onDelete: 'cascade' }),
    minute: integer('minute').notNull(),
    participantId: integer('participant_id').notNull(),
    gold: integer('gold').notNull(),
    cs: integer('cs').notNull(),
    xp: integer('xp').notNull(),
    level: integer('level').notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.minute, t.participantId] })],
);

export const reviews = sqliteTable(
  'reviews',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    matchId: text('match_id').notNull().references(() => matches.matchId, { onDelete: 'cascade' }),
    /** 良かった点 / 改善点 / 次の目標 */
    category: text('category').notNull(),
    position: integer('position').notNull(),
    item: text('item').notNull(),
    detail: text('detail').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('reviews_match_idx').on(t.matchId)],
);

/** API の生レスポンス（再計算用。ネットワークに再アクセスせず作り直せるように保持） */
export const rawMatches = sqliteTable('raw_matches', {
  matchId: text('match_id').primaryKey(),
  match: text('match', { mode: 'json' }).notNull(),
  timeline: text('timeline', { mode: 'json' }),
  fetchedAt: text('fetched_at').notNull(),
});

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
