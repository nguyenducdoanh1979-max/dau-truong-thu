"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

type Rarity = "Trắng" | "Xanh lá" | "Xanh dương" | "Vàng" | "Đỏ" | "Tím" | "Cam";
type Slot = "Vũ khí" | "Giáp" | "Mũ" | "Giày";
type Element = "Hỏa" | "Thủy" | "Băng" | "Phong" | "Thổ";
type Difficulty = "Dễ" | "Trung bình" | "Khó";
type AssignmentStatus = "draft" | "published" | "closed";

type Item = {
  id: number;
  slot: Slot;
  rarity: Rarity;
  healPercent: number;
  ignoreCounterPercent: number;
  damagePercent: number;
  strengthenLevel?: number;
};

type EquippedItems = Partial<Record<Slot, Item>>;

type Beast = {
  species: string;
  avatar: string;
  element: Element;
  quality: number;
  level: number;
  exp: number;
  baseAtk: number;
  baseDef: number;
  baseHp: number;
  baseSpd: number;
};

type Student = {
  id: number;
  name: string;
  username: string;
  password: string;
  className: string;
  guildId: number;
  weeklyPoints: number;
  totalPoints: number;
  prestigePoints: number;
  hasBeast: boolean;
  beast?: Beast | null;
  inventory: Item[];
  equipped: EquippedItems;
  equipmentStrength?: Partial<Record<Slot, number>>;
  avatarUrl?: string;
  notice?: string;
  overlordStudentId?: number | null;
};

type Guild = {
  id: number;
  name: string;
  exp: number;
  level: number;
  buffPercent: number;
  reachedLevel8At?: string | null;
  reachedLevel12At?: string | null;
  leaderStudentId?: number | null;
  viceLeaderStudentIds: number[];
  mergedIntoGuildId?: number | null;
};

type EventLog = {
  id: number;
  createdAt: string;
  type: string;
  message: string;
};

type GuildBattleSnapshot = {
  guildId: number;
  guildName: string;
  totalPower: number;
  memberCount: number;
  strongestName: string;
  strongestPower: number;
  weakestName: string;
  weakestPower: number;
};

type ConquestBattle = {
  id: number;
  attackerGuildId: number;
  defenderGuildId: number;
  attackerSnapshot: GuildBattleSnapshot;
  defenderSnapshot: GuildBattleSnapshot;
  announcedAt: string;
  executeAt: string;
  resolvedAt?: string;
  winnerGuildId?: number;
  loserGuildId?: number;
  attackerWins?: number;
  defenderWins?: number;
  resultMessage?: string;
};

type DuelMatch = {
  id: number;
  leftStudentId: number;
  rightStudentId: number;
  leftPower: number;
  rightPower: number;
  announcedAt: string;
  executeAt: string;
  scheduleLabel: string;
  resolvedAt?: string;
  winnerStudentId?: number;
  loserStudentId?: number;
  prestigeAwarded?: number;
  resultMessage?: string;
};
type TerritoryRaid = {
  id: number;
  attackerStudentId: number;
  targetStudentId: number;
  defenderStudentId: number;
  defenderWasOwner: boolean;
  previousOwnerStudentId?: number | null;
  attackerPower: number;
  defenderPower: number;
  announcedAt: string;
  resolvedAt?: string;
  success?: boolean;
  resultMessage?: string;
};


type ArenaFighter = {
  studentId: number;
  studentName: string;
  guildId: number;
  guildName: string;
  element: Element;
  power: number;
  wins: number;
  losses: number;
};

type ArenaRun = {
  id: number;
  createdAt: string;
  ranking: ArenaFighter[];
};

type Question = {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  difficulty: Difficulty;
  className: string;
  group: string;
  imageUrl?: string;
};

type Assignment = {
  id: number;
  title: string;
  className: string;
  group: string;
  questionIds: number[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: AssignmentStatus;
  createdAt: string;
};

type AnswerMap = Record<number, "A" | "B" | "C" | "D" | "">;

type Submission = {
  id: number;
  assignmentId: number;
  studentId: number;
  answers: AnswerMap;
  startedAt: string;
  submittedAt?: string;
  score: number;
  autoSubmitted?: boolean;
};

type ExamSession = {
  assignmentId: number;
  studentId: number;
  startedAt: string;
  answers: AnswerMap;
  questionIds: number[];
  shouldAutoSubmit?: boolean;
};

type BossContribution = {
  studentId: number;
  correctCount: number;
  damage: number;
  submittedAt: string;
  chestCount?: number;
  rewards?: Item[];
  killerRewards?: Item[];
};

type BossEvent = {
  id: number;
  name: string;
  species: string;
  avatar: string;
  element: Element;
  level: number;
  exp: number;
  maxHp: number;
  currentHp: number;
  equipment: EquippedItems;
  questionIds: number[];
  startedAt: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  resolvedAt?: string;
  slayerStudentId?: number | null;
  contributions: BossContribution[];
};

type BossBattleSession = {
  bossEventId: number;
  studentId: number;
  startedAt: string;
  answers: AnswerMap;
  questionIds: number[];
  shouldAutoSubmit?: boolean;
};

const STORAGE_KEY = "doanh-v11-avatar-import-polish";
const LEGACY_STORAGE_KEYS = ["doanh-v12-prestige-duel-conquest-balance"];
const ADMIN_USERNAME = "nguyenducdoanh";
const ADMIN_DISPLAY = "Nguyễn Đức Doanh";
const PENDING_SUBMIT_KEY = "doanh-v7-pending-submit";
const RARITIES: Rarity[] = ["Trắng", "Xanh lá", "Xanh dương", "Vàng", "Đỏ", "Tím", "Cam"];
const SLOTS: Slot[] = ["Vũ khí", "Giáp", "Mũ", "Giày"];
const ELEMENTS: Element[] = ["Hỏa", "Thủy", "Băng", "Phong", "Thổ"];
const DEFAULT_CLASS_SUGGESTIONS = ["6A", "6B", "6C"];
const DEFAULT_GROUP_SUGGESTIONS = ["Toán tỉ lệ thức", "Hai tam giác bằng nhau", "Tiếng Anh hiện tại đơn", "Ngữ văn kể chuyện", "Khoa học", "Tổng hợp"];
const EQUIP_STRENGTH_ORDER: Slot[] = ["Vũ khí", "Giáp", "Mũ", "Giày"];
const WEEKLY_MATCH_DAYS = [7, 14, 21, 28];
const PRESTIGE_PER_UNDERDOG_WIN = 5;
const MAX_TERRITORIES_PER_STUDENT = 3;
const MAX_TERRITORY_RAID_PER_WEEK = 1;
const TERRITORY_EXP_SHARE_RATE = 0.1;
const BOSS_CHEST_POOL = 100;
const BOSS_MIN_GUILD_READY = 1;
const BOSS_GEAR_RARITY_POOL: Rarity[] = ["Đỏ", "Tím", "Cam"];
const BOSS_CHEST_MAX_RARITY: Rarity = "Xanh dương";
const BOSS_KILLER_RARITY: Rarity = "Vàng";
const BOSS_SESSION_KEY_PREFIX = "boss-session";


function getEggStage(guildLevel: number) {
  if (guildLevel >= 10) return "hatch";
  if (guildLevel >= 8) return "glow";
  return "idle";
}

function getEggImage(guildLevel: number) {
  const stage = getEggStage(guildLevel);
  if (stage === "hatch") return "/eggs/egg-hatch.png";
  if (stage === "glow") return "/eggs/egg-glow.png";
  return "/eggs/egg-idle.png";
}

function getElementGlow(element?: Element | null) {
  if (element === "Hỏa") return "0 0 22px rgba(249,115,22,0.65)";
  if (element === "Thủy") return "0 0 22px rgba(59,130,246,0.6)";
  if (element === "Băng") return "0 0 22px rgba(125,211,252,0.65)";
  if (element === "Phong") return "0 0 22px rgba(45,212,191,0.65)";
  if (element === "Thổ") return "0 0 22px rgba(234,179,8,0.55)";
  return "0 0 18px rgba(148,163,184,0.45)";
}

function getBeastStageScale(level: number) {
  if (level >= 20) return 1.18;
  if (level >= 12) return 1.12;
  if (level >= 8) return 1.08;
  return 1;
}

function getBeastImage(species?: string) {
  const map: Record<string, string> = {
    "Sói Lửa": "/beasts/soi-lua.png",
    "Hổ Lửa": "/beasts/ho-lua.png",
    "Chim Lửa": "/beasts/chim-lua.png",
    "Long Ngư": "/beasts/long-ngu.png",
    "Rùa Biển": "/beasts/rua-bien.png",
    "Cá Mập Nước": "/beasts/ca-map-nuoc.png",
    "Sói Băng": "/beasts/soi-bang.png",
    "Cáo Băng": "/beasts/cao-bang.png",
    "Gấu Tuyết": "/beasts/gau-tuyet.png",
    "Ưng Gió": "/beasts/ung-gio.png",
    "Lân Phong": "/beasts/lan-phong.png",
    "Dơi Bão": "/beasts/doi-bao.png",
    "Gấu Núi": "/beasts/gau-nui.png",
    "Tê Giác Đất": "/beasts/te-giac-dat.png",
    "Rồng Đá": "/beasts/rong-da.png",
  };
  return map[species || ""] || "/beasts/default.png";
}

function getBeastFrameStyle(beast?: Beast | null) {
  if (!beast) {
    return {
      border: "2px solid #cbd5e1",
      boxShadow: "0 0 18px rgba(148,163,184,0.35)",
      transform: "scale(1)",
      background: "radial-gradient(circle at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))",
    };
  }
  const qualityGlow = beast.quality >= 95
    ? "0 0 44px rgba(251,146,60,1), 0 0 88px rgba(251,146,60,0.45), inset 0 0 28px rgba(251,146,60,0.18)"
    : beast.quality >= 85
      ? "0 0 38px rgba(168,85,247,0.95), 0 0 76px rgba(168,85,247,0.32), inset 0 0 22px rgba(168,85,247,0.16)"
      : beast.quality >= 70
        ? "0 0 32px rgba(59,130,246,0.82), 0 0 64px rgba(59,130,246,0.24), inset 0 0 18px rgba(59,130,246,0.12)"
        : "0 0 22px rgba(148,163,184,0.42)";
  const borderColor = beast.quality >= 95 ? "#fb923c" : beast.quality >= 85 ? "#a855f7" : beast.quality >= 70 ? "#3b82f6" : beast.element === "Hỏa" ? "#f97316" : beast.element === "Thủy" ? "#3b82f6" : beast.element === "Băng" ? "#7dd3fc" : beast.element === "Phong" ? "#2dd4bf" : "#eab308";
  const aura = beast.level >= 20 ? "radial-gradient(circle at center, rgba(255,255,255,0.16), transparent 58%)" : beast.level >= 12 ? "radial-gradient(circle at center, rgba(255,255,255,0.1), transparent 55%)" : "radial-gradient(circle at center, rgba(255,255,255,0.06), transparent 50%)";
  return {
    border: `3px solid ${borderColor}`,
    boxShadow: `${getElementGlow(beast.element)}, ${qualityGlow}`,
    transform: `scale(${getBeastStageScale(beast.level)})`,
    background: `${aura}, radial-gradient(circle at center, rgba(30,41,59,0.98), rgba(2,6,23,1))`,
  };
}


function getBeastQualityTier(quality: number) {
  if (quality >= 95) return { label: "Huyền thoại", color: "#fb923c", bg: "rgba(251,146,60,0.16)" };
  if (quality >= 85) return { label: "Sử thi", color: "#a855f7", bg: "rgba(168,85,247,0.16)" };
  if (quality >= 70) return { label: "Hiếm", color: "#3b82f6", bg: "rgba(59,130,246,0.14)" };
  return { label: "Thường", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" };
}
function getItemFrameStyle(rarity: Rarity) {
  const color = {
    "Trắng": "#cbd5e1",
    "Xanh lá": "#22c55e",
    "Xanh dương": "#3b82f6",
    "Vàng": "#facc15",
    "Đỏ": "#ef4444",
    "Tím": "#a855f7",
    "Cam": "#fb923c",
  }[rarity];
  return {
    border: `2px solid ${color}`,
    boxShadow: `0 0 24px ${color}88, inset 0 0 18px ${color}22`,
    background: `linear-gradient(180deg, #ffffff, #f8fafc 55%, ${color}12)`,
  };
}

const SPECIES_BY_ELEMENT: Record<Element, { name: string; avatar: string }[]> = {
  Hỏa: [
    { name: "Sói Lửa", avatar: "🐺" },
    { name: "Hổ Lửa", avatar: "🐯" },
    { name: "Chim Lửa", avatar: "🦅" },
  ],
  Thủy: [
    { name: "Long Ngư", avatar: "🐉" },
    { name: "Rùa Biển", avatar: "🐢" },
    { name: "Cá Mập Nước", avatar: "🦈" },
  ],
  Băng: [
    { name: "Sói Băng", avatar: "🐺" },
    { name: "Cáo Băng", avatar: "🦊" },
    { name: "Gấu Tuyết", avatar: "🐻" },
  ],
  Phong: [
    { name: "Ưng Gió", avatar: "🦅" },
    { name: "Lân Phong", avatar: "🦄" },
    { name: "Dơi Bão", avatar: "🦇" },
  ],
  Thổ: [
    { name: "Gấu Núi", avatar: "🐻" },
    { name: "Tê Giác Đất", avatar: "🦏" },
    { name: "Rồng Đá", avatar: "🐲" },
  ],
};

const defaultGuilds: Guild[] = [
  { id: 1, name: "Hổ Sấm", exp: 0, level: 1, buffPercent: 0, viceLeaderStudentIds: [], leaderStudentId: null },
  { id: 2, name: "Ưng Lửa", exp: 0, level: 1, buffPercent: 0, viceLeaderStudentIds: [], leaderStudentId: null },
  { id: 3, name: "Sói Bạc", exp: 0, level: 1, buffPercent: 0, viceLeaderStudentIds: [], leaderStudentId: null },
  { id: 4, name: "Rồng Đất", exp: 0, level: 1, buffPercent: 0, viceLeaderStudentIds: [], leaderStudentId: null },
];

const defaultStudents: Student[] = [
  { id: 1, name: "Nguyễn Văn An", username: "hs001", password: "123456", className: "6A", guildId: 1, weeklyPoints: 50, totalPoints: 120, prestigePoints: 0, hasBeast: false, beast: null, inventory: [], equipped: {}, equipmentStrength: {}, avatarUrl: "", notice: "" },
  { id: 2, name: "Trần Gia Bình", username: "hs002", password: "123456", className: "6A", guildId: 1, weeklyPoints: 40, totalPoints: 90, prestigePoints: 0, hasBeast: false, beast: null, inventory: [], equipped: {}, equipmentStrength: {}, avatarUrl: "", notice: "" },
  { id: 3, name: "Lê Minh Chi", username: "hs003", password: "123456", className: "6A", guildId: 2, weeklyPoints: 60, totalPoints: 150, prestigePoints: 0, hasBeast: false, beast: null, inventory: [], equipped: {}, equipmentStrength: {}, avatarUrl: "", notice: "" },
  { id: 4, name: "Phạm Quốc Dũng", username: "hs004", password: "123456", className: "6A", guildId: 2, weeklyPoints: 35, totalPoints: 85, prestigePoints: 0, hasBeast: false, beast: null, inventory: [], equipped: {}, equipmentStrength: {}, avatarUrl: "", notice: "" },
  { id: 5, name: "Đỗ Thu Hà", username: "hs005", password: "123456", className: "6B", guildId: 3, weeklyPoints: 45, totalPoints: 100, prestigePoints: 0, hasBeast: false, beast: null, inventory: [], equipped: {}, equipmentStrength: {}, avatarUrl: "", notice: "" },
  { id: 6, name: "Ngô Đức Khôi", username: "hs006", password: "123456", className: "6B", guildId: 3, weeklyPoints: 42, totalPoints: 95, prestigePoints: 0, hasBeast: false, beast: null, inventory: [], equipped: {}, equipmentStrength: {}, avatarUrl: "", notice: "" },
  { id: 7, name: "Vũ Ngọc Lan", username: "hs007", password: "123456", className: "6B", guildId: 4, weeklyPoints: 58, totalPoints: 130, prestigePoints: 0, hasBeast: false, beast: null, inventory: [], equipped: {}, equipmentStrength: {}, avatarUrl: "", notice: "" },
  { id: 8, name: "Đặng Quang Minh", username: "hs008", password: "123456", className: "6B", guildId: 4, weeklyPoints: 38, totalPoints: 88, prestigePoints: 0, hasBeast: false, beast: null, inventory: [], equipped: {}, equipmentStrength: {}, avatarUrl: "", notice: "" },
];

const defaultQuestions: Question[] = [
  { id: 1, question: "2 + 3 bằng bao nhiêu?", optionA: "4", optionB: "5", optionC: "6", optionD: "7", correctAnswer: "B", difficulty: "Dễ", className: "6A", group: "Toán tỉ lệ thức", imageUrl: "" },
  { id: 2, question: "Từ tiếng Anh của quả táo là gì?", optionA: "apple", optionB: "orange", optionC: "grape", optionD: "banana", correctAnswer: "A", difficulty: "Dễ", className: "6A", group: "Tiếng Anh từ vựng", imageUrl: "" },
  { id: 3, question: "6 x 7 bằng bao nhiêu?", optionA: "40", optionB: "41", optionC: "42", optionD: "43", correctAnswer: "C", difficulty: "Trung bình", className: "6A", group: "Hai tam giác bằng nhau", imageUrl: "" },
  { id: 4, question: "8 + 9 bằng bao nhiêu?", optionA: "15", optionB: "16", optionC: "17", optionD: "18", correctAnswer: "C", difficulty: "Dễ", className: "6B", group: "Toán cộng trừ", imageUrl: "" },
  { id: 5, question: "The opposite of 'big' is?", optionA: "small", optionB: "long", optionC: "fast", optionD: "red", correctAnswer: "A", difficulty: "Dễ", className: "6B", group: "Tiếng Anh tính từ trái nghĩa", imageUrl: "" },
  { id: 6, question: "Thủ đô Việt Nam là gì?", optionA: "Huế", optionB: "Hà Nội", optionC: "Đà Nẵng", optionD: "Hải Phòng", correctAnswer: "B", difficulty: "Trung bình", className: "6B", group: "Địa lí - thủ đô", imageUrl: "" },
];

const defaultAssignments: Assignment[] = [
  {
    id: 101,
    title: "Bài tập Toán 6A tuần 1",
    className: "6A",
    group: "Toán tỉ lệ thức",
    questionIds: [1, 3],
    startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 20,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: 102,
    title: "Bài tập tổng hợp 6B",
    className: "6B",
    group: "Địa lí - thủ đô",
    questionIds: [4, 5, 6],
    startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 25,
    status: "published",
    createdAt: new Date().toISOString(),
  },
];

function formatDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("vi-VN");
}

function isRecentTimestamp(v?: string | null, windowMs = 10 * 60 * 1000) {
  if (!v) return false;
  const time = new Date(v).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= windowMs;
}

function toInputDateTimeValue(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(v: string) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function getGuildLevelNeed(level: number) {
  const table: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 60, 6: 80, 7: 100, 8: 120, 9: 150, 10: 180, 11: 210, 12: 240, 13: 300, 14: 340, 15: 380 };
  return table[level] || 380 + (level - 15) * 40;
}

function getGuildLevelInfo(exp: number) {
  let level = 1;
  let remain = exp;
  while (remain >= getGuildLevelNeed(level)) {
    remain -= getGuildLevelNeed(level);
    level += 1;
  }
  return { level, current: remain, next: getGuildLevelNeed(level), buffPercent: Math.max(0, (level - 1) * 2) };
}

function getBeastLevelNeed(level: number) {
  return 20 + (level - 1) * 10;
}

function getBeastLevelInfo(exp: number) {
  let level = 1;
  let remain = exp;
  while (remain >= getBeastLevelNeed(level)) {
    remain -= getBeastLevelNeed(level);
    level += 1;
  }
  return { level, current: remain, next: getBeastLevelNeed(level) };
}

function getBeastLevelBonus(element: Element, level: number) {
  const spent = level - 1;
  if (element === "Hỏa") return { atk: spent * 3, def: spent * 1, hp: spent * 8, spd: spent * 1 };
  if (element === "Thủy") return { atk: spent * 2, def: spent * 2, hp: spent * 10, spd: spent * 1 };
  if (element === "Băng") return { atk: spent * 2, def: spent * 3, hp: spent * 8, spd: spent * 1 };
  if (element === "Phong") return { atk: spent * 2, def: spent * 1, hp: spent * 6, spd: spent * 3 };
  return { atk: spent * 1, def: spent * 3, hp: spent * 12, spd: spent * 1 };
}

function createBeast(student: Student, guild: Guild, guilds: Guild[]): Beast {
  const h = hashString(`${student.id}-${student.username}-${guild.id}`);
  const ranked8 = guilds.filter((g) => !!g.reachedLevel8At).sort((a, b) => new Date(a.reachedLevel8At || "").getTime() - new Date(b.reachedLevel8At || "").getTime());
  const ranked12 = guilds.filter((g) => !!g.reachedLevel12At).sort((a, b) => new Date(a.reachedLevel12At || "").getTime() - new Date(b.reachedLevel12At || "").getTime());
  const rank8 = Math.max(0, ranked8.findIndex((g) => g.id === guild.id));
  const rank12 = Math.max(0, ranked12.findIndex((g) => g.id === guild.id));
  const quality = 60 + (rank8 === 0 ? 18 : rank8 === 1 ? 14 : rank8 === 2 ? 10 : 6) + (rank12 === 0 ? 20 : rank12 === 1 ? 16 : rank12 === 2 ? 12 : 8) + (h % 6);
  const element = ELEMENTS[h % ELEMENTS.length];
  const speciesList = SPECIES_BY_ELEMENT[element];
  const species = speciesList[h % speciesList.length];
  return {
    species: species.name,
    avatar: species.avatar,
    element,
    quality,
    level: 1,
    exp: 0,
    baseAtk: 45 + (h % 21) + Math.floor(quality / 2),
    baseDef: 42 + (h % 18) + Math.floor(quality / 2),
    baseHp: 230 + (h % 90) + quality * 2,
    baseSpd: 26 + (h % 14) + Math.floor(quality / 5),
  };
}

function rarityScore(r: Rarity) {
  return RARITIES.indexOf(r) + 1;
}

function getRareWeaponDamagePercent(rarity: Rarity) {
  if (rarity === "Vàng") return 8;
  if (rarity === "Đỏ") return 12;
  if (rarity === "Tím") return 18;
  if (rarity === "Cam") return 25;
  return 0;
}

function getItemImage(slot: Slot) {
  if (slot === "Vũ khí") return "/items/weapon.png";
  if (slot === "Giáp") return "/items/armor.png";
  if (slot === "Mũ") return "/items/helmet.png";
  return "/items/boots.png";
}

function itemBonus(slot: Slot, rarity: Rarity) {
  const scale = rarityScore(rarity);
  if (slot === "Vũ khí") return { atk: scale * 8, def: 0, hp: 0, spd: scale * 2 };
  if (slot === "Giáp") return { atk: 0, def: scale * 8, hp: scale * 20, spd: 0 };
  if (slot === "Mũ") return { atk: scale * 3, def: scale * 3, hp: scale * 12, spd: scale * 1 };
  return { atk: 0, def: scale * 2, hp: scale * 8, spd: scale * 4 };
}

function getStrengthCost(nextLevel: number) {
  return Math.max(1, nextLevel);
}

function getItemStrengthLevel(item?: Item | null) {
  return item?.strengthenLevel || 0;
}

function getItemStrengthBonus(slot: Slot, level: number) {
  if (!level) return { atk: 0, def: 0, hp: 0, spd: 0 };
  if (slot === "Vũ khí") return { atk: level * 6, def: 0, hp: 0, spd: 0 };
  if (slot === "Giáp") return { atk: 0, def: level * 6, hp: level * 18, spd: 0 };
  if (slot === "Mũ") return { atk: level * 2, def: level * 2, hp: 0, spd: 0 };
  return { atk: 0, def: 0, hp: level * 10, spd: level * 3 };
}

function itemBonusText(item: Item) {
  const b = itemBonus(item.slot, item.rarity);
  const s = getItemStrengthBonus(item.slot, getItemStrengthLevel(item));
  const bits = [];
  if (b.atk || s.atk) bits.push(`ATK +${b.atk + s.atk}`);
  if (b.def || s.def) bits.push(`DEF +${b.def + s.def}`);
  if (b.hp || s.hp) bits.push(`HP +${b.hp + s.hp}`);
  if (b.spd || s.spd) bits.push(`SPD +${b.spd + s.spd}`);
  const strength = getItemStrengthLevel(item) > 0 ? ` · Cường hóa +${getItemStrengthLevel(item)}` : "";
  const heal = item.healPercent > 0 ? ` · Hồi ${item.healPercent}% máu mỗi lượt` : "";
  const ignore = item.ignoreCounterPercent > 0 ? ` · ${item.ignoreCounterPercent}% bỏ qua bị khắc hệ` : "";
  const damage = item.damagePercent > 0 ? ` · +${item.damagePercent}% sát thương` : "";
  return `${item.slot} ${item.rarity}: ${bits.join(" · ")}${strength}${heal}${ignore}${damage}`;
}

function getItemDetailLines(item?: Item) {
  if (!item) return ["Chưa có trang bị", "Chưa kích hoạt chỉ số"];
  const b = itemBonus(item.slot, item.rarity);
  const s = getItemStrengthBonus(item.slot, getItemStrengthLevel(item));
  const lines = [];
  lines.push(`${item.rarity}${getItemStrengthLevel(item) > 0 ? ` +${getItemStrengthLevel(item)}` : ""}`);
  if (b.atk || s.atk) lines.push(`ATK +${b.atk + s.atk}`);
  if (b.def || s.def) lines.push(`DEF +${b.def + s.def}`);
  if (b.hp || s.hp) lines.push(`HP +${b.hp + s.hp}`);
  if (b.spd || s.spd) lines.push(`SPD +${b.spd + s.spd}`);
  if (item.healPercent > 0) lines.push(`Hồi máu +${item.healPercent}%`);
  if (item.ignoreCounterPercent > 0) lines.push(`Bỏ khắc hệ +${item.ignoreCounterPercent}%`);
  if (item.damagePercent > 0) lines.push(`Sát thương +${item.damagePercent}%`);
  if (item) lines.push(`Nâng cấp kế tiếp tốn ${getStrengthCost(getItemStrengthLevel(item) + 1)} uy danh`);
  return lines;
}

function equippedBonus(student: Student) {
  const total = { atk: 0, def: 0, hp: 0, spd: 0, healPercent: 0, ignoreCounterPercent: 0, damagePercent: 0 };
  SLOTS.forEach((slot) => {
    const item = student.equipped[slot];
    if (!item) return;
    const b = itemBonus(item.slot, item.rarity);
    total.atk += b.atk;
    total.def += b.def;
    total.hp += b.hp;
    total.spd += b.spd;
    total.healPercent += item.healPercent;
    total.ignoreCounterPercent = Math.max(total.ignoreCounterPercent, item.ignoreCounterPercent);
    total.damagePercent += item.damagePercent;
  });
  return total;
}

function nextRarity(r: Rarity): Rarity | null {
  const idx = RARITIES.indexOf(r);
  return idx >= 0 && idx < RARITIES.length - 1 ? RARITIES[idx + 1] : null;
}

function mergeNeed(r: Rarity) {
  if (r === "Trắng") return 2;
  if (r === "Xanh lá") return 3;
  return 4;
}

function rewardStudent(student: Student, rewards: Item[]) {
  return { ...student, inventory: [...student.inventory, ...rewards] };
}


function getAffixKinds(item: Partial<Item>) {
  const kinds: ("heal" | "ignore" | "damage")[] = [];
  if ((item.healPercent || 0) > 0) kinds.push("heal");
  if ((item.ignoreCounterPercent || 0) > 0) kinds.push("ignore");
  if ((item.damagePercent || 0) > 0) kinds.push("damage");
  return kinds;
}

function getRandomDifferentAffix(slot: Slot, exclude: ("heal" | "ignore" | "damage")[]) {
  const pool: ("heal" | "ignore" | "damage")[] = ["heal", "ignore"];
  if (slot === "Vũ khí") pool.push("damage");
  const preferred = pool.filter((x) => !exclude.includes(x));
  const source = preferred.length ? preferred : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function getMergeBonusChance(rarity: Rarity, sourceKinds: number) {
  const base = {
    "Xanh lá": 18,
    "Xanh dương": 26,
    "Vàng": 36,
    "Đỏ": 48,
    "Tím": 60,
    "Cam": 72,
  } as Partial<Record<Rarity, number>>;
  return Math.min(92, (base[rarity] || 0) + Math.max(0, sourceKinds - 1) * 12);
}

function getMergedAffixValue(kind: "heal" | "ignore" | "damage", rarity: Rarity, currentValue: number) {
  if (kind === "heal") {
    const table = { "Xanh lá": 3, "Xanh dương": 4, "Vàng": 5, "Đỏ": 6, "Tím": 8, "Cam": 10 } as Partial<Record<Rarity, number>>;
    return Math.max(currentValue, table[rarity] || 0);
  }
  if (kind === "ignore") {
    const table = { "Xanh dương": 10, "Vàng": 15, "Đỏ": 30, "Tím": 40, "Cam": 50 } as Partial<Record<Rarity, number>>;
    return Math.max(currentValue, table[rarity] || 0);
  }
  const table = { "Xanh lá": 3, "Xanh dương": 5, "Vàng": 8, "Đỏ": 12, "Tím": 18, "Cam": 25 } as Partial<Record<Rarity, number>>;
  return Math.max(currentValue, table[rarity] || 0);
}

function createMergedItem(slot: Slot, rarity: Rarity, sourceItems: Item[]): Item {
  const sourceKinds = Array.from(new Set(sourceItems.flatMap((item) => getAffixKinds(item))));
  const merged: Item = {
    id: Date.now() + Math.random(),
    slot,
    rarity,
    healPercent: sourceItems.some((g) => g.healPercent > 0) ? Math.max(...sourceItems.map((g) => g.healPercent)) + 1 : 0,
    ignoreCounterPercent: rarityScore(rarity) >= rarityScore("Đỏ")
      ? Math.max(...sourceItems.map((g) => g.ignoreCounterPercent || 0), ({ "Đỏ": 30, "Tím": 40, "Cam": 50 } as Record<Rarity, number>)[rarity] || 0)
      : Math.max(...sourceItems.map((g) => g.ignoreCounterPercent || 0)),
    damagePercent: slot === "Vũ khí"
      ? Math.max(...sourceItems.map((g) => g.damagePercent || 0), getRareWeaponDamagePercent(rarity))
      : 0,
    strengthenLevel: Math.max(...sourceItems.map((g) => g.strengthenLevel || 0), 0),
  };

  const mergedKinds = getAffixKinds(merged);
  const bonusChance = getMergeBonusChance(rarity, sourceKinds.length);
  if (Math.random() * 100 < bonusChance) {
    const bonusKind = getRandomDifferentAffix(slot, [...sourceKinds, ...mergedKinds]);
    if (bonusKind === "heal") merged.healPercent = getMergedAffixValue("heal", rarity, merged.healPercent);
    if (bonusKind === "ignore") merged.ignoreCounterPercent = getMergedAffixValue("ignore", rarity, merged.ignoreCounterPercent);
    if (bonusKind === "damage") merged.damagePercent = getMergedAffixValue("damage", rarity, merged.damagePercent);
  }

  return merged;
}

function autoProcessInventory(student: Student): Student {
  let items = [...student.inventory].map((item) => ({ ...item }));
  let changed = true;
  while (changed) {
    changed = false;
    for (const slot of SLOTS) {
      for (const rarity of RARITIES.slice(0, -1)) {
        const group = items.filter((x) => x.slot === slot && x.rarity === rarity);
        const need = mergeNeed(rarity);
        if (group.length >= need) {
          items = items.filter((x) => !(x.slot === slot && x.rarity === rarity));
          const next = nextRarity(rarity)!;
          const consumed = group.slice(0, need);
          const remainder = group.length - need;
          for (let i = 0; i < remainder; i++) items.push(group[need + i]);
          items.push(createMergedItem(slot, next, consumed));
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  const equipped: EquippedItems = {};
  for (const slot of SLOTS) {
    const candidates = items.filter((x) => x.slot === slot).sort((a, b) => {
      if (rarityScore(b.rarity) !== rarityScore(a.rarity)) return rarityScore(b.rarity) - rarityScore(a.rarity);
      if ((b.strengthenLevel || 0) !== (a.strengthenLevel || 0)) return (b.strengthenLevel || 0) - (a.strengthenLevel || 0);
      if (b.damagePercent !== a.damagePercent) return b.damagePercent - a.damagePercent;
      if (b.healPercent !== a.healPercent) return b.healPercent - a.healPercent;
      return b.ignoreCounterPercent - a.ignoreCounterPercent;
    });
    if (candidates[0]) equipped[slot] = candidates[0];
  }

  if (student.equipmentStrength) {
    SLOTS.forEach((slot) => {
      const legacyLevel = student.equipmentStrength?.[slot] || 0;
      const equippedItem = equipped[slot];
      if (equippedItem && legacyLevel > (equippedItem.strengthenLevel || 0)) {
        equippedItem.strengthenLevel = legacyLevel;
      }
    });
  }

  return { ...student, inventory: items, equipped };
}

function getCounterRelation(attacker: Element, defender: Element) {
  return (
    (attacker === "Thủy" && defender === "Hỏa") ||
    (attacker === "Băng" && defender === "Phong") ||
    (attacker === "Hỏa" && defender === "Băng") ||
    (attacker === "Phong" && defender === "Thổ") ||
    (attacker === "Thổ" && defender === "Thủy")
  );
}

function getElementModifier(attacker: Element, defender: Element, ignorePercent: number) {
  if (getCounterRelation(attacker, defender)) return 1.05;
  if (getCounterRelation(defender, attacker)) {
    const roll = Math.random() * 100;
    if (roll < ignorePercent) return 1;
    return 0.95;
  }
  return 1;
}

function getViceCount(n: number) {
  if (n >= 40) return 3;
  if (n >= 20) return 2;
  return n > 1 ? 1 : 0;
}

function beastStats(student: Student) {
  if (!student.beast) return null;
  const b = student.beast;
  const lv = getBeastLevelBonus(b.element, b.level);
  const eq = equippedBonus(student);
  const strength = getStrengthBonus(student);
  return {
    atk: b.baseAtk + lv.atk + eq.atk + strength.atk,
    def: b.baseDef + lv.def + eq.def + strength.def,
    hp: b.baseHp + lv.hp + eq.hp + strength.hp,
    spd: b.baseSpd + lv.spd + eq.spd + strength.spd,
    healPercent: eq.healPercent,
    ignoreCounterPercent: eq.ignoreCounterPercent,
    damagePercent: eq.damagePercent,
  };
}

function beastPower(student: Student, guild: Guild) {
  const st = beastStats(student);
  if (!st || !student.beast) return 0;
  const raw = st.atk * 2 + st.def * 1.8 + st.hp * 0.5 + st.spd * 2.2 + student.beast.quality * 3 + student.beast.level * 10;
  const roleBuffPercent = guild.leaderStudentId === student.id ? 5 : guild.viceLeaderStudentIds.includes(student.id) ? 2 : 0;
  const totalPercentBuff = guild.buffPercent + roleBuffPercent;
  const totalStatBuff = 1 + totalPercentBuff / 100;
  const weaponDamageBuff = 1 + (st.damagePercent || 0) / 100;
  return Math.round(raw * totalStatBuff * weaponDamageBuff);
}

function getGuildLevelLootMultiplier(guildLevel: number) {
  if (guildLevel <= 1) return 0.7;
  if (guildLevel <= 3) return 0.8;
  if (guildLevel <= 5) return 0.9;
  if (guildLevel <= 8) return 1;
  if (guildLevel <= 12) return 1.12;
  if (guildLevel <= 16) return 1.24;
  return 1.36;
}

function getBeastLevelLootMultiplier(beastLevel: number) {
  if (beastLevel <= 1) return 0.3;
  if (beastLevel <= 3) return 0.42;
  if (beastLevel <= 5) return 0.55;
  if (beastLevel <= 8) return 0.72;
  if (beastLevel <= 12) return 0.9;
  if (beastLevel <= 16) return 1;
  if (beastLevel <= 20) return 1.1;
  return 1.2;
}

function getLootProgressMultiplier(guildLevel: number, beastLevel: number) {
  return getGuildLevelLootMultiplier(guildLevel) * getBeastLevelLootMultiplier(beastLevel);
}

function rollRarity(maxRarity: Rarity = "Cam", guildLevel = 1, beastLevel = 1): Rarity {
  const options = [
    { rarity: "Trắng", rate: 50 },
    { rarity: "Xanh lá", rate: 20 },
    { rarity: "Xanh dương", rate: 12 },
    { rarity: "Vàng", rate: 8 },
    { rarity: "Đỏ", rate: 5 },
    { rarity: "Tím", rate: 3 },
    { rarity: "Cam", rate: 2 },
  ] as { rarity: Rarity; rate: number }[];
  const progress = getLootProgressMultiplier(guildLevel, beastLevel);
  const cap = rarityScore(maxRarity);
  const capped = options
    .filter((x) => rarityScore(x.rarity) <= cap)
    .map((x) => {
      const score = rarityScore(x.rarity);
      const adjustedRate =
        score <= 2
          ? x.rate / Math.max(0.55, progress)
          : x.rate * Math.pow(progress, Math.max(0, score - 2));
      return { ...x, rate: Math.max(0.2, Number(adjustedRate.toFixed(2))) };
    });
  const total = capped.reduce((s, x) => s + x.rate, 0);
  let roll = Math.random() * total;
  for (const x of capped) {
    roll -= x.rate;
    if (roll <= 0) return x.rarity;
  }
  return capped[capped.length - 1].rarity;
}

function getRarityAffixMultiplier(rarity: Rarity) {
  return {
    "Trắng": 0.2,
    "Xanh lá": 0.4,
    "Xanh dương": 0.58,
    "Vàng": 0.78,
    "Đỏ": 1,
    "Tím": 1.22,
    "Cam": 1.45,
  }[rarity];
}

function getScaledAffixChance(baseChance: number, rarity: Rarity, beastLevel: number, guildLevel = 1) {
  const scaled = baseChance * getRarityAffixMultiplier(rarity) * getLootProgressMultiplier(guildLevel, beastLevel);
  return Math.max(0, Math.min(95, Math.round(scaled)));
}

function generateRewardItem(rankCap: Rarity, beastLevel = 1, guildLevel = 1): Item {
  const rarity = rollRarity(rankCap, guildLevel, beastLevel);
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const baseRareChance = {
    "Trắng": 2,
    "Xanh lá": 4,
    "Xanh dương": 6,
    "Vàng": 8,
    "Đỏ": 10,
    "Tím": 12,
    "Cam": 15,
  }[rarity];
  const rolledRareChance = getScaledAffixChance(baseRareChance, rarity, beastLevel, guildLevel);
  const item: Item = {
    id: Date.now() + Math.random(),
    slot,
    rarity,
    healPercent: Math.random() * 100 < rolledRareChance ? getMergedAffixValue("heal", rarity, 0) : 0,
    ignoreCounterPercent: rarity === "Đỏ" ? 30 : rarity === "Tím" ? 40 : rarity === "Cam" ? 50 : 0,
    damagePercent: slot === "Vũ khí" ? getRareWeaponDamagePercent(rarity) : 0,
  };
  const existingKinds = getAffixKinds(item);
  const extraChance = getScaledAffixChance({
    "Trắng": 0,
    "Xanh lá": 8,
    "Xanh dương": 12,
    "Vàng": 20,
    "Đỏ": 28,
    "Tím": 36,
    "Cam": 46,
  }[rarity], rarity, beastLevel, guildLevel);
  if (Math.random() * 100 < extraChance) {
    const extraKind = getRandomDifferentAffix(slot, existingKinds);
    if (extraKind === "heal") item.healPercent = getMergedAffixValue("heal", rarity, item.healPercent);
    if (extraKind === "ignore") item.ignoreCounterPercent = getMergedAffixValue("ignore", rarity, item.ignoreCounterPercent);
    if (extraKind === "damage") item.damagePercent = getMergedAffixValue("damage", rarity, item.damagePercent);
  }

  const secondKinds = getAffixKinds(item);
  const secondExtraChance = getScaledAffixChance({
    "Trắng": 0,
    "Xanh lá": 0,
    "Xanh dương": 2,
    "Vàng": 5,
    "Đỏ": 10,
    "Tím": 18,
    "Cam": 28,
  }[rarity], rarity, beastLevel, guildLevel);
  const maxKinds = slot === "Vũ khí" ? 3 : 2;
  if (secondKinds.length < maxKinds && Math.random() * 100 < secondExtraChance) {
    const extraKind = getRandomDifferentAffix(slot, secondKinds);
    if (extraKind === "heal") item.healPercent = getMergedAffixValue("heal", rarity, item.healPercent);
    if (extraKind === "ignore") item.ignoreCounterPercent = getMergedAffixValue("ignore", rarity, item.ignoreCounterPercent);
    if (extraKind === "damage") item.damagePercent = getMergedAffixValue("damage", rarity, item.damagePercent);
  }
  return item;
}

function parseQuestionImport(text: string): Omit<Question, "id">[] {
  const normalizedText = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const lines = normalizedText
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => Boolean(x));

  if (!lines.length) return [];

  const delim = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const rawRows = lines.map((line) => line.split(delim).map((x) => x.trim()));

  const looksLikeHeader = (row: string[]) => {
    const joined = row.join(" ").toLowerCase();
    return joined.includes("bộ câu hỏi") || joined.includes("câu hỏi") || joined.includes("question");
  };

  const normalizeAnswer = (value: string) => {
    const v = (value || "").trim().toUpperCase();
    if (v === "A" || v === "B" || v === "C" || v === "D") return v;
    if (v === "1") return "A";
    if (v === "2") return "B";
    if (v === "3") return "C";
    if (v === "4") return "D";
    return "A";
  };

  const rows = (looksLikeHeader(rawRows[0]) ? rawRows.slice(1) : rawRows)
    .filter((r) => r.some((x) => x))
    .map((r) => {
      const cells = [...r];
      while (cells.length < 8) cells.push("");
      return cells;
    });

  return rows
    .filter((r) => r[1] && r[2] && r[3] && r[4] && r[5])
    .map((r) => ({
      question: r[1],
      optionA: r[2],
      optionB: r[3],
      optionC: r[4],
      optionD: r[5],
      correctAnswer: normalizeAnswer(r[6]) as "A" | "B" | "C" | "D",
      difficulty: "Dễ",
      className: "",
      group: r[0] || "Bộ chung",
      imageUrl: r[7] || "",
    }));
}


function splitMathSegments(text: string) {
  return (text || "").split("$").map((segment, index) => ({ segment, isMath: index % 2 === 1 }));
}

function renderTextWithMath(text: string) {
  return splitMathSegments(text).map((part, index) =>
    part.isMath ? <InlineMath key={index} math={part.segment || " "} /> : <span key={index}>{part.segment}</span>
  );
}

function parseChatGPTQuestionText(raw: string): Omit<Question, "id">[] {
  const normalized = raw.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  if (!normalized) return [];
  const blocks = normalized
    .split(/(?:^|\n)Câu\s*\d+\s*[:.]/i)
    .map((block) => block.trim())
    .filter(Boolean);

  const readOption = (lines: string[], key: "A" | "B" | "C" | "D") => {
    const prefix = `${key}.`;
    const line = lines.find((l) => l.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : "";
  };

  return blocks
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const questionLine = lines[0] || "";
      const correctLine = lines.find((line) => line.toLowerCase().includes("đáp án"));
      const imageLine = lines.find((line) => /^(hình|ảnh|image)\s*:/i.test(line));
      const correct = (correctLine?.match(/[A-D]/i)?.[0] || "A").toUpperCase() as "A" | "B" | "C" | "D";

      return {
        question: questionLine,
        optionA: readOption(lines, "A"),
        optionB: readOption(lines, "B"),
        optionC: readOption(lines, "C"),
        optionD: readOption(lines, "D"),
        correctAnswer: correct,
        difficulty: "Dễ" as Difficulty,
        className: "",
        group: "Bộ chung",
        imageUrl: imageLine ? imageLine.replace(/^(hình|ảnh|image)\s*:/i, "").trim() : "",
      };
    })
    .filter((item) => item.question && item.optionA && item.optionB && item.optionC && item.optionD);
}

function getQuestionScore(q: Question) {
  return q.difficulty === "Dễ" ? 10 : q.difficulty === "Trung bình" ? 15 : 20;
}

function isAssignmentOpen(a: Assignment) {
  const now = Date.now();
  return a.status === "published" && now >= new Date(a.startTime).getTime() && now <= new Date(a.endTime).getTime();
}

function getAssignmentWindowText(a: Assignment) {
  return `${formatDateTime(a.startTime)} → ${formatDateTime(a.endTime)} · ${a.durationMinutes} phút`;
}

function computeRemainingSeconds(startedAt: string, durationMinutes: number) {
  const start = new Date(startedAt).getTime();
  const end = start + durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((end - Date.now()) / 1000));
}

function formatCountdown(seconds: number) {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function getSubmissionStats(submission: Submission, assignments: Assignment[], questions: Question[]) {
  const assignment = assignments.find((a) => a.id === submission.assignmentId);
  if (!assignment) return { correctCount: 0, durationSeconds: 0, totalQuestions: 0 };
  const pickedQuestions = questions.filter((q) => assignment.questionIds.includes(q.id));
  const correctCount = pickedQuestions.filter((q) => submission.answers[q.id] === q.correctAnswer).length;
  const startMs = new Date(submission.startedAt).getTime();
  const endMs = new Date(submission.submittedAt || submission.startedAt).getTime();
  const durationSeconds = Math.max(1, Math.floor((endMs - startMs) / 1000));
  return { correctCount, durationSeconds, totalQuestions: pickedQuestions.length };
}

function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function getStartOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDurationShort(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}p ${String(seconds).padStart(2, "0")}s`;
}

function getGuildTotalPower(guild: Guild, sourceStudents: Student[]) {
  return sourceStudents.filter((s) => s.guildId === guild.id && s.beast).reduce((sum, s) => sum + beastPower(s, guild), 0);
}

function isWithinPowerGap(powerA: number, powerB: number, gapPercent = 15) {
  if (!powerA || !powerB) return false;
  const high = Math.max(powerA, powerB);
  const low = Math.min(powerA, powerB);
  return ((high - low) / high) * 100 <= gapPercent;
}

function getStrengthLevel(student: Student, slot: Slot) {
  return student.equipped[slot]?.strengthenLevel || student.equipmentStrength?.[slot] || 0;
}

function getStrengthBonus(student: Student) {
  const total = { atk: 0, def: 0, hp: 0, spd: 0 };
  SLOTS.forEach((slot) => {
    const bonus = getItemStrengthBonus(slot, getStrengthLevel(student, slot));
    total.atk += bonus.atk;
    total.def += bonus.def;
    total.hp += bonus.hp;
    total.spd += bonus.spd;
  });
  return total;
}

function autoSpendPrestige(student: Student) {
  let remaining = Math.max(0, student.prestigePoints || 0);
  const items = [...student.inventory].map((item) => ({ ...item }));
  let cursor = 0;
  let upgraded = false;
  let safety = 0;
  while (remaining > 0 && safety < 5000) {
    safety += 1;
    const currentSlot = EQUIP_STRENGTH_ORDER[cursor % EQUIP_STRENGTH_ORDER.length];
    cursor += 1;
    const candidates = items.filter((item) => item.slot === currentSlot);
    if (!candidates.length) continue;
    candidates.sort((a, b) => {
      if (rarityScore(b.rarity) !== rarityScore(a.rarity)) return rarityScore(b.rarity) - rarityScore(a.rarity);
      if ((b.strengthenLevel || 0) !== (a.strengthenLevel || 0)) return (b.strengthenLevel || 0) - (a.strengthenLevel || 0);
      return (b.damagePercent + b.healPercent + b.ignoreCounterPercent) - (a.damagePercent + a.healPercent + a.ignoreCounterPercent);
    });
    const target = candidates[0];
    const nextLevel = (target.strengthenLevel || 0) + 1;
    const cost = getStrengthCost(nextLevel);
    if (remaining < cost) {
      const affordable = EQUIP_STRENGTH_ORDER.some((slot) => {
        const slotTarget = items
          .filter((item) => item.slot === slot)
          .sort((a, b) => rarityScore(b.rarity) - rarityScore(a.rarity) || (b.strengthenLevel || 0) - (a.strengthenLevel || 0))[0];
        return slotTarget ? remaining >= getStrengthCost((slotTarget.strengthenLevel || 0) + 1) : false;
      });
      if (!affordable) break;
      continue;
    }
    target.strengthenLevel = nextLevel;
    remaining -= cost;
    upgraded = true;
  }
  const nextStudent = autoProcessInventory({ ...student, inventory: items, prestigePoints: remaining });
  return upgraded ? nextStudent : { ...student, prestigePoints: remaining };
}

function getNextMatchScheduleLabel(fromDate = new Date()) {
  const y = fromDate.getFullYear();
  const m = fromDate.getMonth();
  const candidates = WEEKLY_MATCH_DAYS
    .map((day) => new Date(y, m, day, 19, 0, 0, 0))
    .filter((d) => d.getTime() >= fromDate.getTime());
  const picked = candidates[0] || new Date(y, m + 1, WEEKLY_MATCH_DAYS[0], 19, 0, 0, 0);
  return {
    executeAt: picked.toISOString(),
    label: `Ghép cặp tuần ${String(picked.getDate()).padStart(2, "0")}/${String(picked.getMonth() + 1).padStart(2, "0")}/${picked.getFullYear()}`,
  };
}

function getPowerCompareText(powerA: number, powerB: number) {
  if (!powerA || !powerB) return "Chưa đủ lực chiến để so sánh";
  const high = Math.max(powerA, powerB);
  const low = Math.min(powerA, powerB);
  const diff = Math.round(((high - low) / high) * 1000) / 10;
  return `Chênh lệch ${diff}%`;
}


function appendNotice(existing: string | undefined, message: string) {
  return existing ? `${message} ${existing}` : message;
}

function getWeekKeyFromIso(iso?: string | null) {
  const base = iso ? new Date(iso) : new Date();
  const start = getStartOfWeek(base);
  return `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Không đọc được file ảnh"));
    reader.readAsDataURL(file);
  });
}

function getStudentRareItemScore(student: Student) {
  return student.inventory.reduce((sum, item) => sum + rarityScore(item.rarity), 0);
}

function getBossImage() {
  return "/beasts/boss.png";
}

function createBossEquipment() {
  const equipped: EquippedItems = {};
  SLOTS.forEach((slot, index) => {
    const rarity = BOSS_GEAR_RARITY_POOL[index % BOSS_GEAR_RARITY_POOL.length];
    equipped[slot] = {
      id: Date.now() + index + Math.random(),
      slot,
      rarity,
      healPercent: slot === "Giáp" || slot === "Mũ" ? getMergedAffixValue("heal", rarity, 0) : 0,
      ignoreCounterPercent: rarityScore(rarity) >= rarityScore("Đỏ") ? getMergedAffixValue("ignore", rarity, 0) : 0,
      damagePercent: slot === "Vũ khí" ? getMergedAffixValue("damage", rarity, 0) : 0,
      strengthenLevel: 0,
    };
  });
  return equipped;
}

function getBossQuestionIds(sourceQuestions: Question[]) {
  return sourceQuestions.map((question) => question.id);
}

function getTotalBeastPower(sourceStudents: Student[], sourceGuilds: Guild[]) {
  return sourceGuilds
    .filter((guild) => !guild.mergedIntoGuildId)
    .reduce((sum, guild) => sum + sourceStudents.filter((student) => student.guildId === guild.id && student.beast).reduce((guildSum, student) => guildSum + beastPower(student, guild), 0), 0);
}

function getBossBattleElementModifier(attacker: Element, defender: Element, ignorePercent: number) {
  if (getCounterRelation(attacker, defender)) return 1.05;
  if (getCounterRelation(defender, attacker)) {
    if (Math.random() * 100 < ignorePercent) return 1;
    return 0.98;
  }
  return 1;
}

function isBossEventOpen(event?: BossEvent | null) {
  if (!event || event.resolvedAt) return false;
  const now = Date.now();
  return now >= new Date(event.startTime).getTime() && now <= new Date(event.endTime).getTime();
}

function migrateBossEvent(raw: BossEvent | null | undefined, sourceQuestions: Question[]): BossEvent | null {
  if (!raw) return null;
  const questionIds = Array.isArray(raw.questionIds) && raw.questionIds.length ? raw.questionIds : getBossQuestionIds(sourceQuestions);
  const startedAt = raw.startedAt || new Date().toISOString();
  const startTime = (raw as BossEvent & { startTime?: string }).startTime || startedAt;
  const endTime = (raw as BossEvent & { endTime?: string }).endTime || new Date(new Date(startTime).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const durationMinutes = (raw as BossEvent & { durationMinutes?: number }).durationMinutes || 20;
  return {
    ...raw,
    questionIds,
    startTime,
    endTime,
    durationMinutes,
  };
}

function createBossEvent(sourceGuilds: Guild[], sourceStudents: Student[], sourceQuestions: Question[], options?: {
  title?: string;
  element?: Element;
  questionIds?: number[];
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}): BossEvent {
  const readyGuilds = sourceGuilds.filter((guild) => !guild.mergedIntoGuildId && sourceStudents.some((student) => student.guildId === guild.id && student.beast));
  const totalPower = Math.max(1000, getTotalBeastPower(sourceStudents, readyGuilds));
  const element = options?.element || ELEMENTS[totalPower % ELEMENTS.length];
  const startTime = options?.startTime || new Date().toISOString();
  const endTime = options?.endTime || new Date(new Date(startTime).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: Date.now(),
    name: options?.title?.trim() || "Boss thế giới",
    species: "Boss thế giới",
    avatar: "👹",
    element,
    level: 1,
    exp: 0,
    maxHp: totalPower,
    currentHp: totalPower,
    equipment: createBossEquipment(),
    questionIds: options?.questionIds?.length ? options.questionIds : getBossQuestionIds(sourceQuestions),
    startedAt: new Date().toISOString(),
    startTime,
    endTime,
    durationMinutes: Math.max(1, options?.durationMinutes || 20),
    slayerStudentId: null,
    contributions: [],
  };
}

function getBossParticipantContribution(bossEvent: BossEvent | null | undefined, studentId: number) {
  return bossEvent?.contributions.find((entry) => entry.studentId === studentId) || null;
}

function allocateBossChestCounts(contributions: BossContribution[], bossMaxHp: number) {
  if (!contributions.length || !bossMaxHp) return new Map<number, number>();
  const exacts = contributions.map((entry) => ({
    studentId: entry.studentId,
    exact: (entry.damage / bossMaxHp) * BOSS_CHEST_POOL,
  }));
  const chestMap = new Map<number, number>();
  let assigned = 0;
  exacts.forEach((entry) => {
    const base = Math.floor(entry.exact);
    chestMap.set(entry.studentId, base);
    assigned += base;
  });
  let remaining = Math.max(0, BOSS_CHEST_POOL - assigned);
  const fractions = exacts
    .map((entry) => ({ studentId: entry.studentId, fraction: Math.max(0, entry.exact - Math.floor(entry.exact)) }))
    .filter((entry) => entry.fraction > 0)
    .sort((a, b) => b.fraction - a.fraction);

  while (remaining > 0 && fractions.length > 0) {
    const totalFraction = fractions.reduce((sum, entry) => sum + entry.fraction, 0);
    let roll = Math.random() * totalFraction;
    let pickedIndex = 0;
    for (let i = 0; i < fractions.length; i++) {
      roll -= fractions[i].fraction;
      if (roll <= 0) {
        pickedIndex = i;
        break;
      }
    }
    const picked = fractions.splice(pickedIndex, 1)[0];
    chestMap.set(picked.studentId, (chestMap.get(picked.studentId) || 0) + 1);
    remaining -= 1;
  }

  if (remaining > 0) {
    exacts
      .sort((a, b) => b.exact - a.exact)
      .slice(0, remaining)
      .forEach((entry) => chestMap.set(entry.studentId, (chestMap.get(entry.studentId) || 0) + 1));
  }
  return chestMap;
}

function getBossSessionKey(studentId: number) {
  return `${BOSS_SESSION_KEY_PREFIX}-${studentId}`;
}


export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [role, setRole] = useState<"select" | "admin_login" | "student_login" | "admin" | "student">("select");
  const [tab, setTab] = useState<"overview" | "students" | "points" | "guilds" | "arena" | "boss" | "conquest" | "questions" | "assignments" | "submissions" | "rankings" | "events" | "settings">("overview");
  const [guilds, setGuilds] = useState<Guild[]>(defaultGuilds);
  const [students, setStudents] = useState<Student[]>(defaultStudents);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [conquestBattles, setConquestBattles] = useState<ConquestBattle[]>([]);
  const [duelMatches, setDuelMatches] = useState<DuelMatch[]>([]);
  const [territoryRaids, setTerritoryRaids] = useState<TerritoryRaid[]>([]);
  const [arenaRuns, setArenaRuns] = useState<ArenaRun[]>([]);
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions);
  const [assignments, setAssignments] = useState<Assignment[]>(defaultAssignments);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [adminPassword, setAdminPassword] = useState("123456");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [studentUser, setStudentUser] = useState("");
  const [studentPass, setStudentPass] = useState("");
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const [selectedGuildId, setSelectedGuildId] = useState(1);
  const [pointInputs, setPointInputs] = useState<Record<number, string>>({});
  const [guildExpGuildId, setGuildExpGuildId] = useState(1);
  const [guildExpValue, setGuildExpValue] = useState("50");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [qQuestion, setQQuestion] = useState("");
  const [qA, setQA] = useState("");
  const [qB, setQB] = useState("");
  const [qC, setQC] = useState("");
  const [qD, setQD] = useState("");
  const [qCorrect, setQCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [qDiff, setQDiff] = useState<Difficulty>("Dễ");
  const [qClassName, setQClassName] = useState("");
  const [qGroup, setQGroup] = useState("Bộ chung");
  const [qImageUrl, setQImageUrl] = useState("");
  const [questionEditId, setQuestionEditId] = useState<number | null>(null);
  const [questionFilterClass, setQuestionFilterClass] = useState("Tất cả");
  const [questionFilterGroup, setQuestionFilterGroup] = useState("Tất cả");
  const [importText, setImportText] = useState("");
  const [studentMessage, setStudentMessage] = useState("");
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<AnswerMap>({});
  const [examStartedAt, setExamStartedAt] = useState<string | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentClassName, setAssignmentClassName] = useState("6A");
  const [assignmentGroup, setAssignmentGroup] = useState("Bộ chung");
  const [guildNameInput, setGuildNameInput] = useState("");
  const [dissolveFromGuildId, setDissolveFromGuildId] = useState(1);
  const [dissolveToGuildId, setDissolveToGuildId] = useState(2);
  const [conquestAttackerGuildId, setConquestAttackerGuildId] = useState(1);
  const [conquestDefenderGuildId, setConquestDefenderGuildId] = useState(2);
  const [territoryAttackerStudentId, setTerritoryAttackerStudentId] = useState<number>(1);
  const [territoryTargetStudentId, setTerritoryTargetStudentId] = useState<number>(2);
  const [memberName, setMemberName] = useState("");
  const [memberUsername, setMemberUsername] = useState("");
  const [memberPassword, setMemberPassword] = useState("123456");
  const [memberClassName, setMemberClassName] = useState("6A");
  const [memberGuildId, setMemberGuildId] = useState(1);
  const [memberAvatarUrl, setMemberAvatarUrl] = useState("");
  const [memberEditId, setMemberEditId] = useState<number | null>(null);
  const [rankingClassFilter, setRankingClassFilter] = useState("Tất cả");
  const [assignmentQuestionIds, setAssignmentQuestionIds] = useState<number[]>([]);
  const [assignmentStartTime, setAssignmentStartTime] = useState(toInputDateTimeValue(new Date().toISOString()));
  const [assignmentEndTime, setAssignmentEndTime] = useState(toInputDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()));
  const [assignmentDuration, setAssignmentDuration] = useState("20");
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus>("published");
  const [assignmentEditId, setAssignmentEditId] = useState<number | null>(null);
  const [bossEvent, setBossEvent] = useState<BossEvent | null>(null);
  const [bossSpawnGateOpen, setBossSpawnGateOpen] = useState(true);
  const [activeBossBattleId, setActiveBossBattleId] = useState<number | null>(null);
  const [bossAnswers, setBossAnswers] = useState<AnswerMap>({});
  const [bossBattleQuestionIds, setBossBattleQuestionIds] = useState<number[]>([]);
  const [bossBattleStartedAt, setBossBattleStartedAt] = useState<string | null>(null);
  const [bossTimeLeftSeconds, setBossTimeLeftSeconds] = useState<number>(0);
  const [bossDraftTitle, setBossDraftTitle] = useState("Nhiệm vụ diệt boss");
  const [bossDraftElement, setBossDraftElement] = useState<Element>("Hỏa");
  const [bossDraftQuestionIds, setBossDraftQuestionIds] = useState<number[]>([]);
  const [bossDraftStartTime, setBossDraftStartTime] = useState(toInputDateTimeValue(new Date().toISOString()));
  const [bossDraftEndTime, setBossDraftEndTime] = useState(toInputDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()));
  const [bossDraftDuration, setBossDraftDuration] = useState("20");
  const autoSubmittedRef = useRef(false);
  const bossAutoSubmittedRef = useRef(false);
  const resolvingConquestRef = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) || null;
    if (raw) {
      const parsed = JSON.parse(raw);
      setGuilds(parsed.guilds || defaultGuilds);
      setStudents(parsed.students || defaultStudents);
      setEventLogs(parsed.eventLogs || []);
      setConquestBattles(parsed.conquestBattles || []);
      setDuelMatches(parsed.duelMatches || []);
      setTerritoryRaids(parsed.territoryRaids || []);
      setArenaRuns(parsed.arenaRuns || []);
      setQuestions(parsed.questions || defaultQuestions);
      setAssignments(parsed.assignments || defaultAssignments);
      setSubmissions(parsed.submissions || []);
      setBossEvent(migrateBossEvent(parsed.bossEvent || null, parsed.questions || defaultQuestions));
      setBossSpawnGateOpen(parsed.bossSpawnGateOpen ?? true);
      setAdminPassword(parsed.adminPassword || "123456");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ guilds, students, eventLogs, conquestBattles, duelMatches, territoryRaids, arenaRuns, questions, assignments, submissions, bossEvent, bossSpawnGateOpen, adminPassword }));
  }, [hydrated, guilds, students, eventLogs, conquestBattles, duelMatches, territoryRaids, arenaRuns, questions, assignments, submissions, bossEvent, bossSpawnGateOpen, adminPassword]);

  const activeGuilds = useMemo(() => guilds.filter((g) => !g.mergedIntoGuildId), [guilds]);
  const availableConquestGuilds = useMemo(() => activeGuilds.filter((g) => students.some((s) => s.guildId === g.id && s.beast)), [activeGuilds, students]);
  const pendingConquestBattles = useMemo(
    () => conquestBattles.filter((battle) => !battle.resolvedAt).sort((a, b) => new Date(a.executeAt).getTime() - new Date(b.executeAt).getTime()),
    [conquestBattles]
  );
  const pendingDuelMatches = useMemo(
    () => duelMatches.filter((match) => !match.resolvedAt).sort((a, b) => new Date(a.executeAt).getTime() - new Date(b.executeAt).getTime()),
    [duelMatches]
  );
  const territoryEligibleStudents = useMemo(
    () => students.filter((student) => student.beast).sort((a, b) => a.name.localeCompare(b.name)),
    [students]
  );
  const selectedTerritoryAttacker = useMemo(
    () => territoryEligibleStudents.find((student) => student.id === territoryAttackerStudentId) || territoryEligibleStudents[0] || null,
    [territoryEligibleStudents, territoryAttackerStudentId]
  );
  const territoryTargetOptions = useMemo(
    () => territoryEligibleStudents.filter((student) => student.id !== (selectedTerritoryAttacker?.id || 0) && student.overlordStudentId !== selectedTerritoryAttacker?.id),
    [territoryEligibleStudents, selectedTerritoryAttacker]
  );
  const selectedTerritoryTarget = useMemo(
    () => territoryTargetOptions.find((student) => student.id === territoryTargetStudentId) || territoryTargetOptions[0] || null,
    [territoryTargetOptions, territoryTargetStudentId]
  );
  const selectedAttackerGuild = useMemo(() => availableConquestGuilds.find((g) => g.id === conquestAttackerGuildId) || null, [availableConquestGuilds, conquestAttackerGuildId]);
  const eligibleDefenderGuilds = useMemo(() => {
    const attacker = availableConquestGuilds.find((g) => g.id === conquestAttackerGuildId);
    if (!attacker) return [];
    const attackerPower = getGuildTotalPower(attacker, students);
    return availableConquestGuilds.filter((g) => g.id !== attacker.id && isWithinPowerGap(attackerPower, getGuildTotalPower(g, students), 15));
  }, [availableConquestGuilds, conquestAttackerGuildId, students]);
  const selectedDefenderGuild = useMemo(() => eligibleDefenderGuilds.find((g) => g.id === conquestDefenderGuildId) || null, [eligibleDefenderGuilds, conquestDefenderGuildId]);
  const guildById = useMemo(() => {
    const map = new Map<number, Guild>();
    guilds.forEach((g) => map.set(g.id, g));
    return map;
  }, [guilds]);
  const bossReadyGuilds = useMemo(() => activeGuilds.filter((guild) => students.some((student) => student.guildId === guild.id && student.beast)), [activeGuilds, students]);
  const canSpawnBoss = bossReadyGuilds.length >= BOSS_MIN_GUILD_READY && bossReadyGuilds.length === activeGuilds.length && questions.length > 0;
  const bossQuestionPool = useMemo(() => questions.filter((question) => (bossEvent?.questionIds || []).includes(question.id)), [questions, bossEvent]);
  const bossRankingRows = useMemo(() => {
    return [...(bossEvent?.contributions || [])]
      .map((entry) => ({
        ...entry,
        student: students.find((student) => student.id === entry.studentId) || null,
      }))
      .sort((a, b) => b.damage - a.damage || b.correctCount - a.correctCount || ((a.student?.name || "").localeCompare(b.student?.name || "")));
  }, [bossEvent, students]);
  const currentStudent = useMemo(() => students.find((s) => s.id === currentStudentId) || null, [students, currentStudentId]);
  const recentHatchGuilds = useMemo(
    () => activeGuilds.filter((g) => g.level >= 10 && !!g.reachedLevel12At && isRecentTimestamp(g.reachedLevel12At, 15 * 60 * 1000)),
    [activeGuilds]
  );
  const activeAssignment = useMemo(() => assignments.find((a) => a.id === activeAssignmentId) || null, [assignments, activeAssignmentId]);
  const editingMember = useMemo(() => students.find((s) => s.id === memberEditId) || null, [students, memberEditId]);
  const activeQuestions = useMemo(() => {
    if (!activeAssignment) return [];
    return questions.filter((q) => activeAssignment.questionIds.includes(q.id));
  }, [activeAssignment, questions]);
  const studentAssignments = useMemo(() => {
    if (!currentStudent) return [];
    return assignments
      .filter((a) => a.className === currentStudent.className)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [assignments, currentStudent]);
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => questionFilterGroup === "Tất cả" || q.group === questionFilterGroup);
  }, [questions, questionFilterGroup]);
  const classOptions = useMemo(
    () => Array.from(new Set([...DEFAULT_CLASS_SUGGESTIONS, ...students.map((s) => s.className).filter(Boolean), ...questions.map((q) => q.className).filter(Boolean), assignmentClassName, memberClassName, qClassName])).sort(),
    [students, questions, assignmentClassName, memberClassName, qClassName]
  );
  const questionGroupOptions = useMemo(() => Array.from(new Set([...DEFAULT_GROUP_SUGGESTIONS, ...questions.map((q) => q.group).filter(Boolean)])).sort(), [questions]);
  const bossDraftQuestions = useMemo(() => {
    if (!bossDraftQuestionIds.length) return questions;
    const selectedSet = new Set(bossDraftQuestionIds);
    return questions.filter((question) => selectedSet.has(question.id));
  }, [questions, bossDraftQuestionIds]);
  const assignableQuestions = useMemo(() => questions.filter((q) => q.group.trim().toLowerCase() === assignmentGroup.trim().toLowerCase()), [questions, assignmentGroup]);
  const weeklyRanking = useMemo(() => {
    const start = getStartOfWeek();
    const rows = students.map((student) => {
      const mine = submissions.filter((s) => s.studentId === student.id && new Date(s.submittedAt || s.startedAt).getTime() >= start.getTime());
      const totalCorrect = mine.reduce((sum, sub) => sum + getSubmissionStats(sub, assignments, questions).correctCount, 0);
      const totalDurationSeconds = mine.reduce((sum, sub) => sum + getSubmissionStats(sub, assignments, questions).durationSeconds, 0);
      const submissionCount = mine.length;
      return { studentId: student.id, studentName: student.name, className: student.className, guildName: guildById.get(student.guildId)?.name || "-", totalCorrect, totalDurationSeconds, submissionCount, avgDurationSeconds: submissionCount ? Math.round(totalDurationSeconds / submissionCount) : 0 };
    }).filter((x) => x.submissionCount > 0);
    const filtered = rankingClassFilter === "Tất cả" ? rows : rows.filter((x) => x.className === rankingClassFilter);
    return filtered.sort((a, b) => b.totalCorrect - a.totalCorrect || a.avgDurationSeconds - b.avgDurationSeconds || a.studentName.localeCompare(b.studentName));
  }, [students, submissions, assignments, questions, guildById, rankingClassFilter]);
  const monthlyRanking = useMemo(() => {
    const start = getStartOfMonth();
    const rows = students.map((student) => {
      const mine = submissions.filter((s) => s.studentId === student.id && new Date(s.submittedAt || s.startedAt).getTime() >= start.getTime());
      const totalCorrect = mine.reduce((sum, sub) => sum + getSubmissionStats(sub, assignments, questions).correctCount, 0);
      const totalDurationSeconds = mine.reduce((sum, sub) => sum + getSubmissionStats(sub, assignments, questions).durationSeconds, 0);
      const submissionCount = mine.length;
      return { studentId: student.id, studentName: student.name, className: student.className, guildName: guildById.get(student.guildId)?.name || "-", totalCorrect, totalDurationSeconds, submissionCount, avgDurationSeconds: submissionCount ? Math.round(totalDurationSeconds / submissionCount) : 0 };
    }).filter((x) => x.submissionCount > 0);
    const filtered = rankingClassFilter === "Tất cả" ? rows : rows.filter((x) => x.className === rankingClassFilter);
    return filtered.sort((a, b) => b.totalCorrect - a.totalCorrect || a.avgDurationSeconds - b.avgDurationSeconds || a.studentName.localeCompare(b.studentName));
  }, [students, submissions, assignments, questions, guildById, rankingClassFilter]);

  const personalPowerRanking = useMemo(() => {
    return students
      .map((student) => {
        const guild = guildById.get(student.guildId);
        return {
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          guildName: guild?.name || "-",
          totalPoints: student.totalPoints,
          weeklyPoints: student.weeklyPoints,
          power: guild ? beastPower(student, guild) : 0,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || b.power - a.power || a.studentName.localeCompare(b.studentName));
  }, [students, guildById]);

  const combatPowerRanking = useMemo(() => {
    return students
      .map((student) => {
        const guild = guildById.get(student.guildId);
        return {
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          guildName: guild?.name || "-",
          power: guild ? beastPower(student, guild) : 0,
          beastName: student.beast?.species || "Chưa có",
          quality: student.beast?.quality || 0,
          level: student.beast?.level || 0,
        };
      })
      .filter((row) => row.power > 0)
      .sort((a, b) => b.power - a.power || b.quality - a.quality || b.level - a.level || a.studentName.localeCompare(b.studentName));
  }, [students, guildById]);

  const guildRanking = useMemo(() => {
    return activeGuilds
      .map((guild) => {
        const members = students.filter((s) => s.guildId === guild.id);
        const totalPoints = members.reduce((sum, s) => sum + s.totalPoints, 0);
        const totalWeeklyPoints = members.reduce((sum, s) => sum + s.weeklyPoints, 0);
        const totalPower = members.reduce((sum, s) => sum + beastPower(s, guild), 0);
        const rareItemScore = members.reduce((sum, s) => sum + getStudentRareItemScore(s), 0);
        return {
          guildId: guild.id,
          guildName: guild.name,
          level: guild.level,
          memberCount: members.length,
          totalPoints,
          totalWeeklyPoints,
          totalPower,
          rareItemScore,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || b.totalPower - a.totalPower || b.rareItemScore - a.rareItemScore || a.guildName.localeCompare(b.guildName));
  }, [activeGuilds, students]);

  const rareItemRanking = useMemo(() => {
    return students
      .map((student) => {
        const guild = guildById.get(student.guildId);
        const items = [...student.inventory].sort((a, b) => rarityScore(b.rarity) - rarityScore(a.rarity));
        return {
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          guildName: guild?.name || "-",
          rareItemScore: getStudentRareItemScore(student),
          itemCount: student.inventory.length,
          topItems: items.slice(0, 3),
        };
      })
      .filter((row) => row.itemCount > 0)
      .sort((a, b) => b.rareItemScore - a.rareItemScore || b.itemCount - a.itemCount || a.studentName.localeCompare(b.studentName));
  }, [students, guildById]);

  useEffect(() => {
    if (activeGuilds.length > 0 && !activeGuilds.some((g) => g.id === selectedGuildId)) setSelectedGuildId(activeGuilds[0].id);
  }, [activeGuilds, selectedGuildId]);

  useEffect(() => {
    if (!availableConquestGuilds.length) return;
    if (!availableConquestGuilds.some((g) => g.id === conquestAttackerGuildId)) {
      setConquestAttackerGuildId(availableConquestGuilds[0].id);
    }
    if (eligibleDefenderGuilds.length && !eligibleDefenderGuilds.some((g) => g.id === conquestDefenderGuildId)) {
      setConquestDefenderGuildId(eligibleDefenderGuilds[0].id);
    }
  }, [availableConquestGuilds, eligibleDefenderGuilds, conquestAttackerGuildId, conquestDefenderGuildId]);

  useEffect(() => {
    if (territoryEligibleStudents.length && !territoryEligibleStudents.some((student) => student.id === territoryAttackerStudentId)) {
      setTerritoryAttackerStudentId(territoryEligibleStudents[0].id);
    }
  }, [territoryEligibleStudents, territoryAttackerStudentId]);

  useEffect(() => {
    if (territoryTargetOptions.length && !territoryTargetOptions.some((student) => student.id === territoryTargetStudentId)) {
      setTerritoryTargetStudentId(territoryTargetOptions[0].id);
    }
  }, [territoryTargetOptions, territoryTargetStudentId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!canSpawnBoss && !bossSpawnGateOpen) {
      setBossSpawnGateOpen(true);
    }
  }, [hydrated, canSpawnBoss, bossSpawnGateOpen]);

  useEffect(() => {
    if (!hydrated || resolvingConquestRef.current) return;
    const dueBattle = pendingConquestBattles.find((battle) => new Date(battle.executeAt).getTime() <= Date.now());
    if (dueBattle) {
      resolveConquestBattle(dueBattle.id);
    }
  }, [hydrated, pendingConquestBattles, guilds, students]);


  useEffect(() => {
    const dueMatch = pendingDuelMatches.find((match) => new Date(match.executeAt).getTime() <= Date.now());
    if (dueMatch) {
      resolveDuelMatch(dueMatch.id);
    }
  }, [pendingDuelMatches, students, guilds]);

  useEffect(() => {
    if (!currentStudent) return;
    const pendingRaw = localStorage.getItem(PENDING_SUBMIT_KEY);
    if (!pendingRaw) return;
    try {
      const pending: ExamSession = JSON.parse(pendingRaw);
      if (pending.studentId === currentStudent.id && pending.shouldAutoSubmit) {
        autoFinalizeSession(pending, true);
        localStorage.removeItem(PENDING_SUBMIT_KEY);
      }
    } catch {
      localStorage.removeItem(PENDING_SUBMIT_KEY);
    }
  }, [currentStudent]);

  useEffect(() => {
    if (!currentStudent) return;
    const key = `exam-session-${currentStudent.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const session: ExamSession = JSON.parse(raw);
      if (session.shouldAutoSubmit) {
        autoFinalizeSession(session, true);
        localStorage.removeItem(key);
        return;
      }
      const assignment = assignments.find((a) => a.id === session.assignmentId);
      if (!assignment) {
        localStorage.removeItem(key);
        return;
      }
      const remain = computeRemainingSeconds(session.startedAt, assignment.durationMinutes);
      if (remain <= 0) {
        autoFinalizeSession(session, true);
        localStorage.removeItem(key);
        return;
      }
      setActiveAssignmentId(session.assignmentId);
      setExamStartedAt(session.startedAt);
      setStudentAnswers(session.answers || {});
      setTimeLeftSeconds(remain);
      setStudentMessage("Bạn đang tiếp tục bài làm dở.");
    } catch {
      localStorage.removeItem(key);
    }
  }, [assignments, currentStudent]);

  useEffect(() => {
    if (!currentStudent || !activeAssignment || !examStartedAt) return;
    const key = `exam-session-${currentStudent.id}`;
    const session: ExamSession = {
      assignmentId: activeAssignment.id,
      studentId: currentStudent.id,
      startedAt: examStartedAt,
      answers: studentAnswers,
      questionIds: activeAssignment.questionIds,
      shouldAutoSubmit: false,
    };
    localStorage.setItem(key, JSON.stringify(session));
  }, [currentStudent, activeAssignment, examStartedAt, studentAnswers]);

  useEffect(() => {
    if (!activeAssignment || !examStartedAt || !currentStudent) return;
    const tick = () => {
      const remain = computeRemainingSeconds(examStartedAt, activeAssignment.durationMinutes);
      setTimeLeftSeconds(remain);
      if (remain <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        finalizeStudentAssignment(true, "Hết thời gian làm bài, hệ thống đã tự nộp.");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeAssignment, examStartedAt, currentStudent]);

  useEffect(() => {
    if (!currentStudent || !activeAssignment || !examStartedAt) return;
    const handleBeforeUnload = () => {
      const payload: ExamSession = {
        assignmentId: activeAssignment.id,
        studentId: currentStudent.id,
        startedAt: examStartedAt,
        answers: studentAnswers,
        questionIds: activeAssignment.questionIds,
        shouldAutoSubmit: true,
      };
      localStorage.setItem(PENDING_SUBMIT_KEY, JSON.stringify(payload));
      localStorage.setItem(`exam-session-${currentStudent.id}`, JSON.stringify(payload));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentStudent, activeAssignment, examStartedAt, studentAnswers]);


  useEffect(() => {
    if (!currentStudent) return;
    const key = getBossSessionKey(currentStudent.id);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const session: BossBattleSession = JSON.parse(raw);
      if (!bossEvent || session.bossEventId !== bossEvent.id) {
        localStorage.removeItem(key);
        return;
      }
      if (getBossParticipantContribution(bossEvent, currentStudent.id)) {
        localStorage.removeItem(key);
        return;
      }
      if (session.shouldAutoSubmit) {
        finalizeBossBattle(true, session);
        localStorage.removeItem(key);
        return;
      }
      if (!isBossEventOpen(bossEvent)) {
        localStorage.removeItem(key);
        return;
      }
      const remain = computeRemainingSeconds(session.startedAt, bossEvent.durationMinutes);
      if (remain <= 0) {
        finalizeBossBattle(true, session);
        localStorage.removeItem(key);
        return;
      }
      setActiveBossBattleId(session.bossEventId);
      setBossBattleStartedAt(session.startedAt);
      setBossBattleQuestionIds(session.questionIds || bossEvent.questionIds);
      setBossAnswers(session.answers || {});
      setBossTimeLeftSeconds(remain);
      setStudentMessage("Bạn đang tiếp tục bài đánh boss dở.");
    } catch {
      localStorage.removeItem(key);
    }
  }, [currentStudent, bossEvent]);

  useEffect(() => {
    if (!currentStudent || !bossEvent || activeBossBattleId !== bossEvent.id || !bossBattleStartedAt) return;
    const key = getBossSessionKey(currentStudent.id);
    const payload: BossBattleSession = {
      bossEventId: bossEvent.id,
      studentId: currentStudent.id,
      startedAt: bossBattleStartedAt,
      answers: bossAnswers,
      questionIds: bossBattleQuestionIds,
      shouldAutoSubmit: false,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  }, [currentStudent, bossEvent, activeBossBattleId, bossBattleStartedAt, bossAnswers, bossBattleQuestionIds]);

  useEffect(() => {
    if (!currentStudent || !bossEvent || activeBossBattleId !== bossEvent.id || !bossBattleStartedAt) return;
    const tick = () => {
      const remain = computeRemainingSeconds(bossBattleStartedAt, bossEvent.durationMinutes);
      setBossTimeLeftSeconds(remain);
      if (remain <= 0 && !bossAutoSubmittedRef.current) {
        bossAutoSubmittedRef.current = true;
        finalizeBossBattle(true);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [currentStudent, bossEvent, activeBossBattleId, bossBattleStartedAt]);

  useEffect(() => {
    if (!currentStudent || !bossEvent || activeBossBattleId !== bossEvent.id || !bossBattleStartedAt) return;
    const handleBeforeUnload = () => {
      const payload: BossBattleSession = {
        bossEventId: bossEvent.id,
        studentId: currentStudent.id,
        startedAt: bossBattleStartedAt,
        answers: bossAnswers,
        questionIds: bossBattleQuestionIds,
        shouldAutoSubmit: true,
      };
      localStorage.setItem(getBossSessionKey(currentStudent.id), JSON.stringify(payload));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentStudent, bossEvent, activeBossBattleId, bossBattleStartedAt, bossAnswers, bossBattleQuestionIds]);

  function addLog(type: string, message: string) {
    setEventLogs((prev) => [{ id: Date.now() + Math.random(), createdAt: new Date().toISOString(), type, message }, ...prev]);
  }

  function applyTerritoryExpShare(prevStudents: Student[], nextStudents: Student[]) {
    const cloned = nextStudents.map((student) => ({
      ...student,
      beast: student.beast ? { ...student.beast } : student.beast,
    }));
    const byId = new Map<number, Student>();
    cloned.forEach((student) => byId.set(student.id, student));
    const ownerGain = new Map<number, number>();
    const ownerNames = new Map<number, string[]>();

    prevStudents.forEach((before) => {
      const after = byId.get(before.id);
      if (!before.beast || !after?.beast) return;
      const delta = after.beast.exp - before.beast.exp;
      if (delta <= 0) return;
      const ownerId = after.overlordStudentId || before.overlordStudentId;
      if (!ownerId || ownerId === after.id) return;
      const share = Math.floor(delta * TERRITORY_EXP_SHARE_RATE);
      if (share <= 0) return;
      ownerGain.set(ownerId, (ownerGain.get(ownerId) || 0) + share);
      ownerNames.set(ownerId, [...(ownerNames.get(ownerId) || []), after.name]);
    });

    ownerGain.forEach((gain, ownerId) => {
      const owner = byId.get(ownerId);
      if (!owner?.beast) return;
      owner.beast.exp += gain;
      const sources = Array.from(new Set(ownerNames.get(ownerId) || []));
      owner.notice = appendNotice(owner.notice, `Thuộc địa ${sources.join(", ")} vừa nộp ${gain} EXP thú cho bạn.`);
    });

    return cloned;
  }

  function refreshDerived(nextGuilds: Guild[], nextStudents: Student[]) {
    let newGuilds = nextGuilds.map((g) => {
      const info = getGuildLevelInfo(g.exp);
      return { ...g, level: info.level, buffPercent: info.buffPercent };
    });

    let newStudents = nextStudents.map((s) => autoProcessInventory({ ...s }));

    newGuilds.forEach((g) => {
      if (g.level >= 8 && !g.reachedLevel8At) {
        g.reachedLevel8At = new Date().toISOString();
        addLog("guild_level_8", `${g.name} đạt cấp 8 và bắt đầu ấp trứng.`);
      }
      if (g.level >= 10 && !g.reachedLevel12At) {
        g.reachedLevel12At = new Date().toISOString();
        addLog("guild_level_10", `${g.name} đạt cấp 10, trứng đã nở và toàn bộ thành viên nhận thú chiến.`);
      }
    });

    newStudents = newStudents.map((s) => {
      const g = newGuilds.find((x) => x.id === s.guildId);
      if (!g) return s;
      if (g.level >= 10 && (!s.beast || !s.hasBeast)) {
        const beast = createBeast(s, g, newGuilds);
        return { ...s, hasBeast: true, beast };
      }
      if (s.beast) {
        const lv = getBeastLevelInfo(s.beast.exp);
        return { ...s, beast: { ...s.beast, level: lv.level } };
      }
      return s;
    });

    newGuilds = newGuilds.map((g) => {
      const members = newStudents.filter((s) => s.guildId === g.id && s.beast);
      if (members.length === 0) return g;
      const ranked = [...members].sort((a, b) => beastPower(b, g) - beastPower(a, g));
      const leaderId = ranked[0]?.id || null;
      const viceCount = getViceCount(ranked.length);
      const viceIds = ranked.filter((x) => x.id !== leaderId).slice(0, viceCount).map((x) => x.id);
      return { ...g, leaderStudentId: leaderId, viceLeaderStudentIds: viceIds };
    });

    return { guilds: newGuilds, students: newStudents };
  }

  function handleAdminLogin() {
    if (loginUser === ADMIN_USERNAME && loginPass === adminPassword) {
      setRole("admin");
    } else {
      alert("Sai tài khoản hoặc mật khẩu giáo viên");
    }
  }

  function autoFinalizeSession(session: ExamSession, forceSubmit = false) {
    const assignment = assignments.find((a) => a.id === session.assignmentId);
    const student = students.find((s) => s.id === session.studentId);
    if (!assignment || !student) return;
    const existed = submissions.some((sub) => sub.assignmentId === assignment.id && sub.studentId === student.id);
    if (existed) return;

    const picked = questions.filter((q) => session.questionIds.includes(q.id));
    let score = 0;
    picked.forEach((q) => {
      if (session.answers[q.id] === q.correctAnswer) score += getQuestionScore(q);
    });

    const nextStudents = students.map((s) =>
      s.id === student.id
        ? {
            ...s,
            weeklyPoints: s.weeklyPoints + score,
            totalPoints: s.totalPoints + score,
            beast: s.beast ? { ...s.beast, exp: s.beast.exp + Math.floor(score / 2) } : s.beast,
          }
        : s
    );
    const nextGuilds = guilds.map((g) => (g.id === student.guildId ? { ...g, exp: g.exp + (student.beast ? Math.floor(score / 2) : score) } : g));
    const result = refreshDerived(nextGuilds, applyTerritoryExpShare(students, nextStudents));
    setStudents(result.students);
    setGuilds(result.guilds);
    setSubmissions((prev) => [
      {
        id: Date.now() + Math.random(),
        assignmentId: assignment.id,
        studentId: student.id,
        answers: session.answers,
        startedAt: session.startedAt,
        submittedAt: new Date().toISOString(),
        score,
        autoSubmitted: forceSubmit,
      },
      ...prev,
    ]);
    addLog("assignment_submit", `${student.name} ${forceSubmit ? "thoát giữa chừng, hệ thống tự chấm" : "nộp bài"} ${assignment.title} và nhận ${score} điểm.`);

    if (currentStudentId === student.id) {
      setStudentMessage(forceSubmit ? `Bạn đã thoát giữa chừng, hệ thống tự chấm ${score} điểm.` : `Bạn nhận ${score} điểm từ bài làm.`);
      setActiveAssignmentId(null);
      setExamStartedAt(null);
      setStudentAnswers({});
      setTimeLeftSeconds(0);
    }

    localStorage.removeItem(`exam-session-${student.id}`);
    localStorage.removeItem(PENDING_SUBMIT_KEY);
  }

  function handleStudentLogin() {
    const found = students.find((s) => s.username === studentUser && s.password === studentPass);
    if (!found) return alert("Sai tài khoản hoặc mật khẩu học sinh");
    setCurrentStudentId(found.id);
    setRole("student");
    setStudentMessage("");
  }

  function changeAdminPassword() {
    if (oldPass !== adminPassword) return alert("Sai mật khẩu cũ");
    if (newPass.trim().length < 4) return alert("Mật khẩu mới quá ngắn");
    setAdminPassword(newPass.trim());
    setOldPass("");
    setNewPass("");
    alert("Đổi mật khẩu thành công");
  }

  function addGuildExp() {
    const gain = Number(guildExpValue);
    if (!gain || gain <= 0) return alert("EXP không hợp lệ");
    const result = refreshDerived(
      guilds.map((g) => (g.id === guildExpGuildId ? { ...g, exp: g.exp + gain } : g)),
      students
    );
    setGuilds(result.guilds);
    setStudents(result.students);
  }

  function addManualPoints(studentId: number) {
    const delta = Number(pointInputs[studentId] || 0);
    if (!delta) return alert("Điểm không hợp lệ");
    const target = students.find((s) => s.id === studentId);
    if (!target) return;

    const guildDelta = target.beast ? Math.trunc(delta * 0.5) : delta;
    const beastDelta = target.beast ? delta - guildDelta : 0;

    const nextStudents = students.map((s) =>
      s.id === studentId
        ? {
            ...s,
            weeklyPoints: Math.max(0, s.weeklyPoints + delta),
            totalPoints: Math.max(0, s.totalPoints + delta),
            beast: s.beast ? { ...s.beast, exp: Math.max(0, s.beast.exp + beastDelta) } : s.beast,
            notice: delta < 0 ? `Bạn vừa bị trừ ${Math.abs(delta)} điểm.` : s.notice || "",
          }
        : s
    );

    const nextGuilds = guilds.map((g) =>
      g.id === target.guildId ? { ...g, exp: Math.max(0, g.exp + guildDelta) } : g
    );

    const result = refreshDerived(nextGuilds, applyTerritoryExpShare(students, nextStudents));
    setGuilds(result.guilds);
    setStudents(result.students);
    setPointInputs((prev) => ({ ...prev, [studentId]: "" }));

    addLog(
      "manual_point",
      delta > 0
        ? (target.beast
            ? `${target.name} được cộng ${delta} điểm: một phần vào quân đoàn, một phần vào EXP thú.`
            : `${target.name} chưa có thú nên ${delta} điểm cộng hết vào quân đoàn.`)
        : `${target.name} bị trừ ${Math.abs(delta)} điểm.`
    );
  }

  function runArena() {
    const fighters: ArenaFighter[] = [];
    activeGuilds.forEach((g) => {
      students.filter((s) => s.guildId === g.id && s.beast).forEach((s) => {
        fighters.push({ studentId: s.id, studentName: s.name, guildId: g.id, guildName: g.name, element: s.beast!.element, power: beastPower(s, g), wins: 0, losses: 0 });
      });
    });
    if (fighters.length < 2) return alert("Chưa đủ thú để mở đấu trường.");

    fighters.forEach((me) => {
      for (let round = 0; round < 10; round++) {
        const pool = fighters.filter((x) => x.studentId !== me.studentId);
        const enemy = pool[Math.floor(Math.random() * pool.length)];
        const meStudent = students.find((s) => s.id === me.studentId)!;
        const enStudent = students.find((s) => s.id === enemy.studentId)!;
        const meIgnore = equippedBonus(meStudent).ignoreCounterPercent;
        const enIgnore = equippedBonus(enStudent).ignoreCounterPercent;
        const meMod = getElementModifier(me.element, enemy.element, meIgnore);
        const enMod = getElementModifier(enemy.element, me.element, enIgnore);
        const lowUpset = me.power < enemy.power && enemy.power - me.power <= 120 ? Math.random() * 18 : 0;
        const enUpset = enemy.power < me.power && me.power - enemy.power <= 120 ? Math.random() * 18 : 0;
        const meRoll = me.power * meMod + Math.random() * 30 + lowUpset;
        const enRoll = enemy.power * enMod + Math.random() * 30 + enUpset;
        if (meRoll >= enRoll) me.wins += 1;
        else me.losses += 1;
      }
    });

    fighters.sort((a, b) => (b.wins !== a.wins ? b.wins - a.wins : a.power - b.power));
    const rankCaps: Rarity[] = ["Cam", "Tím", "Đỏ"];
    let nextStudents = [...students];
    [0, 1, 2].forEach((rank) => {
      const fighter = fighters[rank];
      if (!fighter) return;
      const itemCount = rank === 0 ? 5 : rank === 1 ? 3 : 2;
      const beastExpReward = rank === 0 ? 15 : rank === 1 ? 9 : 6;
      const rewardStudentRef = students.find((s) => s.id === fighter.studentId);
      const rewardBeastLevel = rewardStudentRef?.beast?.level || 1;
      const rewardGuildLevel = guilds.find((g) => g.id === fighter.guildId)?.level || 1;
      const rewards = Array.from({ length: itemCount }, () => generateRewardItem(rankCaps[rank], rewardBeastLevel, rewardGuildLevel));
      nextStudents = nextStudents.map((s) =>
        s.id === fighter.studentId ? autoProcessInventory({ ...rewardStudent(s, rewards), beast: s.beast ? { ...s.beast, exp: s.beast.exp + beastExpReward } : s.beast }) : s
      );
      addLog("arena_reward", `${fighter.studentName} hạng ${rank + 1}: nhận ${itemCount} đồ và ${beastExpReward} EXP thú.`);
    });

    const result = refreshDerived(guilds, applyTerritoryExpShare(students, nextStudents));
    setStudents(result.students);
    setGuilds(result.guilds);
    setArenaRuns((prev) => [{ id: Date.now(), createdAt: new Date().toISOString(), ranking: fighters }, ...prev]);
    addLog("arena_run", `Đấu trường hoàn tất: Top 1 ${fighters[0]?.studentName || "-"}, Top 2 ${fighters[1]?.studentName || "-"}, Top 3 ${fighters[2]?.studentName || "-"}.`);
  }


  function getGuildBattleSnapshot(guild: Guild, sourceStudents = students): GuildBattleSnapshot {
    const members = sourceStudents
      .filter((s) => s.guildId === guild.id && s.beast)
      .map((s) => ({ studentId: s.id, name: s.name, power: beastPower(s, guild) }))
      .sort((a, b) => b.power - a.power);
    return {
      guildId: guild.id,
      guildName: guild.name,
      totalPower: members.reduce((sum, x) => sum + x.power, 0),
      memberCount: members.length,
      strongestName: members[0]?.name || "-",
      strongestPower: members[0]?.power || 0,
      weakestName: members[members.length - 1]?.name || "-",
      weakestPower: members[members.length - 1]?.power || 0,
    };
  }

  function applyGuildRolePenalty(targetStudents: Student[], targetGuild: Guild, leaderPercent: number, vicePercent: number) {
    return targetStudents.map((student) => {
      if (student.guildId !== targetGuild.id || !student.beast) return student;
      const isLeader = targetGuild.leaderStudentId === student.id;
      const isVice = targetGuild.viceLeaderStudentIds.includes(student.id);
      if (!isLeader && !isVice) return student;
      const penaltyPercent = isLeader ? leaderPercent : vicePercent;
      const loss = Math.floor(student.beast.exp * penaltyPercent / 100);
      return { ...student, beast: { ...student.beast, exp: Math.max(0, student.beast.exp - loss) } };
    });
  }

  function simulateConquestBattle(attacker: Guild, defender: Guild, sourceStudents: Student[]) {
    const atkTeam = sourceStudents.filter((s) => s.guildId === attacker.id && s.beast);
    const defTeam = sourceStudents.filter((s) => s.guildId === defender.id && s.beast);
    let attackerWins = 0;
    let defenderWins = 0;
    const rounds = Math.max(3, Math.min(7, Math.min(atkTeam.length, defTeam.length)));
    for (let r = 0; r < rounds; r++) {
      const a = atkTeam[r % atkTeam.length];
      const d = defTeam[r % defTeam.length];
      const aStats = beastStats(a)!;
      const dStats = beastStats(d)!;
      let aHp = aStats.hp;
      let dHp = dStats.hp;
      for (let turn = 0; turn < 8; turn++) {
        const aMod = getElementModifier(a.beast!.element, d.beast!.element, equippedBonus(a).ignoreCounterPercent);
        const dMod = getElementModifier(d.beast!.element, a.beast!.element, equippedBonus(d).ignoreCounterPercent);
        dHp -= Math.max(1, (aStats.atk - dStats.def * 0.35) * aMod);
        aHp -= Math.max(1, (dStats.atk - aStats.def * 0.35) * dMod);
        aHp = Math.min(aStats.hp, aHp + aStats.hp * (aStats.healPercent / 100));
        dHp = Math.min(dStats.hp, dHp + dStats.hp * (dStats.healPercent / 100));
        if (aHp <= 0 || dHp <= 0) break;
      }
      if (aHp >= dHp) attackerWins += 1;
      else defenderWins += 1;
    }
    return { attackerWins, defenderWins, rounds };
  }

  function resolveConquestBattle(battleId: number) {
    if (resolvingConquestRef.current) return;
    const battle = conquestBattles.find((x) => x.id === battleId && !x.resolvedAt);
    if (!battle) return;

    const attacker = guilds.find((g) => g.id === battle.attackerGuildId && !g.mergedIntoGuildId);
    const defender = guilds.find((g) => g.id === battle.defenderGuildId && !g.mergedIntoGuildId);
    if (!attacker || !defender) {
      setConquestBattles((prev) => prev.map((x) => x.id === battleId ? { ...x, resolvedAt: new Date().toISOString(), resultMessage: "Trận chiến bị hủy vì một trong hai quân đoàn không còn hợp lệ." } : x));
      return;
    }

    const atkTeam = students.filter((s) => s.guildId === attacker.id && s.beast);
    const defTeam = students.filter((s) => s.guildId === defender.id && s.beast);
    if (!atkTeam.length || !defTeam.length) {
      setConquestBattles((prev) => prev.map((x) => x.id === battleId ? { ...x, resolvedAt: new Date().toISOString(), resultMessage: "Trận chiến bị hủy vì một trong hai bên không còn đủ thú để tham chiến." } : x));
      return;
    }

    resolvingConquestRef.current = true;
    const { attackerWins, defenderWins, rounds } = simulateConquestBattle(attacker, defender, students);
    const attackerWon = attackerWins >= defenderWins;
    let nextStudents = [...students];
    let nextGuilds = [...guilds];
    let resultMessage = "";

    if (attackerWon) {
      nextStudents = applyGuildRolePenalty(nextStudents, defender, 5, 3);
      nextStudents = nextStudents.map((s) => s.guildId === defender.id ? { ...s, guildId: attacker.id } : s);
      nextGuilds = nextGuilds.map((g) => g.id === defender.id ? { ...g, mergedIntoGuildId: attacker.id } : g);
      resultMessage = `${attacker.name} thắng ${defender.name} (${attackerWins} - ${defenderWins}) sau ${rounds} lượt. Quân đoàn ${defender.name} bị sáp nhập vào ${attacker.name}. Thủ lĩnh ${defender.name} mất 5% EXP thú, phó thủ lĩnh mất 3% EXP thú trước khi sáp nhập.`;
    } else {
      nextStudents = applyGuildRolePenalty(nextStudents, attacker, 10, 5);
      resultMessage = `${attacker.name} tấn công thất bại trước ${defender.name} (${attackerWins} - ${defenderWins}) sau ${rounds} lượt. Không có quân đoàn nào bị sáp nhập. Thủ lĩnh ${attacker.name} mất 10% EXP thú, phó thủ lĩnh mất 5% EXP thú.`;
    }

    const refreshed = refreshDerived(nextGuilds, nextStudents);
    setStudents(refreshed.students);
    setGuilds(refreshed.guilds);
    setConquestBattles((prev) => prev.map((x) => x.id === battleId ? {
      ...x,
      resolvedAt: new Date().toISOString(),
      winnerGuildId: attackerWon ? attacker.id : defender.id,
      loserGuildId: attackerWon ? defender.id : attacker.id,
      attackerWins,
      defenderWins,
      resultMessage,
    } : x));
    addLog("conquest_result", resultMessage);
    resolvingConquestRef.current = false;
  }

  function runConquest(attackerGuildId = conquestAttackerGuildId, defenderGuildId = conquestDefenderGuildId) {
    const eligibleGuilds = activeGuilds.filter((g) => students.some((s) => s.guildId === g.id && s.beast));
    if (eligibleGuilds.length < 2) return alert("Chưa đủ quân đoàn có thú để chinh phục.");
    if (attackerGuildId === defenderGuildId) return alert("Hãy chọn 2 quân đoàn khác nhau để ghép cặp.");
    if (pendingConquestBattles.some((battle) => !battle.resolvedAt && (battle.attackerGuildId === attackerGuildId || battle.defenderGuildId === attackerGuildId || battle.attackerGuildId === defenderGuildId || battle.defenderGuildId === defenderGuildId))) {
      return alert("Một trong hai quân đoàn này đang có lịch chinh phục chờ diễn ra.");
    }

    const attacker = eligibleGuilds.find((g) => g.id === attackerGuildId);
    const defender = eligibleDefenderGuilds.find((g) => g.id === defenderGuildId);
    if (!attacker || !defender) return alert("Bên phòng thủ phải có lực chiến quân đoàn chênh không quá 15% so với bên tấn công.");

    const attackerSnapshot = getGuildBattleSnapshot(attacker);
    const defenderSnapshot = getGuildBattleSnapshot(defender);
    if (!attackerSnapshot.memberCount || !defenderSnapshot.memberCount) return alert("Hai quân đoàn phải đều có thú mới có thể chinh phục.");

    const announcedAt = new Date();
    const executeAt = new Date(announcedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const newBattle: ConquestBattle = {
      id: Date.now(),
      attackerGuildId: attacker.id,
      defenderGuildId: defender.id,
      attackerSnapshot,
      defenderSnapshot,
      announcedAt: announcedAt.toISOString(),
      executeAt: executeAt.toISOString(),
    };
    setConquestBattles((prev) => [newBattle, ...prev]);
    addLog("conquest_announce", `${attacker.name} phát động chinh phục ${defender.name} (chênh lực chiến ${getPowerCompareText(attackerSnapshot.totalPower, defenderSnapshot.totalPower)}). Trận chiến sẽ diễn ra lúc ${formatDateTime(newBattle.executeAt)}.`);
  }


  function resolveDuelMatch(matchId: number) {
    const match = duelMatches.find((x) => x.id === matchId && !x.resolvedAt);
    if (!match) return;
    const leftStudent = students.find((s) => s.id === match.leftStudentId);
    const rightStudent = students.find((s) => s.id === match.rightStudentId);
    if (!leftStudent || !rightStudent) return;

    const leftGuild = guilds.find((g) => g.id === leftStudent.guildId);
    const rightGuild = guilds.find((g) => g.id === rightStudent.guildId);
    if (!leftGuild || !rightGuild) return;

    const leftPower = beastPower(leftStudent, leftGuild);
    const rightPower = beastPower(rightStudent, rightGuild);
    const leftRoll = leftPower + Math.random() * 40;
    const rightRoll = rightPower + Math.random() * 40;
    const winner = leftRoll >= rightRoll ? leftStudent : rightStudent;
    const loser = winner.id === leftStudent.id ? rightStudent : leftStudent;
    const winnerPower = winner.id === leftStudent.id ? leftPower : rightPower;
    const loserPower = winner.id === leftStudent.id ? rightPower : leftPower;
    const underdogWin = winnerPower < loserPower;
    const prestigeAwarded = underdogWin ? PRESTIGE_PER_UNDERDOG_WIN : 0;

    const nextStudents = students.map((student) => {
      if (student.id === winner.id) {
        return {
          ...student,
          prestigePoints: (student.prestigePoints || 0) + prestigeAwarded,
          notice: underdogWin
            ? `Bạn thắng kèo đơn đấu và nhận ${prestigeAwarded} điểm uy danh.`
            : `Bạn thắng đơn đấu nhưng không nhận uy danh vì lực chiến không thấp hơn đối thủ.`,
        };
      }
      if (student.id === loser.id) {
        return {
          ...student,
          notice: `Bạn thua đơn đấu trước ${winner.name}.`,
        };
      }
      return student;
    });

    const refreshed = refreshDerived(guilds, nextStudents);
    setStudents(refreshed.students);
    setGuilds(refreshed.guilds);
    const resultMessage = `${winner.name} thắng ${loser.name}. ${underdogWin ? `Người thắng có lực chiến thấp hơn nên nhận ${prestigeAwarded} điểm uy danh.` : "Không có điểm uy danh vì người thắng không phải kèo dưới."}`;
    setDuelMatches((prev) => prev.map((item) => item.id === matchId ? {
      ...item,
      resolvedAt: new Date().toISOString(),
      winnerStudentId: winner.id,
      loserStudentId: loser.id,
      prestigeAwarded,
      resultMessage,
    } : item));
    addLog("duel_result", resultMessage);
  }

  function createWeeklyDuelMatches() {
    const fighters = students
      .map((student) => {
        const guild = guildById.get(student.guildId);
        return guild && student.beast ? { studentId: student.id, power: beastPower(student, guild) } : null;
      })
      .filter(Boolean) as { studentId: number; power: number }[];

    const busyIds = new Set(pendingDuelMatches.flatMap((m) => [m.leftStudentId, m.rightStudentId]));
    const freeFighters = fighters
      .filter((f) => !busyIds.has(f.studentId))
      .sort((a, b) => a.power - b.power);

    const schedule = getNextMatchScheduleLabel(new Date());
    const newMatches: DuelMatch[] = [];
    const used = new Set<number>();

    for (let i = 0; i < freeFighters.length; i++) {
      const left = freeFighters[i];
      if (used.has(left.studentId)) continue;
      for (let j = i + 1; j < freeFighters.length; j++) {
        const right = freeFighters[j];
        if (used.has(right.studentId)) continue;
        if (isWithinPowerGap(left.power, right.power, 15)) {
          used.add(left.studentId);
          used.add(right.studentId);
          newMatches.push({
            id: Date.now() + i * 100 + j,
            leftStudentId: left.studentId,
            rightStudentId: right.studentId,
            leftPower: left.power,
            rightPower: right.power,
            announcedAt: new Date().toISOString(),
            executeAt: schedule.executeAt,
            scheduleLabel: schedule.label,
          });
          break;
        }
      }
    }

    if (!newMatches.length) {
      alert("Hiện chưa có cặp đơn đấu nào thỏa điều kiện lực chiến chênh không quá 15%.");
      return;
    }

    setDuelMatches((prev) => [...newMatches, ...prev]);
    addLog("duel_schedule", `Đã ghép ${newMatches.length} cặp đơn đấu theo lịch ${schedule.label}.`);
  }

  function clearQuestionForm() {
    setQuestionEditId(null);
    setQQuestion("");
    setQA("");
    setQB("");
    setQC("");
    setQD("");
    setQCorrect("A");
    setQDiff("Dễ");
    setQClassName("");
    setQGroup("Bộ chung");
    setQImageUrl("");
  }

  function addQuestion() {
    if (!qQuestion.trim() || !qA.trim() || !qB.trim() || !qC.trim() || !qD.trim()) return alert("Nhập đủ nội dung câu hỏi");
    const payload: Question = {
      id: questionEditId || Date.now(),
      question: qQuestion.trim(),
      optionA: qA.trim(),
      optionB: qB.trim(),
      optionC: qC.trim(),
      optionD: qD.trim(),
      correctAnswer: qCorrect,
      difficulty: "Dễ",
      className: "",
      group: qGroup.trim() || "Bộ chung",
      imageUrl: qImageUrl.trim(),
    };
    setQuestions((prev) => {
      if (questionEditId) return prev.map((q) => (q.id === questionEditId ? payload : q));
      return [payload, ...prev];
    });
    addLog(questionEditId ? "question_update" : "question_add", `${questionEditId ? "Cập nhật" : "Thêm"} câu hỏi nhóm ${payload.group}.`);
    clearQuestionForm();
  }

  function editQuestion(question: Question) {
    setQuestionEditId(question.id);
    setQQuestion(question.question);
    setQA(question.optionA);
    setQB(question.optionB);
    setQC(question.optionC);
    setQD(question.optionD);
    setQCorrect(question.correctAnswer);
    setQDiff("Dễ");
    setQClassName("");
    setQGroup(question.group);
    setQImageUrl(question.imageUrl || "");
    setTab("questions");
  }

  async function handleQuestionImageUpload(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Hãy chọn file ảnh");
      return;
    }
    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Ảnh quá lớn, hãy chọn file dưới 4MB");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setQImageUrl(dataUrl);
    } catch {
      alert("Không đọc được file ảnh");
    }
  }

  function importQuestions() {
    const parsed = parseQuestionImport(importText);
    if (!parsed.length) return alert("Không đọc được dữ liệu import");
    setQuestions((prev) => [...parsed.map((x, idx) => ({ ...x, id: Date.now() + idx })), ...prev]);
    setImportText("");
    addLog("question_import", `Đã import ${parsed.length} câu hỏi.`);
  }


  async function handleQuestionImportFile(file?: File | null) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const isTextFile = lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt");
    const isExcelFile = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    if (!isTextFile && !isExcelFile) {
      alert("Hãy chọn file Excel, CSV, TSV hoặc TXT");
      return;
    }
    try {
      let content = "";
      if (isExcelFile) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, { header: 1, defval: "" });
        content = rows
          .map((row) =>
            (row || [])
              .map((cell) => {
                const value = cell == null ? "" : String(cell);
                return value.replaceAll("\r\n", " ").replaceAll("\n", " ").replaceAll("\r", " ").trim();
              })
              .join("\t")
          )
          .join("\n");
      } else {
        content = await file.text();
      }

      setImportText(content);
      const parsed = parseQuestionImport(content);
      if (!parsed.length) {
        alert("File không đúng định dạng import.");
        return;
      }
      setQuestions((prev) => [...parsed.map((x, idx) => ({ ...x, id: Date.now() + idx })), ...prev]);
      addLog("question_import", `Đã import ${parsed.length} câu hỏi từ file ${file.name}.`);
    } catch {
      alert("Không đọc được file import");
    }
  }

  function clearAssignmentForm() {
    setAssignmentEditId(null);
    setAssignmentTitle("");
    setAssignmentClassName("6A");
    setAssignmentGroup("Bộ chung");
    setAssignmentQuestionIds([]);
    setAssignmentStartTime(toInputDateTimeValue(new Date().toISOString()));
    setAssignmentEndTime(toInputDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()));
    setAssignmentDuration("20");
    setAssignmentStatus("published");
  }

  function saveAssignment() {
    if (!assignmentTitle.trim()) return alert("Nhập tên bài tập");
    if (!assignmentQuestionIds.length) return alert("Chọn ít nhất 1 câu hỏi");
    const startIso = localInputToIso(assignmentStartTime);
    const endIso = localInputToIso(assignmentEndTime);
    const duration = Number(assignmentDuration);
    if (!startIso || !endIso) return alert("Thời gian không hợp lệ");
    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) return alert("Thời gian kết thúc phải lớn hơn thời gian bắt đầu");
    if (!duration || duration <= 0) return alert("Thời gian làm bài không hợp lệ");

    const payload: Assignment = {
      id: assignmentEditId || Date.now(),
      title: assignmentTitle.trim(),
      className: assignmentClassName,
      group: assignmentGroup,
      questionIds: assignmentQuestionIds,
      startTime: startIso,
      endTime: endIso,
      durationMinutes: duration,
      status: assignmentStatus,
      createdAt: assignmentEditId ? assignments.find((a) => a.id === assignmentEditId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
    };

    setAssignments((prev) => {
      if (assignmentEditId) return prev.map((a) => (a.id === assignmentEditId ? payload : a));
      return [payload, ...prev];
    });
    addLog("assignment_save", `${assignmentEditId ? "Cập nhật" : "Tạo"} bài tập ${payload.title} cho lớp ${payload.className}.`);
    clearAssignmentForm();
  }

  function editAssignment(assignment: Assignment) {
    setAssignmentEditId(assignment.id);
    setAssignmentTitle(assignment.title);
    setAssignmentClassName(assignment.className);
    setAssignmentGroup(assignment.group);
    setAssignmentQuestionIds(assignment.questionIds);
    setAssignmentStartTime(toInputDateTimeValue(assignment.startTime));
    setAssignmentEndTime(toInputDateTimeValue(assignment.endTime));
    setAssignmentDuration(String(assignment.durationMinutes));
    setAssignmentStatus(assignment.status);
    setTab("assignments");
  }

  function deleteAssignment(id: number) {
    const assignment = assignments.find((a) => a.id === id);
    if (!assignment) return;
    if (submissions.some((s) => s.assignmentId === id)) {
      alert("Bài tập đã có bài nộp, không nên xóa.");
      return;
    }
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    addLog("assignment_delete", `Đã xóa bài tập ${assignment.title}.`);
  }

  function startAssignment(assignment: Assignment) {
    if (!currentStudent) return;
    const existed = submissions.find((s) => s.assignmentId === assignment.id && s.studentId === currentStudent.id);
    if (existed) return alert("Bạn đã làm bài này rồi.");
    if (!isAssignmentOpen(assignment)) return alert("Bài tập chưa mở hoặc đã đóng.");
    autoSubmittedRef.current = false;
    setActiveAssignmentId(assignment.id);
    setExamStartedAt(new Date().toISOString());
    const initialAnswers: AnswerMap = {};
    assignment.questionIds.forEach((id) => { initialAnswers[id] = ""; });
    setStudentAnswers(initialAnswers);
    setStudentMessage("");
  }

  function finalizeStudentAssignment(forceSubmit = false, customMessage?: string) {
    if (!currentStudent || !activeAssignment || !examStartedAt) return;
    const existed = submissions.some((sub) => sub.assignmentId === activeAssignment.id && sub.studentId === currentStudent.id);
    if (existed) {
      setActiveAssignmentId(null);
      setExamStartedAt(null);
      setStudentAnswers({});
      return;
    }
    const picked = questions.filter((q) => activeAssignment.questionIds.includes(q.id));
    let score = 0;
    picked.forEach((q) => {
      if (studentAnswers[q.id] === q.correctAnswer) score += getQuestionScore(q);
    });

    const nextStudents = students.map((s) =>
      s.id === currentStudent.id
        ? {
            ...s,
            weeklyPoints: s.weeklyPoints + score,
            totalPoints: s.totalPoints + score,
            beast: s.beast ? { ...s.beast, exp: s.beast.exp + Math.floor(score / 2) } : s.beast,
          }
        : s
    );
    const nextGuilds = guilds.map((g) => (g.id === currentStudent.guildId ? { ...g, exp: g.exp + (currentStudent.beast ? Math.floor(score / 2) : score) } : g));
    const result = refreshDerived(nextGuilds, applyTerritoryExpShare(students, nextStudents));
    setStudents(result.students);
    setGuilds(result.guilds);
    setSubmissions((prev) => [
      {
        id: Date.now() + Math.random(),
        assignmentId: activeAssignment.id,
        studentId: currentStudent.id,
        answers: studentAnswers,
        startedAt: examStartedAt,
        submittedAt: new Date().toISOString(),
        score,
        autoSubmitted: forceSubmit,
      },
      ...prev,
    ]);

    setStudentMessage(customMessage || (forceSubmit ? `Bạn đã thoát giữa chừng. Hệ thống tự chấm ${score} điểm.` : `Bạn nhận ${score} điểm từ bài làm.`));
    addLog("assignment_submit", `${currentStudent.name} ${forceSubmit ? "tự nộp" : "nộp"} bài ${activeAssignment.title} với ${score} điểm.`);
    setActiveAssignmentId(null);
    setExamStartedAt(null);
    setStudentAnswers({});
    setTimeLeftSeconds(0);
    autoSubmittedRef.current = false;
    localStorage.removeItem(`exam-session-${currentStudent.id}`);
    localStorage.removeItem(PENDING_SUBMIT_KEY);
  }

  
  function addGuild() {
    const name = guildNameInput.trim();
    if (!name) return alert("Nhập tên quân đoàn");
    if (guilds.some((g) => g.name.trim().toLowerCase() === name.toLowerCase() && !g.mergedIntoGuildId)) return alert("Tên quân đoàn đã tồn tại");
    const newGuild: Guild = { id: Date.now(), name, exp: 0, level: 1, buffPercent: 0, viceLeaderStudentIds: [], leaderStudentId: null };
    setGuilds((prev) => [...prev, newGuild]);
    setGuildNameInput("");
    setMemberGuildId(newGuild.id);
    addLog("guild_add", `Đã thêm quân đoàn ${name}.`);
  }

  function deleteGuild(id: number) {
    const guild = guilds.find((g) => g.id === id);
    if (!guild) return;
    const memberCount = students.filter((s) => s.guildId === id).length;
    if (memberCount > 0) return alert("Quân đoàn còn thành viên, hãy giải tán hoặc chuyển hết thành viên trước khi xóa.");
    setGuilds((prev) => prev.filter((g) => g.id !== id));
    addLog("guild_delete", `Đã xóa quân đoàn ${guild.name}.`);
  }

  function dissolveGuild() {
    if (dissolveFromGuildId === dissolveToGuildId) return alert("Chọn 2 quân đoàn khác nhau");
    const fromGuild = guilds.find((g) => g.id === dissolveFromGuildId);
    const toGuild = guilds.find((g) => g.id === dissolveToGuildId);
    if (!fromGuild || !toGuild) return alert("Thiếu quân đoàn để giải tán");
    const movedCount = students.filter((s) => s.guildId === dissolveFromGuildId).length;
    const nextStudents = students.map((s) => s.guildId === dissolveFromGuildId ? { ...s, guildId: dissolveToGuildId } : s);
    const nextGuilds = guilds.map((g) => g.id === dissolveFromGuildId ? { ...g, mergedIntoGuildId: dissolveToGuildId, leaderStudentId: null, viceLeaderStudentIds: [] } : g);
    const result = refreshDerived(nextGuilds, nextStudents);
    setGuilds(result.guilds);
    setStudents(result.students);
    addLog("guild_dissolve", `Giải tán ${fromGuild.name}, chuyển ${movedCount} thành viên sang ${toGuild.name}.`);
  }

  function clearMemberForm() {
    setMemberEditId(null);
    setMemberName("");
    setMemberUsername("");
    setMemberPassword("123456");
    setMemberClassName("6A");
    setMemberGuildId(activeGuilds[0]?.id || 1);
    setMemberAvatarUrl("");
  }

  function addMember() {
    const name = memberName.trim();
    const username = memberUsername.trim();
    const password = memberPassword.trim();
    if (!name || !username || !password) return alert("Nhập đủ thông tin thành viên");
    if (students.some((s) => s.id !== memberEditId && s.username.trim().toLowerCase() === username.toLowerCase())) return alert("Tên đăng nhập đã tồn tại");
    const targetGuild = guilds.find((g) => g.id === memberGuildId && !g.mergedIntoGuildId);
    if (!targetGuild) return alert("Quân đoàn không hợp lệ");
    if (memberEditId) {
      const current = students.find((s) => s.id === memberEditId);
      if (!current) return;
      const updatedStudents = students.map((s) => s.id === memberEditId ? { ...s, name, username, password, className: memberClassName, guildId: memberGuildId, avatarUrl: memberAvatarUrl } : s);
      const result = refreshDerived(guilds, updatedStudents);
      setStudents(result.students);
      setGuilds(result.guilds);
      addLog("member_update", `Đã cập nhật học sinh ${name}.`);
      clearMemberForm();
      return;
    }
    const payload: Student = {
      id: Date.now(),
      name,
      username,
      password,
      className: memberClassName,
      guildId: memberGuildId,
      weeklyPoints: 0,
      totalPoints: 0,
      prestigePoints: 0,
      hasBeast: false,
      beast: null,
      inventory: [],
      equipped: {},
      equipmentStrength: {},
      avatarUrl: memberAvatarUrl,
      notice: "",
    };
    const result = refreshDerived(guilds, [...students, payload]);
    setStudents(result.students);
    setGuilds(result.guilds);
    clearMemberForm();
    addLog("member_add", `Đã thêm học sinh ${name} vào quân đoàn ${targetGuild.name}.`);
  }

  function editMember(student: Student) {
    setMemberEditId(student.id);
    setMemberName(student.name);
    setMemberUsername(student.username);
    setMemberPassword(student.password);
    setMemberClassName(student.className);
    setMemberGuildId(student.guildId);
    setMemberAvatarUrl(student.avatarUrl || "");
    setTab("students");
  }

  async function handleMemberAvatarUpload(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Hãy chọn file ảnh");
    if (file.size > 4 * 1024 * 1024) return alert("Ảnh đại diện cần nhỏ hơn 4MB");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setMemberAvatarUrl(dataUrl);
    } catch {
      alert("Không đọc được ảnh đại diện");
    }
  }

  function removeMember(studentId: number) {
    const target = students.find((s) => s.id === studentId);
    if (!target) return;
    const guild = guilds.find((g) => g.id === target.guildId);
    const remainingStudents = students.filter((s) => s.id !== studentId);
    const result = refreshDerived(guilds, remainingStudents);
    setGuilds(result.guilds);
    setStudents(result.students);
    addLog("member_delete", `Đã xóa thành viên ${target.name}${guild ? ` khỏi quân đoàn ${guild.name}` : ""}.`);
  }

function launchTerritoryRaid() {
    const attacker = students.find((student) => student.id === territoryAttackerStudentId && student.beast);
    const target = students.find((student) => student.id === territoryTargetStudentId && student.beast);
    if (!attacker || !target) return alert("Hãy chọn 2 học sinh đều đã có thú.");
    if (attacker.id === target.id) return alert("Không thể tự bắt chính mình làm thuộc địa.");
    if (target.overlordStudentId === attacker.id) return alert("Người này đã là thuộc địa của bạn.");

    const ownedCount = students.filter((student) => student.overlordStudentId === attacker.id).length;
    if (ownedCount >= MAX_TERRITORIES_PER_STUDENT) return alert(`Mỗi người chỉ được có tối đa ${MAX_TERRITORIES_PER_STUDENT} thuộc địa.`);

    const raidsThisWeek = territoryRaids.filter((raid) => raid.attackerStudentId === attacker.id && getWeekKeyFromIso(raid.announcedAt) === getWeekKeyFromIso());
    if (raidsThisWeek.length >= MAX_TERRITORY_RAID_PER_WEEK) {
      return alert(`Mỗi tuần chỉ được đánh / cướp tối đa ${MAX_TERRITORY_RAID_PER_WEEK} thuộc địa.`);
    }

    const previousOwner = target.overlordStudentId ? students.find((student) => student.id === target.overlordStudentId) || null : null;
    const defender = previousOwner?.beast ? previousOwner : target;
    if (!defender?.beast) return alert("Đối tượng phòng thủ không hợp lệ.");

    const attackerGuild = guildById.get(attacker.guildId);
    const defenderGuild = guildById.get(defender.guildId);
    if (!attackerGuild || !defenderGuild) return alert("Thiếu quân đoàn để tính lực chiến.");

    const attackerPower = beastPower(attacker, attackerGuild);
    const defenderPower = beastPower(defender, defenderGuild);
    const attackerRoll = attackerPower + Math.random() * 40;
    const defenderRoll = defenderPower + Math.random() * 40;
    const success = attackerRoll >= defenderRoll;

    const nextStudents = students.map((student) => {
      if (student.id === attacker.id) {
        return {
          ...student,
          notice: appendNotice(student.notice, success ? `Bạn đã bắt ${target.name} làm thuộc địa.` : `Bạn tấn công thuộc địa của ${target.name} nhưng thất bại trước ${defender.name}.`),
        };
      }
      if (student.id === target.id) {
        return {
          ...student,
          overlordStudentId: success ? attacker.id : student.overlordStudentId || null,
          notice: appendNotice(student.notice, success ? `${attacker.name} đã bắt bạn làm thuộc địa.` : `${defender.name} vừa bảo vệ bạn khỏi cuộc cướp thuộc địa của ${attacker.name}.`),
        };
      }
      if (previousOwner && student.id === previousOwner.id) {
        return {
          ...student,
          notice: appendNotice(student.notice, success ? `${attacker.name} đã đánh bại bạn và cướp mất thuộc địa ${target.name}.` : `Bạn đã giữ được thuộc địa ${target.name} trước ${attacker.name}.`),
        };
      }
      return student;
    });

    const refreshed = refreshDerived(guilds, nextStudents);
    setStudents(refreshed.students);
    setGuilds(refreshed.guilds);

    const resultMessage = success
      ? previousOwner
        ? `${attacker.name} thắng ${previousOwner.name} và cướp ${target.name} về làm thuộc địa.`
        : `${attacker.name} đánh bại ${target.name} và bắt làm thuộc địa.`
      : `${attacker.name} thất bại trước ${defender.name}, không cướp được thuộc địa ${target.name}.`;

    setTerritoryRaids((prev) => [{
      id: Date.now(),
      attackerStudentId: attacker.id,
      targetStudentId: target.id,
      defenderStudentId: defender.id,
      defenderWasOwner: !!previousOwner,
      previousOwnerStudentId: previousOwner?.id || null,
      attackerPower,
      defenderPower,
      announcedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      success,
      resultMessage,
    }, ...prev]);
    addLog("territory_raid", resultMessage);
  }

  function releaseTerritory(ownerStudentId: number, targetStudentId: number) {
    const owner = students.find((student) => student.id === ownerStudentId);
    const target = students.find((student) => student.id === targetStudentId);
    if (!owner || !target) return alert("Không tìm thấy quan hệ thuộc địa cần xóa.");
    if (target.overlordStudentId !== owner.id) return alert("Người này hiện không phải thuộc địa của chủ được chọn.");

    const nextStudents = students.map((student) => {
      if (student.id === owner.id) {
        return { ...student, notice: appendNotice(student.notice, `Bạn đã bỏ thuộc địa ${target.name}.`) };
      }
      if (student.id === target.id) {
        return {
          ...student,
          overlordStudentId: null,
          notice: appendNotice(student.notice, `${owner.name} đã bỏ thuộc địa, bạn trở lại tự do.`),
        };
      }
      return student;
    });

    const refreshed = refreshDerived(guilds, nextStudents);
    setStudents(refreshed.students);
    setGuilds(refreshed.guilds);
    addLog("territory_release", `${owner.name} đã bỏ thuộc địa ${target.name}.`);
  }

  function rebelTerritory(targetStudentId: number) {
    const target = students.find((student) => student.id === targetStudentId);
    if (!target) return alert("Không tìm thấy học sinh cần phản kháng.");
    const owner = target.overlordStudentId ? students.find((student) => student.id === target.overlordStudentId) || null : null;
    if (!owner) return alert("Học sinh này hiện chưa có chủ.");

    const nextStudents = students.map((student) => {
      if (student.id === target.id) {
        return {
          ...student,
          overlordStudentId: null,
          notice: appendNotice(student.notice, `Bạn đã phản kháng thành công và xóa quan hệ thuộc địa với ${owner.name}.`),
        };
      }
      if (student.id === owner.id) {
        return {
          ...student,
          notice: appendNotice(student.notice, `${target.name} đã phản kháng và thoát khỏi thuộc địa của bạn.`),
        };
      }
      return student;
    });

    const refreshed = refreshDerived(guilds, nextStudents);
    setStudents(refreshed.students);
    setGuilds(refreshed.guilds);
    addLog("territory_rebel", `${target.name} đã phản kháng và xóa thuộc địa với ${owner.name}.`);
  }

  function summonBossEvent() {
    if (!canSpawnBoss) return alert("Chỉ có thể triệu hồi boss khi tất cả quân đoàn đang hoạt động đều đã có thú.");
    if (bossEvent && !bossEvent.resolvedAt) return alert("Đã có boss đang hoạt động. Hãy chờ kết thúc hoặc hạ boss hiện tại.");
    const startIso = localInputToIso(bossDraftStartTime);
    const endIso = localInputToIso(bossDraftEndTime);
    const duration = Number(bossDraftDuration);
    if (!startIso || !endIso) return alert("Thời gian boss không hợp lệ.");
    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) return alert("Thời gian kết thúc boss phải lớn hơn thời gian bắt đầu.");
    if (!duration || duration <= 0) return alert("Thời gian làm bài boss không hợp lệ.");
    if (!bossDraftQuestionIds.length) return alert("Hãy chọn ít nhất 1 câu hỏi cho boss.");
    const newBoss = createBossEvent(guilds, students, questions, {
      title: bossDraftTitle,
      element: bossDraftElement,
      questionIds: bossDraftQuestionIds,
      startTime: startIso,
      endTime: endIso,
      durationMinutes: duration,
    });
    setBossEvent(newBoss);
    setBossSpawnGateOpen(false);
    addLog("boss_spawn", `${newBoss.name} đã được triệu hồi. Hệ ${newBoss.element}, mở từ ${formatDateTime(newBoss.startTime)} đến ${formatDateTime(newBoss.endTime)}.`);
  }

  function startBossBattle() {
    if (!currentStudent || !bossEvent || bossEvent.resolvedAt) return;
    if (!currentStudent.beast) return alert("Bạn cần có thú mới được tham gia đánh boss.");
    if (!isBossEventOpen(bossEvent)) return alert("Sự kiện boss hiện chưa mở hoặc đã hết thời gian.");
    if (getBossParticipantContribution(bossEvent, currentStudent.id)) return alert("Bạn đã tham gia sự kiện boss này rồi.");
    const questionIds = bossEvent.questionIds.length ? bossEvent.questionIds : questions.map((question) => question.id);
    if (!questionIds.length) return alert("Chưa có câu hỏi để mở boss.");
    const initialAnswers: AnswerMap = {};
    questionIds.forEach((id) => { initialAnswers[id] = ""; });
    setBossBattleQuestionIds(questionIds);
    setBossAnswers(initialAnswers);
    setBossBattleStartedAt(new Date().toISOString());
    setActiveBossBattleId(bossEvent.id);
    setStudentMessage("");
    bossAutoSubmittedRef.current = false;
  }

  function finalizeBossBattle(forceSubmit = false, sessionOverride?: BossBattleSession) {
    const targetBossEvent = bossEvent;
    const targetStudent = currentStudent || (sessionOverride ? students.find((student) => student.id === sessionOverride.studentId) || null : null);
    if (!targetStudent || !targetBossEvent || !targetStudent.beast) return;
    if ((sessionOverride?.bossEventId || activeBossBattleId) !== targetBossEvent.id) return;
    if (getBossParticipantContribution(targetBossEvent, targetStudent.id)) {
      setActiveBossBattleId(null);
      setBossAnswers({});
      setBossBattleQuestionIds([]);
      setBossBattleStartedAt(null);
      return;
    }
    const guild = guildById.get(targetStudent.guildId);
    if (!guild) return;
    const usingQuestionIds = sessionOverride?.questionIds || bossBattleQuestionIds;
    const usingAnswers = sessionOverride?.answers || bossAnswers;
    const pickedQuestions = questions.filter((question) => usingQuestionIds.includes(question.id));
    const correctCount = pickedQuestions.filter((question) => usingAnswers[question.id] === question.correctAnswer).length;
    const stats = beastStats(targetStudent);
    const beastAttack = Math.max(1, stats?.atk || 1);
    const ignorePercent = stats?.ignoreCounterPercent || 0;
    const elementModifier = getBossBattleElementModifier(targetStudent.beast.element, targetBossEvent.element, ignorePercent);
    const rawDamage = Math.round(correctCount * beastAttack * elementModifier);
    const dealtDamage = Math.max(0, Math.min(rawDamage, targetBossEvent.currentHp));
    const bossExpGain = Math.max(1, Math.floor((targetStudent.beast.exp || 0) * 0.01));
    const nextBossExp = targetBossEvent.exp + bossExpGain;
    const nextBossLevel = Math.max(1, Math.floor(nextBossExp / 100) + 1);
    const nextBossHp = Math.max(0, targetBossEvent.currentHp - dealtDamage);
    const contribution: BossContribution = {
      studentId: targetStudent.id,
      correctCount,
      damage: dealtDamage,
      submittedAt: new Date().toISOString(),
    };
    let nextBossEvent: BossEvent = {
      ...targetBossEvent,
      exp: nextBossExp,
      level: nextBossLevel,
      currentHp: nextBossHp,
      contributions: [...targetBossEvent.contributions, contribution],
    };

    let nextStudents = students.map((student) => student.id === targetStudent.id ? {
      ...student,
      notice: appendNotice(student.notice, `Bạn vừa đánh boss và gây ${dealtDamage} sát thương với ${correctCount} câu đúng${elementModifier !== 1 ? ` (hệ số hệ x${elementModifier.toFixed(2)})` : ""}.`),
    } : student);

    if (nextBossHp <= 0) {
      const chestMap = allocateBossChestCounts(nextBossEvent.contributions, nextBossEvent.maxHp);
      const slayerStudentId = targetStudent.id;
      nextBossEvent = {
        ...nextBossEvent,
        currentHp: 0,
        resolvedAt: new Date().toISOString(),
        slayerStudentId,
        contributions: nextBossEvent.contributions.map((entry) => {
          const student = students.find((row) => row.id === entry.studentId);
          const guildRow = student ? guildById.get(student.guildId) : null;
          const chestCount = chestMap.get(entry.studentId) || 0;
          const rewards = student && guildRow ? Array.from({ length: chestCount }, () => generateRewardItem(BOSS_CHEST_MAX_RARITY, student.beast?.level || 1, guildRow.level || 1)) : [];
          const killerRewards = entry.studentId === slayerStudentId && student && guildRow ? [generateRewardItem(BOSS_KILLER_RARITY, student.beast?.level || 1, guildRow.level || 1)] : [];
          return { ...entry, chestCount, rewards, killerRewards };
        }),
      };
      nextStudents = nextStudents.map((student) => {
        const rewardInfo = nextBossEvent.contributions.find((entry) => entry.studentId === student.id);
        if (!rewardInfo) return student;
        const allRewards = [...(rewardInfo.rewards || []), ...(rewardInfo.killerRewards || [])];
        if (!allRewards.length) return student;
        return autoProcessInventory({
          ...student,
          inventory: [...student.inventory, ...allRewards],
          notice: appendNotice(student.notice, `Boss đã bị tiêu diệt. Bạn nhận ${rewardInfo.chestCount || 0} rương${rewardInfo.killerRewards?.length ? " và thêm thưởng kết liễu đồ vàng" : ""}.`),
        });
      });
      addLog("boss_defeat", `${targetStudent.name} đã kết liễu boss. Boss rơi đủ ${BOSS_CHEST_POOL} rương, chia theo % sát thương gây ra.`);
      setStudentMessage(`Bạn gây ${dealtDamage} sát thương và là người kết liễu boss.`);
    } else {
      addLog("boss_hit", `${targetStudent.name} đánh boss với ${correctCount} câu đúng, gây ${dealtDamage} sát thương.`);
      setStudentMessage(forceSubmit ? `Hệ thống tự nộp bài boss. Bạn gây ${dealtDamage} sát thương.` : `Bạn gây ${dealtDamage} sát thương cho boss với ${correctCount} câu đúng.`);
    }

    setStudents(nextStudents);
    setBossEvent(nextBossEvent);
    setActiveBossBattleId(null);
    setBossAnswers({});
    setBossBattleQuestionIds([]);
    setBossBattleStartedAt(null);
    setBossTimeLeftSeconds(0);
    bossAutoSubmittedRef.current = false;
    localStorage.removeItem(getBossSessionKey(targetStudent.id));
  }

  function handleStudentLogout() {
    if (currentStudent && activeAssignment && examStartedAt) {
      finalizeStudentAssignment(true, "Bạn vừa thoát khỏi bài làm. Hệ thống đã tự chấm điểm.");
    }
    setActiveBossBattleId(null);
    setBossAnswers({});
    setBossBattleQuestionIds([]);
    setCurrentStudentId(null);
    setRole("select");
  }

  if (!hydrated) return <div style={{ padding: 24 }}>Đang tải...</div>;

  if (role === "select") {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Đấu Trường Thú</h1>
          <p style={{ color: "#64748b", marginTop: 8 }}>Chọn khu vực đăng nhập</p>
          <button style={styles.primaryBtn} onClick={() => setRole("admin_login")}>Đăng nhập giáo viên</button>
          <button style={styles.secondaryBtn} onClick={() => setRole("student_login")}>Đăng nhập học sinh</button>
          <div style={styles.copyright}>Bản quyền tác giả: Nguyễn Đức Doanh - THCS Đông Xá - Vân Đồn - Quảng Ninh. SĐT: 0388584296</div>
        </div>
      </div>
    );
  }

  if (role === "admin_login") {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Đăng nhập giáo viên</h1>
          <input style={styles.input} value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Tên đăng nhập" />
          <input style={styles.input} type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Mật khẩu" />
          <button style={styles.primaryBtn} onClick={handleAdminLogin}>Đăng nhập</button>
          <button style={styles.secondaryBtn} onClick={() => setRole("select")}>Quay lại</button>
          <div style={styles.copyright}>Bản quyền tác giả: Nguyễn Đức Doanh - THCS Đông Xá - Vân Đồn - Quảng Ninh. SĐT: 0388584296</div>
        </div>
      </div>
    );
  }

  if (role === "student_login") {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Đăng nhập học sinh</h1>
          <input style={styles.input} value={studentUser} onChange={(e) => setStudentUser(e.target.value)} placeholder="Tên đăng nhập" />
          <input style={styles.input} type="password" value={studentPass} onChange={(e) => setStudentPass(e.target.value)} placeholder="Mật khẩu" />
          <button style={styles.primaryBtn} onClick={handleStudentLogin}>Đăng nhập</button>
          <button style={styles.secondaryBtn} onClick={() => setRole("select")}>Quay lại</button>
          <div style={styles.copyright}>Bản quyền tác giả: Nguyễn Đức Doanh - THCS Đông Xá - Vân Đồn - Quảng Ninh. SĐT: 0388584296</div>
        </div>
      </div>
    );
  }

  if (role === "student" && currentStudent) {
    const guild = guildById.get(currentStudent.guildId)!;
    const st = beastStats(currentStudent);
    const beastLv = currentStudent.beast ? getBeastLevelInfo(currentStudent.beast.exp) : null;
    const mySubmissionMap = new Map(submissions.filter((s) => s.studentId === currentStudent.id).map((s) => [s.assignmentId, s]));
    const myGuildConquests = conquestBattles
      .filter((battle) => battle.attackerGuildId === guild.id || battle.defenderGuildId === guild.id)
      .sort((a, b) => new Date(b.announcedAt).getTime() - new Date(a.announcedAt).getTime());
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 20 }}>
        <div style={styles.headerStudent}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>Khu học sinh</div>
            <div>{currentStudent.name} · {currentStudent.className} · {guild.name}</div>
          </div>
          <button style={styles.softDarkBtn} onClick={handleStudentLogout}>Đăng xuất</button>
        </div>

        {recentHatchGuilds.length > 0 && (
          <div style={styles.serverBanner}>
            <div style={styles.serverBannerBadge}>THÔNG BÁO TOÀN SERVER</div>
            <div style={styles.serverBannerTitle}>🎉 Trứng thú đã nở!</div>
            <div style={styles.serverBannerText}>
              {recentHatchGuilds.map((g) => `${g.name} mở khóa thú chiến ở cấp 10`).join(" · ")}
            </div>
          </div>
        )}

        <div style={styles.grid2}>
          <div style={styles.card}>
            <h3>Thông tin cá nhân</h3>
            {currentStudent.notice && <div style={styles.noticeBox}>{currentStudent.notice}</div>}
            <div>Điểm tuần: <b>{currentStudent.weeklyPoints}</b></div>
            <div>Tổng điểm: <b>{currentStudent.totalPoints}</b></div>
            <div>Điểm uy danh: <b>{currentStudent.prestigePoints || 0}</b></div>
            <div>Lực chiến: <b>{beastPower(currentStudent, guild)}</b></div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Uy danh từ đơn đấu chỉ nhận khi lực chiến thấp hơn mà vẫn thắng. Uy danh tự động cường hóa đều theo thứ tự: Vũ khí → Giáp → Mũ → Giày.</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Buff sức mạnh: Quân đoàn +{guild.buffPercent}%{guild.leaderStudentId === currentStudent.id ? " · Đoàn trưởng +5%" : guild.viceLeaderStudentIds.includes(currentStudent.id) ? " · Đoàn phó +2%" : ""}</div>
          </div>
          <div style={styles.card}>
            <h3>Sự kiện Boss thế giới</h3>
            {bossEvent ? (
              <>
                <div>Tên nhiệm vụ: <b>{bossEvent.name}</b></div>
                <div>Trạng thái: <b>{bossEvent.resolvedAt ? "Đã bị tiêu diệt" : isBossEventOpen(bossEvent) ? "Đang mở" : Date.now() < new Date(bossEvent.startTime).getTime() ? "Chưa mở" : "Đã hết hạn"}</b></div>
                <div>Hệ boss: <b>{bossEvent.element}</b> · Ảnh: <b>{getBossImage()}</b></div>
                <div>Thời gian: <b>{formatDateTime(bossEvent.startTime)} → {formatDateTime(bossEvent.endTime)}</b></div>
                <div>Thời gian làm bài: <b>{bossEvent.durationMinutes} phút</b></div>
                <div>Số câu hỏi: <b>{bossEvent.questionIds.length}</b></div>
                <div>Bạn chỉ thấy % máu khi đã vào trận.</div>
                <div>Đã tham gia: <b>{getBossParticipantContribution(bossEvent, currentStudent.id) ? "Rồi" : "Chưa"}</b></div>
                {!bossEvent.resolvedAt && isBossEventOpen(bossEvent) && !getBossParticipantContribution(bossEvent, currentStudent.id) && activeBossBattleId !== bossEvent.id && currentStudent.beast && (
                  <button style={{ ...styles.primaryBtn, marginTop: 10 }} onClick={startBossBattle}>Vào đánh boss</button>
                )}
                {getBossParticipantContribution(bossEvent, currentStudent.id) && (() => {
                  const mine = getBossParticipantContribution(bossEvent, currentStudent.id)!;
                  return <div style={{ marginTop: 8, color: "#065f46" }}>Bạn đã gây {mine.damage} sát thương với {mine.correctCount} câu đúng, nhận {mine.chestCount || 0} rương.</div>;
                })()}
                {bossEvent.resolvedAt && bossEvent.slayerStudentId === currentStudent.id && <div style={{ marginTop: 8, color: "#b45309", fontWeight: 700 }}>Bạn là người kết liễu boss và nhận thêm đồ vàng.</div>}
              </>
            ) : (
              <div>Chưa có nhiệm vụ boss nào. Khi tất cả quân đoàn đều có thú, giáo viên có thể triệu hồi boss thủ công.</div>
            )}
          </div>
          <div style={styles.card}>
            <h3>Thông báo chinh phục quân đoàn</h3>
            {myGuildConquests.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {myGuildConquests.slice(0, 3).map((battle) => {
                  const isAttacker = battle.attackerGuildId === guild.id;
                  const mySnapshot = isAttacker ? battle.attackerSnapshot : battle.defenderSnapshot;
                  const enemySnapshot = isAttacker ? battle.defenderSnapshot : battle.attackerSnapshot;
                  return (
                    <div key={battle.id} style={styles.miniCard}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>{isAttacker ? "Bạn đang tấn công" : "Quân đoàn bạn đang phòng thủ"}: {enemySnapshot.guildName}</div>
                      <div>Quân đoàn bạn: LC {mySnapshot.totalPower} · {mySnapshot.memberCount} thú</div>
                      <div>Mạnh nhất: {mySnapshot.strongestName} ({mySnapshot.strongestPower})</div>
                      <div>Yếu nhất: {mySnapshot.weakestName} ({mySnapshot.weakestPower})</div>
                      <div style={{ marginTop: 6 }}>Đối thủ: LC {enemySnapshot.totalPower} · {enemySnapshot.memberCount} thú</div>
                      <div>Mạnh nhất: {enemySnapshot.strongestName} ({enemySnapshot.strongestPower})</div>
                      <div>Yếu nhất: {enemySnapshot.weakestName} ({enemySnapshot.weakestPower})</div>
                      <div style={{ marginTop: 6, color: battle.resolvedAt ? "#065f46" : "#b45309", fontWeight: 700 }}>
                        {battle.resolvedAt ? `Đã có kết quả: ${battle.resultMessage || "Hoàn tất"}` : `Thời gian chinh phục: ${formatDateTime(battle.executeAt)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>Hiện chưa có lịch chinh phục nào liên quan đến quân đoàn của bạn.</div>
            )}
          </div>
          <div style={styles.card}>
            <h3>Cặp đấu đơn của bạn</h3>
            {duelMatches.filter((match) => match.leftStudentId === currentStudent.id || match.rightStudentId === currentStudent.id).length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {duelMatches
                  .filter((match) => match.leftStudentId === currentStudent.id || match.rightStudentId === currentStudent.id)
                  .slice(0, 4)
                  .map((match) => {
                    const meLeft = match.leftStudentId === currentStudent.id;
                    const myPower = meLeft ? match.leftPower : match.rightPower;
                    const enemyPower = meLeft ? match.rightPower : match.leftPower;
                    const enemyStudent = students.find((s) => s.id === (meLeft ? match.rightStudentId : match.leftStudentId));
                    return (
                      <div key={match.id} style={styles.miniCard}>
                        <div style={{ fontWeight: 800 }}>{match.scheduleLabel}</div>
                        <div>Đối thủ: <b>{enemyStudent?.name || "-"}</b></div>
                        <div>Lực chiến của bạn: <b>{myPower}</b> · Đối thủ: <b>{enemyPower}</b></div>
                        <div>Tương quan: <b>{getPowerCompareText(myPower, enemyPower)}</b></div>
                        <div>Thời gian thi đấu: {formatDateTime(match.executeAt)}</div>
                        <div style={{ marginTop: 6, color: match.resolvedAt ? "#065f46" : "#b45309", fontWeight: 700 }}>
                          {match.resolvedAt ? (match.resultMessage || "Đã có kết quả") : "Đang chờ giao đấu tự động"}
                        </div>
                        {match.resolvedAt && match.winnerStudentId === currentStudent.id && (
                          <div style={{ marginTop: 4 }}>Phần thưởng: {match.prestigeAwarded ? `${match.prestigeAwarded} điểm uy danh` : "Không có uy danh"}</div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div>Hiện bạn chưa có cặp đơn đấu nào.</div>
            )}
          </div>
          <div style={styles.card}>
            <h3>Thuộc địa của bạn</h3>
            <div>Chủ hiện tại: <b>{currentStudent.overlordStudentId ? (students.find((student) => student.id === currentStudent.overlordStudentId)?.name || "-") : "Chưa có"}</b></div>
            <div>Số thuộc địa bạn đang có: <b>{students.filter((student) => student.overlordStudentId === currentStudent.id).length}/{MAX_TERRITORIES_PER_STUDENT}</b></div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Nếu thuộc địa của bạn kiếm được EXP thú, bạn nhận thêm 10% phần EXP đó.</div>
            {currentStudent.overlordStudentId && (
              <div style={{ marginTop: 10 }}>
                <button style={styles.dangerBtn} onClick={() => rebelTerritory(currentStudent.id)}>Phản kháng xóa thuộc địa</button>
              </div>
            )}
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {students.filter((student) => student.overlordStudentId === currentStudent.id).length ? students.filter((student) => student.overlordStudentId === currentStudent.id).map((student) => {
                const studentGuild = guildById.get(student.guildId);
                return (
                  <div key={`territory-owned-${student.id}`} style={styles.miniCard}>
                    <div style={{ fontWeight: 700 }}>{student.name}</div>
                    <div>{student.className} · {studentGuild?.name || "-"}</div>
                    <div>Lực chiến: {studentGuild ? beastPower(student, studentGuild) : 0}</div>
                    <div style={{ marginTop: 8 }}>
                      <button style={styles.secondaryBtn} onClick={() => releaseTerritory(currentStudent.id, student.id)}>Bỏ thuộc địa</button>
                    </div>
                  </div>
                );
              }) : <div>Bạn chưa có thuộc địa nào.</div>}
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 700 }}>Nhật ký thuộc địa liên quan đến bạn</div>
              {[
                ...territoryRaids
                  .filter((raid) => raid.attackerStudentId === currentStudent.id || raid.targetStudentId === currentStudent.id || raid.defenderStudentId === currentStudent.id)
                  .map((raid) => ({ id: `raid-${raid.id}`, message: raid.resultMessage || "", createdAt: raid.announcedAt })),
                ...eventLogs
                  .filter((log) => ["territory_release", "territory_rebel"].includes(log.type) && log.message.includes(currentStudent.name))
                  .map((log) => ({ id: `log-${log.id}`, message: log.message, createdAt: log.createdAt })),
              ]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 6)
                .map((entry) => (
                  <div key={entry.id} style={styles.miniCard}>
                    <div>{entry.message}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{formatDateTime(entry.createdAt)}</div>
                  </div>
                ))}
              {!([
                ...territoryRaids.filter((raid) => raid.attackerStudentId === currentStudent.id || raid.targetStudentId === currentStudent.id || raid.defenderStudentId === currentStudent.id),
                ...eventLogs.filter((log) => ["territory_release", "territory_rebel"].includes(log.type) && log.message.includes(currentStudent.name)),
              ].length) && <div>Chưa có biến động thuộc địa nào liên quan đến bạn.</div>}
            </div>
          </div>
          <div style={styles.card}>
            <h3>Thú của bạn</h3>
            <div style={styles.studentBeastGearRow}>
              <div style={styles.studentBeastPanel}>
                {currentStudent.beast && st ? (
                  <>
                    <div style={{ ...styles.studentBeastFrame, ...getBeastFrameStyle(currentStudent.beast), ...(isRecentTimestamp(guild.reachedLevel12At, 15 * 60 * 1000) ? styles.hatchCelebrationFrame : {}) }}>
                      {isRecentTimestamp(guild.reachedLevel12At, 15 * 60 * 1000) && (
                        <>
                          <div style={styles.hatchBurstRing} />
                          <div style={styles.hatchBurstSparkLeft}>✨</div>
                          <div style={styles.hatchBurstSparkRight}>✨</div>
                          <div style={styles.hatchBurstSparkTop}>💥</div>
                        </>
                      )}
                      <img src={getBeastImage(currentStudent.beast.species)} alt={currentStudent.beast.species} style={{ ...styles.studentBeastImage, ...styles.beastAnimated }} />
                      <div style={styles.beastOverlayTop}>
                        <div
                          style={{
                            ...styles.beastOverlayBadge,
                            color: getBeastQualityTier(currentStudent.beast.quality).color,
                            background: "rgba(255,255,255,0.92)",
                            borderColor: getBeastQualityTier(currentStudent.beast.quality).color,
                          }}
                        >
                          Tư chất {currentStudent.beast.quality}
                        </div>
                      </div>
                      <div style={styles.beastOverlayBottom}>
                        <div style={styles.beastOverlayMuted}>{getBeastQualityTier(currentStudent.beast.quality).label}</div>
                        <div style={styles.beastOverlayMuted}>Cấp {currentStudent.beast.level}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", marginTop: 10 }}><b>{currentStudent.beast.species}</b> · Hệ {currentStudent.beast.element}</div>
                    {isRecentTimestamp(guild.reachedLevel12At, 15 * 60 * 1000) && (
                      <div style={styles.hatchCelebrationText}>🌟 Trứng quân đoàn vừa nở! Thú chiến đã thức tỉnh với hiệu ứng bùng nổ ánh sáng.</div>
                    )}
                  </>
                ) : (
                  <div>
                    <div style={{ ...styles.studentBeastFrame, ...styles.eggFrame, ...(guild.level >= 10 ? styles.eggGlowAnimated : {}), boxShadow: guild.level >= 10 ? "0 0 20px rgba(250,204,21,0.45)" : "0 0 10px rgba(148,163,184,0.25)" }}>
                      <img src={getEggImage(guild.level)} alt="egg" onError={(e) => { e.currentTarget.style.display = "none"; const next = e.currentTarget.nextElementSibling as HTMLElement | null; if (next) next.style.display = "flex"; }} style={{ ...styles.studentBeastImage, ...styles.eggAnimated }} /><div style={{ display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: 88 }}>🥚</div>
                    </div>
                    <div style={{ marginTop: 10, textAlign: "center" }}>Trứng thú đang chờ nở. Quân đoàn cần đạt cấp 10.</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, textAlign: "center" }}>
                      {guild.level >= 10 ? "Trứng đang phát sáng, sắp nở..." : guild.level >= 8 ? "Trứng đã bắt đầu ấp." : "Chưa đạt mốc ấp trứng."}
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.studentGearPanel}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Trang bị đang mặc</div>
                <div style={styles.studentGearGrid}>
                  {SLOTS.map((slot) => {
                    const item = currentStudent.equipped[slot];
                    return (
                      <div key={slot} style={{ ...styles.studentGearCard, ...(item ? getItemFrameStyle(item.rarity) : {}) }}>
                        <div style={styles.studentGearVisual}>
                          <div style={styles.itemSlotHeader}>{slot}</div>
                          <div style={styles.studentGearIconWrap}>
                            <img src={getItemImage(slot)} alt={slot} style={styles.studentGearIcon} />
                          </div>
                        </div>
                        <div style={styles.studentGearInfo}>
                          <div style={{ ...styles.itemRarityBadgeInline, ...(item ? { color: getItemFrameStyle(item.rarity).border.replace("2px solid ", "") } : {}) }}>
                            {item ? item.rarity : "Chưa có"}
                          </div>
                          <div style={styles.studentGearStats}>
                            {getItemDetailLines(item).slice(1, 5).map((line, idx) => (
                              <div key={`${slot}-student-${idx}`} style={idx === 0 ? styles.itemStatLineStrong : styles.itemStatLine}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {currentStudent.beast && st ? (
              <>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>Aura hiển thị theo hệ + tư chất + cấp thú</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, marginBottom: 8 }}>
                  <span style={{ ...styles.qualityBadge, color: getBeastQualityTier(currentStudent.beast.quality).color, background: getBeastQualityTier(currentStudent.beast.quality).bg, borderColor: getBeastQualityTier(currentStudent.beast.quality).color }}>
                    Tư chất {currentStudent.beast.quality} · {getBeastQualityTier(currentStudent.beast.quality).label}
                  </span>
                  <span style={{ ...styles.qualityBadge, color: "#0f172a", background: "#e2e8f0", borderColor: "#cbd5e1" }}>
                    Cấp {currentStudent.beast.level}
                  </span>
                </div>
                <div>LV {currentStudent.beast.level} · EXP {beastLv?.current}/{beastLv?.next}</div>
                <div style={{ marginTop: 8 }}><b>Tổng chỉ số:</b></div>
                <div>ATK: {st.atk}</div>
                <div>DEF: {st.def}</div>
                <div>HP: {st.hp}</div>
                <div>SPD: {st.spd}</div>
                <div>Hồi máu mỗi lượt: {st.healPercent}%</div>
                <div>Bỏ qua bị khắc hệ: {st.ignoreCounterPercent}%</div>
                <div>Tăng sát thương từ vũ khí: {st.damagePercent}%</div>
                <div>Cường hóa: VK {getStrengthLevel(currentStudent, "Vũ khí")} · Giáp {getStrengthLevel(currentStudent, "Giáp")} · Mũ {getStrengthLevel(currentStudent, "Mũ")} · Giày {getStrengthLevel(currentStudent, "Giày")}</div>
              </>
            ) : null}
          </div>
        </div>

        <div style={styles.card}>
          <h3>Bài tập được giao</h3>
          {studentMessage && <div style={{ marginBottom: 12, color: "#065f46", fontWeight: 700 }}>{studentMessage}</div>}
          {bossEvent && activeBossBattleId === bossEvent.id ? (
            <div>
              <div style={{ ...styles.miniCard, marginBottom: 12, background: "#fff7ed" }}>
                <div><b>{bossEvent.name}</b> · Hệ {bossEvent.element} · Lv {bossEvent.level}</div>
                <div>Máu boss hiện tại: <b>{((bossEvent.currentHp / bossEvent.maxHp) * 100).toFixed(2)}%</b> ({bossEvent.currentHp}/{bossEvent.maxHp})</div>
                <div>Thời gian còn lại: <b style={{ color: bossTimeLeftSeconds <= 60 ? "#dc2626" : "#b45309" }}>{formatCountdown(bossTimeLeftSeconds)}</b></div>
                <div>Mỗi câu đúng = 1 đòn theo ATK thú của bạn. Hệ khắc boss được x1.05, bị khắc chỉ còn x0.98 để đỡ thiệt cho học sinh.</div>
                <div>Mỗi người chỉ được tham gia 1 lần trong 1 sự kiện. Hết giờ sẽ tự nộp.</div>
              </div>
              {bossQuestionPool.filter((q) => bossBattleQuestionIds.includes(q.id)).map((q) => (
                <div key={`boss-q-${q.id}`} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <div><b>{renderTextWithMath(q.question)}</b> · {q.group}</div>
                  {q.imageUrl && <div style={{ marginTop: 10, marginBottom: 8 }}><img src={q.imageUrl} alt="boss-question" style={{ maxWidth: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 12, border: "1px solid #e2e8f0" }} /></div>}
                  {(["A", "B", "C", "D"] as const).map((k) => {
                    const text = k === "A" ? q.optionA : k === "B" ? q.optionB : k === "C" ? q.optionC : q.optionD;
                    return (
                      <label key={`boss-${q.id}-${k}`} style={{ display: "block", marginTop: 6 }}>
                        <input type="radio" name={`boss-q-${q.id}`} checked={bossAnswers[q.id] === k} onChange={() => setBossAnswers((prev) => ({ ...prev, [q.id]: k }))} /> {k}. {renderTextWithMath(text)}
                      </label>
                    );
                  })}
                </div>
              ))}
              <button style={styles.primaryBtn} onClick={finalizeBossBattle}>Nộp bài đánh boss</button>
            </div>
          ) : activeAssignment && examStartedAt ? (
            <div>
              <div style={{ ...styles.miniCard, marginBottom: 12, background: "#eff6ff" }}>
                <div><b>{activeAssignment.title}</b></div>
                <div>Thời gian làm bài: {activeAssignment.durationMinutes} phút</div>
                <div>Thời gian còn lại: <b style={{ color: timeLeftSeconds <= 60 ? "#dc2626" : "#1d4ed8" }}>{formatCountdown(timeLeftSeconds)}</b></div>
                <div style={{ color: "#b91c1c", marginTop: 8 }}>Thoát giữa chừng / đăng xuất / đóng tab sẽ bị tự nộp bài và chấm điểm ngay.</div>
              </div>
              {activeQuestions.map((q) => (
                <div key={q.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <div><b>{renderTextWithMath(q.question)}</b> · {q.difficulty} · {q.group}</div>
                  {q.imageUrl && <div style={{ marginTop: 10, marginBottom: 8 }}><img src={q.imageUrl} alt="question" style={{ maxWidth: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 12, border: "1px solid #e2e8f0" }} /></div>}
                  {(["A", "B", "C", "D"] as const).map((k) => {
                    const text = k === "A" ? q.optionA : k === "B" ? q.optionB : k === "C" ? q.optionC : q.optionD;
                    return (
                      <label key={k} style={{ display: "block", marginTop: 6 }}>
                        <input type="radio" name={`q-${q.id}`} checked={studentAnswers[q.id] === k} onChange={() => setStudentAnswers((prev) => ({ ...prev, [q.id]: k }))} /> {k}. {renderTextWithMath(text)}
                      </label>
                    );
                  })}
                </div>
              ))}
              <button style={styles.primaryBtn} onClick={() => finalizeStudentAssignment(false)}>Nộp bài</button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {studentAssignments.map((assignment) => {
                const submitted = mySubmissionMap.get(assignment.id);
                const open = isAssignmentOpen(assignment);
                return (
                  <div key={assignment.id} style={styles.miniCard}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{assignment.title}</div>
                    <div>Nhóm lớp: {assignment.className} · Bộ câu hỏi: {assignment.group}</div>
                    <div>{getAssignmentWindowText(assignment)}</div>
                    <div>Số câu hỏi: {assignment.questionIds.length}</div>
                    <div>Trạng thái: <b>{submitted ? "Đã nộp" : open ? "Đang mở" : assignment.status === "draft" ? "Nháp" : "Đã đóng"}</b></div>
                    {submitted ? (
                      <div style={{ marginTop: 8, color: submitted.autoSubmitted ? "#b45309" : "#065f46" }}>
                        Điểm: <b>{submitted.score}</b> · Nộp lúc {formatDateTime(submitted.submittedAt)} {submitted.autoSubmitted ? "(tự nộp)" : ""}
                      </div>
                    ) : (
                      <button style={{ ...styles.primaryBtn, marginTop: 10 }} disabled={!open} onClick={() => startAssignment(assignment)}>
                        {open ? "Bắt đầu làm bài" : "Chưa đến giờ / đã hết hạn"}
                      </button>
                    )}
                  </div>
                );
              })}
              {!studentAssignments.length && <div>Chưa có bài tập nào cho lớp của bạn.</div>}
            </div>
          )}
        </div>

        <div style={styles.footer}>Bản quyền tác giả: Nguyễn Đức Doanh - THCS Đông Xá - Vân Đồn - Quảng Ninh. SĐT: 0388584296</div>
      </div>
    );
  }

  const selectedGuildStudents = students.filter((s) => s.guildId === selectedGuildId);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`
        @keyframes beastFloat {
          0% { transform: translateY(0px) scale(1); filter: drop-shadow(0 12px 24px rgba(0,0,0,0.55)); }
          25% { transform: translateY(-6px) scale(1.02); filter: drop-shadow(0 16px 28px rgba(0,0,0,0.6)); }
          50% { transform: translateY(-12px) scale(1.04); filter: drop-shadow(0 20px 34px rgba(0,0,0,0.62)); }
          75% { transform: translateY(-6px) scale(1.02); filter: drop-shadow(0 16px 28px rgba(0,0,0,0.6)); }
          100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 12px 24px rgba(0,0,0,0.55)); }
        }
        @keyframes itemPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        @keyframes eggPulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(250,204,21,0.28)); }
          50% { transform: scale(1.06); filter: drop-shadow(0 0 26px rgba(250,204,21,0.7)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(250,204,21,0.28)); }
        }
        @keyframes eggGlow {
          0% { box-shadow: 0 0 14px rgba(250,204,21,0.26); }
          50% { box-shadow: 0 0 34px rgba(250,204,21,0.78), 0 0 66px rgba(250,204,21,0.32); }
          100% { box-shadow: 0 0 14px rgba(250,204,21,0.26); }
        }
        @keyframes hatchBurst {
          0% { transform: scale(0.65); opacity: 0; }
          20% { transform: scale(1); opacity: 1; }
          70% { transform: scale(1.18); opacity: 0.75; }
          100% { transform: scale(1.32); opacity: 0; }
        }
        @keyframes hatchSparkle {
          0% { transform: translateY(0px) scale(0.8); opacity: 0; }
          25% { transform: translateY(-8px) scale(1); opacity: 1; }
          100% { transform: translateY(-24px) scale(1.2); opacity: 0; }
        }
        @keyframes bannerPulse {
          0% { box-shadow: 0 8px 20px rgba(245,158,11,0.18); transform: translateY(0); }
          50% { box-shadow: 0 14px 34px rgba(245,158,11,0.28); transform: translateY(-1px); }
          100% { box-shadow: 0 8px 20px rgba(245,158,11,0.18); transform: translateY(0); }
        }
        @media (max-width: 1200px) {
          .beast-items-row-admin {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div style={styles.header}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Bảng điều khiển giáo viên</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>Đấu Trường Thú</div>
          <div style={{ opacity: 0.9 }}>{ADMIN_DISPLAY}</div>
        </div>
        <button style={styles.softBtn} onClick={() => setRole("select")}>Đăng xuất</button>
      </div>

      {recentHatchGuilds.length > 0 && (
        <div style={{ ...styles.serverBanner, margin: "16px 20px 0" }}>
          <div style={styles.serverBannerBadge}>HIỆU ỨNG NỞ TRỨNG</div>
          <div style={styles.serverBannerTitle}>🚀 Toàn server đang chúc mừng</div>
          <div style={styles.serverBannerText}>
            {recentHatchGuilds.map((g) => `${g.name} đạt cấp 10 và mở khóa thú chiến`).join(" · ")}
          </div>
        </div>
      )}

      <div style={styles.tabs}>
        {[
          ["overview", "Tổng quan"],
          ["students", "Thành viên"],
          ["points", "Điểm học sinh"],
          ["guilds", "Quân đoàn"],
          ["arena", "Đấu trường"],
          ["boss", "Boss thế giới"],
          ["conquest", "Chinh phục quân đoàn"],
          ["questions", "Ngân hàng câu hỏi"],
          ["assignments", "Giao bài tập"],
          ["submissions", "Bài nộp"],
          ["rankings", "Xếp hạng"],
          ["events", "Nhật ký"],
          ["settings", "Cài đặt"],
        ].map(([k, label]) => (
          <button key={k} style={tab === k ? styles.activeTab : styles.tab} onClick={() => setTab(k as typeof tab)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {tab === "overview" && (
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h3>Tổng quan</h3>
              <div>Quân đoàn đang hoạt động: <b>{activeGuilds.length}</b></div>
              <div>Học sinh: <b>{students.length}</b></div>
              <div>Thú đã nở: <b>{students.filter((s) => s.beast).length}</b></div>
              <div>Lượt đấu trường đã chạy: <b>{arenaRuns.length}</b></div>
              <div>Số câu hỏi: <b>{questions.length}</b></div>
              <div>Số bài tập: <b>{assignments.length}</b></div>
              <div>Số bài nộp: <b>{submissions.length}</b></div>
              <div>Boss hiện tại: <b>{bossEvent ? (bossEvent.resolvedAt ? "Đã hạ" : "Đang sống") : "Chưa xuất hiện"}</b></div>
            </div>
            <div style={styles.card}>
              <h3>Cộng EXP quân đoàn</h3>
              <select style={styles.input} value={guildExpGuildId} onChange={(e) => setGuildExpGuildId(Number(e.target.value))}>
                {activeGuilds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <input style={styles.input} value={guildExpValue} onChange={(e) => setGuildExpValue(e.target.value)} placeholder="EXP cộng thêm" />
              <button style={styles.primaryBtn} onClick={addGuildExp}>Cộng EXP</button>
            </div>
          </div>
        )}

        {tab === "students" && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={styles.grid2}>
              <div style={styles.card}>
                <h3>Chọn quân đoàn để quản lý học sinh</h3>
                <select style={styles.input} value={selectedGuildId} onChange={(e) => setSelectedGuildId(Number(e.target.value))}>
                  {activeGuilds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={styles.card}>
                <h3>{memberEditId ? "Sửa thông tin thành viên" : "Thêm thành viên"}</h3>
                {editingMember && <div style={styles.noticeBox}>Đang sửa: <b>{editingMember.name}</b> · {editingMember.username}</div>}
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Có thể sửa họ tên, tài khoản, mật khẩu, lớp, quân đoàn và avatar của thành viên.</div>
                <input style={styles.input} value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Họ và tên" />
                <input style={styles.input} value={memberUsername} onChange={(e) => setMemberUsername(e.target.value)} placeholder="Tên đăng nhập" />
                <input style={styles.input} value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} placeholder="Mật khẩu" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <>
                    <input list="class-options-list" style={styles.input} value={memberClassName} onChange={(e) => setMemberClassName(e.target.value)} placeholder="Nhập lớp, ví dụ 6A hoặc 7B" />
                    <datalist id="class-options-list">
                      {classOptions.map((x) => <option key={x} value={x} />)}
                    </datalist>
                  </>
                  <select style={styles.input} value={memberGuildId} onChange={(e) => setMemberGuildId(Number(e.target.value))}>
                    {activeGuilds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <input style={styles.input} value={memberAvatarUrl} onChange={(e) => setMemberAvatarUrl(e.target.value)} placeholder="Link avatar (hoặc chọn ảnh bên dưới)" />
                <input style={styles.input} type="file" accept="image/*" onChange={async (e) => { await handleMemberAvatarUpload(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
                {memberAvatarUrl && <div style={{ marginBottom: 10 }}><img src={memberAvatarUrl} alt="avatar-preview" style={styles.avatarLg} /></div>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button style={styles.primaryBtn} onClick={addMember}>{memberEditId ? "Lưu thay đổi" : "Thêm thành viên"}</button>{memberEditId && <button style={styles.secondaryBtn} onClick={clearMemberForm}>Hủy sửa</button>}</div>
              </div>
            </div>
            <div style={styles.card}>
              <h3>Danh sách thành viên trong quân đoàn đã chọn</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Tab này chỉ quản lý thông tin thành viên. Phần cộng/trừ điểm đã chuyển sang tab "Điểm học sinh".</div>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Avatar</th>
                      <th style={styles.th}>Họ tên</th>
                      <th style={styles.th}>Tài khoản</th>
                      <th style={styles.th}>Lớp</th>
                      <th style={styles.th}>Quân đoàn</th>
                      <th style={styles.th}>Tác vụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGuildStudents.map((s) => (
                      <tr key={`row-${s.id}`}>
                        <td style={styles.td}>{s.avatarUrl ? <img src={s.avatarUrl} alt={s.name} style={styles.avatarSm} /> : <div style={styles.avatarFallbackSm}>{s.name.slice(0, 1)}</div>}</td>
                        <td style={styles.td}>{s.name}</td>
                        <td style={styles.td}>{s.username}</td>
                        <td style={styles.td}>{s.className}</td>
                        <td style={styles.td}>{guildById.get(s.guildId)?.name || "-"}</td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button style={styles.secondaryBtn} onClick={() => editMember(s)}>Sửa thông tin</button>
                            <button style={styles.dangerBtn} onClick={() => removeMember(s.id)}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {selectedGuildStudents.map((s) => {
              const guild = guildById.get(s.guildId)!;
              const st = beastStats(s);
              const bInfo = s.beast ? getBeastLevelInfo(s.beast.exp) : null;
              return (
                <div key={s.id} style={styles.card}>
                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                          {s.avatarUrl ? <img src={s.avatarUrl} alt={s.name} style={styles.avatarMd} /> : <div style={styles.avatarFallback}>{s.name.slice(0, 1)}</div>}
                          <div style={{ fontSize: 20, fontWeight: 700 }}>{s.name}</div>
                        </div>
                        <div>{s.username} · {s.className} · {guild.name}</div>
                        <div>Điểm tuần: {s.weeklyPoints} · Tổng: {s.totalPoints}</div>
                        <div>Thú: {s.beast ? `${s.beast.species} (${s.beast.element})` : "Chưa có"}</div>
                        {s.beast && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                            <span style={{ ...styles.qualityBadge, color: getBeastQualityTier(s.beast.quality).color, background: getBeastQualityTier(s.beast.quality).bg, borderColor: getBeastQualityTier(s.beast.quality).color }}>
                              Tư chất {s.beast.quality} · {getBeastQualityTier(s.beast.quality).label}
                            </span>
                            <span style={{ ...styles.qualityBadge, color: "#0f172a", background: "#e2e8f0", borderColor: "#cbd5e1" }}>
                              Cấp {s.beast.level}
                            </span>
                          </div>
                        )}
                        <div>Lực chiến: {s.beast ? beastPower(s, guild) : "-"}</div>
                        {s.beast && st && (
                          <>
                            <div>LV thú: {s.beast.level} · EXP thú: {bInfo?.current}/{bInfo?.next}</div>
                            <div>ATK {st.atk} · DEF {st.def} · HP {st.hp} · SPD {st.spd}</div>
                            <div>Hồi máu mỗi lượt: {st.healPercent}% · Bỏ qua bị khắc: {st.ignoreCounterPercent}% · +{st.damagePercent}% sát thương</div>
                          </>
                        )}
                      </div>
                      <div style={{ minWidth: 280, flex: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Quản lý thành viên</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                          Điểm học sinh đã được tách sang tab riêng để tránh bấm nhầm khi xóa thành viên.
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          <button style={styles.secondaryBtn} onClick={() => editMember(s)}>Sửa thông tin thành viên</button>
                          <button style={styles.dangerBtn} onClick={() => removeMember(s.id)}>Xóa thành viên</button>
                        </div>
                      </div>
                    </div>
                    <div className="beast-items-row-admin" style={styles.beastItemsRow}>
                      <div style={styles.beastPanelInline}>
                        <div style={{ fontWeight: 800, marginBottom: 10, textAlign: "center" }}>Thú chiến</div>
                        {s.beast ? (
                          <div style={styles.beastDisplayRow}>
                            <div style={{ ...styles.beastFrameWide, ...getBeastFrameStyle(s.beast) }}>
                              <img src={getBeastImage(s.beast.species)} alt={s.beast.species} style={{ ...styles.beastImageWide, ...styles.beastAnimatedSlow }} />
                              <div style={styles.beastOverlayTop}>
                                <div
                                  style={{
                                    ...styles.beastOverlayBadge,
                                    color: getBeastQualityTier(s.beast.quality).color,
                                    background: "rgba(255,255,255,0.92)",
                                    borderColor: getBeastQualityTier(s.beast.quality).color,
                                  }}
                                >
                                  Tư chất {s.beast.quality}
                                </div>
                              </div>
                              <div style={styles.beastOverlayBottom}>
                                <div style={styles.beastOverlayMuted}>{getBeastQualityTier(s.beast.quality).label}</div>
                                <div style={styles.beastOverlayMuted}>Cấp {s.beast.level}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={styles.beastDisplayRow}>
                            <div style={{ ...styles.eggFrameWide, ...(guild.level >= 10 ? styles.eggGlowAnimated : {}), boxShadow: guild.level >= 10 ? "0 0 18px rgba(250,204,21,0.35)" : "0 0 10px rgba(148,163,184,0.2)" }}>
                              <img src={getEggImage(guild.level)} alt="egg" style={{ ...styles.eggImageWide, ...styles.eggAnimated }} />
                              <div style={styles.beastOverlayTop}>
                                <div style={{ ...styles.beastOverlayBadge, color: "#eab308", background: "rgba(255,255,255,0.92)", borderColor: "#f59e0b" }}>
                                  Trứng thú
                                </div>
                              </div>
                              <div style={styles.beastOverlayBottom}>
                                <div style={styles.beastOverlayMuted}>Cấp bang {guild.level}</div>
                                <div style={styles.beastOverlayMuted}>{guild.level >= 10 ? "Đang phát sáng" : guild.level >= 8 ? "Đang ấp" : "Chưa đủ cấp"}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={styles.itemsPanelInline}>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>Trang bị đang mặc</div>
                        <div style={styles.itemGridTwoRows}>
                          {SLOTS.map((slot) => {
                            const item = s.equipped[slot];
                            return (
                              <div key={slot} style={{ ...styles.itemCardSm, ...(item ? getItemFrameStyle(item.rarity) : {}), ...(item ? styles.itemAnimated : {}) }}>
                                <div style={styles.itemVisualPane}>
                                  <div style={styles.itemSlotHeader}>{slot}</div>
                                  <div style={styles.itemIconWrapSm}>
                                    <img src={getItemImage(slot)} alt={slot} style={styles.itemIconSm} />
                                  </div>
                                </div>
                                <div style={styles.itemInfoPane}>
                                  <div style={{ ...styles.itemRarityBadgeInline, ...(item ? { color: getItemFrameStyle(item.rarity).border.replace("2px solid ", "") } : {}) }}>
                                    {item ? item.rarity : "Chưa có"}
                                  </div>
                                  <div style={styles.itemStatsList}>
                                    {getItemDetailLines(item).map((line, lineIdx) => (
                                      <div key={`${slot}-${lineIdx}`} style={lineIdx === 0 ? styles.itemStatLineStrong : styles.itemStatLine}>
                                        {line}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "points" && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={styles.grid2}>
              <div style={styles.card}>
                <h3>Chọn quân đoàn để cộng / trừ điểm</h3>
                <select style={styles.input} value={selectedGuildId} onChange={(e) => setSelectedGuildId(Number(e.target.value))}>
                  {activeGuilds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={styles.card}>
                <h3>Lưu ý</h3>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
                  Nhập số dương để cộng điểm, nhập số âm để trừ điểm. Ví dụ: <b>10</b>, <b>-5</b>.<br />
                  Chưa có thú: 100% vào quân đoàn.<br />
                  Có thú: 50% vào quân đoàn, 50% vào EXP thú.
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3>Bảng điểm học sinh của quân đoàn đã chọn</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Avatar</th>
                      <th style={styles.th}>Học sinh</th>
                      <th style={styles.th}>Lớp</th>
                      <th style={styles.th}>Điểm tuần</th>
                      <th style={styles.th}>Tổng điểm</th>
                      <th style={styles.th}>Thú</th>
                      <th style={styles.th}>Lực chiến</th>
                      <th style={styles.th}>Nhập điểm</th>
                      <th style={styles.th}>Tác vụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGuildStudents.map((s) => {
                      const guild = guildById.get(s.guildId)!;
                      return (
                        <tr key={`points-${s.id}`}>
                          <td style={styles.td}>
                            {s.avatarUrl ? <img src={s.avatarUrl} alt={s.name} style={styles.avatarSm} /> : <div style={styles.avatarFallbackSm}>{s.name.slice(0, 1)}</div>}
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 700 }}>{s.name}</div>
                            <div style={{ fontSize: 13, color: "#64748b" }}>{s.username}</div>
                          </td>
                          <td style={styles.td}>{s.className}</td>
                          <td style={styles.td}>{s.weeklyPoints}</td>
                          <td style={styles.td}>{s.totalPoints}</td>
                          <td style={styles.td}>
                            {s.beast ? (
                              <div>
                                <div>{s.beast.species}</div>
                                <div style={{ marginTop: 6 }}>
                                  <span style={{ ...styles.qualityBadgeSm, color: getBeastQualityTier(s.beast.quality).color, background: getBeastQualityTier(s.beast.quality).bg, borderColor: getBeastQualityTier(s.beast.quality).color }}>
                                    TC {s.beast.quality}
                                  </span>
                                </div>
                              </div>
                            ) : "Chưa có"}
                          </td>
                          <td style={styles.td}>{s.beast ? beastPower(s, guild) : "-"}</td>
                          <td style={styles.td}>
                            <input
                              style={{ ...styles.input, minWidth: 140, margin: 0 }}
                              value={pointInputs[s.id] || ""}
                              onChange={(e) => setPointInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                              placeholder="+10 hoặc -10"
                            />
                          </td>
                          <td style={styles.td}>
                            <button style={styles.primaryBtn} onClick={() => addManualPoints(s.id)}>Cập nhật điểm</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {tab === "guilds" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={styles.grid2}>
              <div style={styles.card}>
                <h3>Thêm quân đoàn</h3>
                <input style={styles.input} value={guildNameInput} onChange={(e) => setGuildNameInput(e.target.value)} placeholder="Tên quân đoàn mới" />
                <button style={styles.primaryBtn} onClick={addGuild}>Thêm quân đoàn</button>
              </div>
              <div style={styles.card}>
                <h3>Giải tán quân đoàn</h3>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Chuyển toàn bộ thành viên từ quân đoàn bị giải tán sang quân đoàn nhận.</div>
                <select style={styles.input} value={dissolveFromGuildId} onChange={(e) => setDissolveFromGuildId(Number(e.target.value))}>
                  {activeGuilds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select style={styles.input} value={dissolveToGuildId} onChange={(e) => setDissolveToGuildId(Number(e.target.value))}>
                  {activeGuilds.filter((g) => g.id !== dissolveFromGuildId).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button style={styles.secondaryBtn} onClick={dissolveGuild}>Giải tán và chuyển thành viên</button>
              </div>
            </div>

            {activeGuilds.map((guild) => {
              const info = getGuildLevelInfo(guild.exp);
              const members = students.filter((s) => s.guildId === guild.id);
              return (
                <div key={guild.id} style={styles.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 800 }}>{guild.name}</div>
                      <div>LV {guild.level} · Buff +{guild.buffPercent}% · EXP {guild.exp}</div>
                      <div>Tiến độ cấp sau: {info.current}/{info.next}</div>
                      <div>Mốc lv8: {formatDateTime(guild.reachedLevel8At)} · Mốc nở lv10: {formatDateTime(guild.reachedLevel12At)}</div>
                      <div>Trạng thái trứng: <b>{guild.level >= 10 ? "Đã nở" : guild.level >= 8 ? "Đang ấp / phát sáng" : "Chưa ấp"}</b></div>
                      <div>Đoàn trưởng: <b>{members.find((s) => s.id === guild.leaderStudentId)?.name || "-"}</b></div>
                      <div>Đoàn phó: <b>{guild.viceLeaderStudentIds.map((id) => members.find((s) => s.id === id)?.name).filter(Boolean).join(", ") || "-"}</b></div>
                      <div>Số thành viên: <b>{members.length}</b></div>
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Thành viên</div>
                        <div style={styles.avatarRow}>
                          {members.length ? members.map((member) => (
                            <div key={member.id} style={styles.avatarBadge}>
                              {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} style={styles.avatarSm} /> : <div style={styles.avatarFallbackSm}>{member.name.slice(0, 1)}</div>}
                              <span>{member.name}</span>
                            </div>
                          )) : <span>Chưa có thành viên</span>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <button style={styles.dangerBtn} onClick={() => deleteGuild(guild.id)}>Xóa quân đoàn trống</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "arena" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={styles.card}>
              <h3>Đấu trường thú</h3>
              <p>Mỗi thú đánh 10 trận ngẫu nhiên. Hạng dưới không thể nhận đồ màu cao hơn hạng trên.</p>
              <button style={styles.primaryBtn} onClick={runArena}>Chạy đấu trường</button>
              {arenaRuns[0] && (
                <div style={{ overflowX: "auto", marginTop: 12 }}>
                  <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Hạng</th><th style={styles.th}>Học sinh</th><th style={styles.th}>Quân đoàn</th><th style={styles.th}>Hệ</th><th style={styles.th}>LC</th><th style={styles.th}>Thắng</th><th style={styles.th}>Thua</th></tr></thead>
                    <tbody>
                      {arenaRuns[0].ranking.map((f, idx) => <tr key={f.studentId}><td style={styles.td}>{idx + 1}</td><td style={styles.td}>{f.studentName}</td><td style={styles.td}>{f.guildName}</td><td style={styles.td}>{f.element}</td><td style={styles.td}>{f.power}</td><td style={styles.td}>{f.wins}</td><td style={styles.td}>{f.losses}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={styles.card}>
              <h3>Đơn đấu lấy điểm uy danh</h3>
              <p>Ghép cặp học sinh có thú với chênh lệch lực chiến không quá 15%. Người thắng chỉ nhận uy danh khi lực chiến ban đầu thấp hơn đối thủ. Uy danh sau đó tự động cường hóa đều theo thứ tự Vũ khí → Giáp → Mũ → Giày, và mỗi mốc + cao hơn sẽ tốn nhiều uy danh hơn. Khi ghép đồ lên phẩm mới, mốc cường hóa hiện tại vẫn được giữ lại.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <button style={styles.primaryBtn} onClick={createWeeklyDuelMatches}>Ghép cặp đơn đấu tuần</button>
                {pendingDuelMatches[0] && (
                  <button style={styles.secondaryBtn} onClick={() => resolveDuelMatch(pendingDuelMatches[0].id)}>
                    Xử lý ngay cặp đầu tiên
                  </button>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                Lịch ghép cặp mặc định theo các ngày 07, 14, 21, 28 hằng tháng. Bạn có thể bấm nút trên để test ngay mà không mất dữ liệu cũ.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12 }}>
                <div style={styles.miniCard}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Các cặp đơn đấu đã ghép</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {duelMatches.length ? duelMatches.slice(0, 10).map((match) => {
                      const leftStudent = students.find((s) => s.id === match.leftStudentId);
                      const rightStudent = students.find((s) => s.id === match.rightStudentId);
                      const winner = students.find((s) => s.id === match.winnerStudentId);
                      return (
                        <div key={match.id} style={{ ...styles.miniCard, background: "#fff" }}>
                          <div style={{ fontWeight: 700 }}>{leftStudent?.name || "-"} vs {rightStudent?.name || "-"}</div>
                          <div>Lực chiến: {match.leftPower} vs {match.rightPower}</div>
                          <div>Tương quan: {getPowerCompareText(match.leftPower, match.rightPower)}</div>
                          <div>Lịch: {match.scheduleLabel}</div>
                          <div>Diễn ra: {formatDateTime(match.executeAt)}</div>
                          <div style={{ marginTop: 4, color: match.resolvedAt ? "#065f46" : "#b45309", fontWeight: 700 }}>
                            {match.resolvedAt ? `Kết quả: ${winner?.name || "-"} thắng${match.prestigeAwarded ? ` · +${match.prestigeAwarded} uy danh` : ""}` : "Đang chờ giao chiến"}
                          </div>
                          {!match.resolvedAt && (
                            <div style={{ marginTop: 8 }}>
                              <button style={styles.secondaryBtn} onClick={() => resolveDuelMatch(match.id)}>Cho đánh ngay</button>
                            </div>
                          )}
                        </div>
                      );
                    }) : <div>Chưa có cặp đơn đấu nào.</div>}
                  </div>
                </div>

                <div style={styles.miniCard}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Top uy danh hiện tại</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>#</th>
                          <th style={styles.th}>Học sinh</th>
                          <th style={styles.th}>LC</th>
                          <th style={styles.th}>Uy danh</th>
                          <th style={styles.th}>Cường hóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students
                          .map((student) => {
                            const guild = guildById.get(student.guildId);
                            return {
                              id: student.id,
                              name: student.name,
                              power: guild ? beastPower(student, guild) : 0,
                              prestigePoints: student.prestigePoints || 0,
                              strengthText: SLOTS.map((slot) => `${slot}:${student.equipmentStrength?.[slot] || 0}`).join(" · "),
                            };
                          })
                          .filter((row) => row.power > 0 || row.prestigePoints > 0)
                          .sort((a, b) => b.prestigePoints - a.prestigePoints || b.power - a.power || a.name.localeCompare(b.name))
                          .slice(0, 10)
                          .map((row, idx) => (
                            <tr key={row.id}>
                              <td style={styles.td}>{idx + 1}</td>
                              <td style={styles.td}>{row.name}</td>
                              <td style={styles.td}>{row.power}</td>
                              <td style={styles.td}>{row.prestigePoints}</td>
                              <td style={styles.td}>{row.strengthText}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3>Thuộc địa</h3>
              <p>Bạn có thể bắt một học sinh đã có thú về làm thuộc địa. Mỗi tuần chỉ được đánh hoặc cướp 1 thuộc địa, và mỗi người tối đa 3 thuộc địa. Nếu mục tiêu đã có chủ, người tấn công phải đánh với chủ hiện tại để cướp.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Người đi bắt thuộc địa</div>
                  <select style={styles.input} value={selectedTerritoryAttacker?.id || ""} onChange={(e) => setTerritoryAttackerStudentId(Number(e.target.value))}>
                    {territoryEligibleStudents.map((student) => {
                      const guild = guildById.get(student.guildId);
                      return <option key={student.id} value={student.id}>{student.name} · LC {guild ? beastPower(student, guild) : 0}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Mục tiêu thuộc địa</div>
                  <select style={styles.input} value={selectedTerritoryTarget?.id || ""} onChange={(e) => setTerritoryTargetStudentId(Number(e.target.value))}>
                    {territoryTargetOptions.map((student) => {
                      const guild = guildById.get(student.guildId);
                      const owner = student.overlordStudentId ? students.find((row) => row.id === student.overlordStudentId) : null;
                      return <option key={student.id} value={student.id}>{student.name} · LC {guild ? beastPower(student, guild) : 0}{owner ? ` · Chủ: ${owner.name}` : " · Chưa có chủ"}</option>;
                    })}
                  </select>
                </div>
              </div>
              {selectedTerritoryAttacker && selectedTerritoryTarget && (() => {
                const attackerGuild = guildById.get(selectedTerritoryAttacker.guildId);
                const targetOwner = selectedTerritoryTarget.overlordStudentId ? students.find((student) => student.id === selectedTerritoryTarget.overlordStudentId) || null : null;
                const defender = targetOwner || selectedTerritoryTarget;
                const defenderGuild = guildById.get(defender.guildId);
                const attackerPower = attackerGuild ? beastPower(selectedTerritoryAttacker, attackerGuild) : 0;
                const defenderPower = defenderGuild ? beastPower(defender, defenderGuild) : 0;
                return (
                  <div style={styles.miniCard}>
                    <div><b>Kèo hiện tại:</b> {selectedTerritoryAttacker.name} tấn công để chiếm {selectedTerritoryTarget.name}</div>
                    <div>Người phòng thủ thật sự: <b>{defender.name}</b>{targetOwner ? " (chủ hiện tại)" : " (mục tiêu tự thủ)"}</div>
                    <div>Lực chiến công: <b>{attackerPower}</b> · Lực chiến thủ: <b>{defenderPower}</b></div>
                    <div>Tương quan: <b>{getPowerCompareText(attackerPower, defenderPower)}</b></div>
                    <div style={{ marginTop: 8 }}><button style={styles.primaryBtn} onClick={launchTerritoryRaid}>Đánh cướp thuộc địa ngay</button></div>
                  </div>
                );
              })()}
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>Quan hệ thuộc địa hiện tại</div>
                {students.filter((student) => student.overlordStudentId).length ? students.filter((student) => student.overlordStudentId).map((student) => {
                  const owner = students.find((row) => row.id === student.overlordStudentId) || null;
                  return (
                    <div key={`territory-relation-${student.id}`} style={styles.miniCard}>
                      <div><b>{student.name}</b> đang là thuộc địa của <b>{owner?.name || "-"}</b></div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {owner && <button style={styles.secondaryBtn} onClick={() => releaseTerritory(owner.id, student.id)}>Bỏ thuộc địa</button>}
                        <button style={styles.dangerBtn} onClick={() => rebelTerritory(student.id)}>Phản kháng xóa thuộc địa</button>
                      </div>
                    </div>
                  );
                }) : <div>Hiện chưa có quan hệ thuộc địa nào.</div>}
              </div>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>Nhật ký thuộc địa gần đây</div>
                {[...
                  territoryRaids.map((raid) => ({ id: `raid-${raid.id}`, message: raid.resultMessage || "", createdAt: raid.announcedAt, power: `${raid.attackerPower} / ${raid.defenderPower}` })),
                  ...eventLogs.filter((log) => ["territory_release", "territory_rebel"].includes(log.type)).map((log) => ({ id: `log-${log.id}`, message: log.message, createdAt: log.createdAt, power: "" })),
                ]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10)
                  .map((entry) => (
                    <div key={entry.id} style={styles.miniCard}>
                      <div>{entry.message}</div>
                      {entry.power && <div>Lực chiến công/thủ: {entry.power}</div>}
                      <div style={{ fontSize: 12, color: "#64748b" }}>{formatDateTime(entry.createdAt)}</div>
                    </div>
                  ))}
                {!territoryRaids.length && !eventLogs.filter((log) => ["territory_release", "territory_rebel"].includes(log.type)).length && <div>Chưa có biến động thuộc địa nào.</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "boss" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={styles.grid2}>
              <div style={styles.card}>
                <h3>Triệu hồi nhiệm vụ diệt boss</h3>
                <div>Điều kiện triệu hồi: tất cả quân đoàn đang hoạt động đều phải có ít nhất 1 thú.</div>
                <div>Trạng thái đủ điều kiện: <b>{canSpawnBoss ? "Đủ" : "Chưa đủ"}</b></div>
                <input style={styles.input} value={bossDraftTitle} onChange={(e) => setBossDraftTitle(e.target.value)} placeholder="Tên nhiệm vụ boss" />
                <select style={styles.input} value={bossDraftElement} onChange={(e) => setBossDraftElement(e.target.value as Element)}>
                  {ELEMENTS.map((element) => <option key={element} value={element}>{element}</option>)}
                </select>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input style={styles.input} type="datetime-local" value={bossDraftStartTime} onChange={(e) => setBossDraftStartTime(e.target.value)} />
                  <input style={styles.input} type="datetime-local" value={bossDraftEndTime} onChange={(e) => setBossDraftEndTime(e.target.value)} />
                </div>
                <input style={styles.input} value={bossDraftDuration} onChange={(e) => setBossDraftDuration(e.target.value)} placeholder="Thời gian làm bài boss (phút)" />
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Khắc hệ boss được làm nhẹ hơn cho học sinh: thuận hệ x1.05, bị khắc x0.98.</div>
                <button style={styles.primaryBtn} onClick={summonBossEvent}>Triệu hồi boss</button>
              </div>
              <div style={styles.card}>
                <h3>Ngân hàng câu hỏi cho boss</h3>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Chọn câu hỏi sẽ dùng cho nhiệm vụ boss. Mỗi học sinh chỉ được tham gia 1 lần trong sự kiện này.</div>
                <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 12, padding: 10 }}>
                  {questions.map((question) => (
                    <label key={`boss-pick-${question.id}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <input
                        type="checkbox"
                        checked={bossDraftQuestionIds.includes(question.id)}
                        onChange={(e) => setBossDraftQuestionIds((prev) => e.target.checked ? [...prev, question.id] : prev.filter((id) => id !== question.id))}
                      />
                      <span><b>#{question.id}</b> · {question.group} · {question.question}</span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={styles.secondaryBtn} onClick={() => setBossDraftQuestionIds(questions.map((question) => question.id))}>Chọn tất cả</button>
                  <button style={styles.secondaryBtn} onClick={() => setBossDraftQuestionIds([])}>Bỏ chọn hết</button>
                  <div style={{ alignSelf: "center" }}>Đã chọn: <b>{bossDraftQuestionIds.length}</b> câu</div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3>Boss hiện tại</h3>
              {bossEvent ? (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  <div><b>{bossEvent.name}</b> · Hệ {bossEvent.element} · Lv {bossEvent.level}</div>
                  <div>Trạng thái: <b>{bossEvent.resolvedAt ? "Đã bị tiêu diệt" : isBossEventOpen(bossEvent) ? "Đang mở" : Date.now() < new Date(bossEvent.startTime).getTime() ? "Chưa mở" : "Đã hết hạn"}</b></div>
                  <div>Thời gian sự kiện: {formatDateTime(bossEvent.startTime)} → {formatDateTime(bossEvent.endTime)}</div>
                  <div>Thời gian làm bài: {bossEvent.durationMinutes} phút</div>
                  <div>HP: {bossEvent.currentHp}/{bossEvent.maxHp} ({((bossEvent.currentHp / bossEvent.maxHp) * 100).toFixed(2)}%)</div>
                  <div>EXP boss: {bossEvent.exp}</div>
                  <div>Số câu hỏi: {bossEvent.questionIds.length}</div>
                  <div>Ảnh boss: {getBossImage()}</div>
                  <div>Trang bị boss</div>
                  <div style={styles.studentGearGrid}>
                    {SLOTS.map((slot) => {
                      const item = bossEvent.equipment[slot];
                      return (
                        <div key={`boss-equip-${slot}`} style={{ ...styles.studentGearCard, ...(item ? getItemFrameStyle(item.rarity) : {}) }}>
                          <div style={styles.studentGearVisual}>
                            <div style={styles.itemSlotHeader}>{slot}</div>
                            <div style={styles.studentGearIconWrap}>
                              <img src={getItemImage(slot)} alt={slot} style={styles.studentGearIcon} />
                            </div>
                          </div>
                          <div style={styles.studentGearInfo}>
                            <div style={{ ...styles.itemRarityBadgeInline, ...(item ? { color: getItemFrameStyle(item.rarity).border.replace("2px solid ", "") } : {}) }}>{item?.rarity || "-"}</div>
                            <div style={styles.studentGearStats}>
                              {item ? getItemDetailLines(item).map((line, idx) => <div key={`boss-line-${slot}-${idx}`} style={idx === 0 ? styles.itemStatLineStrong : styles.itemStatLine}>{line}</div>) : <div>Chưa có</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : <div style={{ marginTop: 12 }}>Chưa có boss đang hoạt động.</div>}
            </div>
            <div style={styles.card}>
              <h3>Xếp hạng đánh boss</h3>
              {bossRankingRows.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Hạng</th>
                        <th style={styles.th}>Học sinh</th>
                        <th style={styles.th}>Đúng</th>
                        <th style={styles.th}>Sát thương</th>
                        <th style={styles.th}>Rương</th>
                        <th style={styles.th}>Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bossRankingRows.map((row, idx) => (
                        <tr key={`boss-row-${row.studentId}`}>
                          <td style={styles.td}>{idx + 1}</td>
                          <td style={styles.td}>{row.student?.name || "-"}{bossEvent?.slayerStudentId === row.studentId ? " 👑" : ""}</td>
                          <td style={styles.td}>{row.correctCount}</td>
                          <td style={styles.td}>{row.damage}</td>
                          <td style={styles.td}>{row.chestCount || 0}</td>
                          <td style={styles.td}>{formatDateTime(row.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div>Chưa có ai đánh boss.</div>}
            </div>
          </div>
        )}

        {tab === "conquest" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={styles.card}>
              <h3>Phát động chinh phục quân đoàn</h3>
              <p>Sau khi phát động, thông báo sẽ hiện ngay ở giao diện học sinh. Sau 3 ngày, trận chiến tự động diễn ra.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Quân đoàn tấn công</div>
                  <select style={styles.input} value={conquestAttackerGuildId} onChange={(e) => setConquestAttackerGuildId(Number(e.target.value))}>
                    {availableConquestGuilds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Quân đoàn phòng thủ</div>
                  <select style={styles.input} value={conquestDefenderGuildId} onChange={(e) => setConquestDefenderGuildId(Number(e.target.value))}>
                    {eligibleDefenderGuilds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Chỉ hiển thị quân đoàn phòng thủ có lực chiến lệch không quá 15%.</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {[selectedAttackerGuild, selectedDefenderGuild].map((guildItem, index) => {
                  const snapshot = guildItem ? getGuildBattleSnapshot(guildItem) : null;
                  return (
                    <div key={index} style={styles.miniCard}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>{index === 0 ? "Bên tấn công" : "Bên phòng thủ"}</div>
                      {snapshot ? (
                        <>
                          <div>Tên quân đoàn: <b>{snapshot.guildName}</b></div>
                          <div>Tổng lực chiến: <b>{snapshot.totalPower}</b></div>
                          <div>Số người có thú: <b>{snapshot.memberCount}</b></div>
                          <div>Người mạnh nhất: <b>{snapshot.strongestName}</b> ({snapshot.strongestPower})</div>
                          <div>Người thấp nhất: <b>{snapshot.weakestName}</b> ({snapshot.weakestPower})</div>
                        </>
                      ) : (
                        <div>Chưa chọn quân đoàn.</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Nếu bên bị chinh phục thua: thủ lĩnh mất 5% EXP thú, phó thủ lĩnh mất 3%, sau đó toàn bộ quân đoàn bị sáp nhập. Nếu bên tấn công thua: không sáp nhập, thủ lĩnh bên tấn công mất 10% EXP thú, phó thủ lĩnh mất 5%.</div>
              <button style={styles.primaryBtn} onClick={() => runConquest(conquestAttackerGuildId, conquestDefenderGuildId)}>Phát động chinh phục</button>
            </div>

            <div style={styles.card}>
              <h3>Lịch chinh phục đã phát động</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {conquestBattles.length ? conquestBattles.map((battle) => (
                  <div key={battle.id} style={styles.miniCard}>
                    <div style={{ fontWeight: 800 }}>{battle.attackerSnapshot.guildName} → {battle.defenderSnapshot.guildName}</div>
                    <div>Thông báo: {formatDateTime(battle.announcedAt)}</div>
                    <div>Diễn ra: {formatDateTime(battle.executeAt)}</div>
                    <div>Bên công: LC {battle.attackerSnapshot.totalPower} · {battle.attackerSnapshot.memberCount} thú</div>
                    <div>Bên thủ: LC {battle.defenderSnapshot.totalPower} · {battle.defenderSnapshot.memberCount} thú</div>
                    <div style={{ marginTop: 6, color: battle.resolvedAt ? "#065f46" : "#b45309", fontWeight: 700 }}>
                      {battle.resolvedAt ? (battle.resultMessage || "Đã hoàn tất") : "Đang chờ đến thời gian chinh phục"}
                    </div>
                  </div>
                )) : <div>Chưa có lịch chinh phục nào.</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "questions" && (
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h3>Thêm câu hỏi thủ công</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                Bạn có thể dán công thức toán trực tiếp dưới dạng chữ thô nếu cần. Hệ thống sẽ lưu đúng nội dung bạn nhập, không tự đổi sang định dạng công thức.
              </div>
              <textarea style={styles.textarea} value={qQuestion} onChange={(e) => setQQuestion(e.target.value)} placeholder='Câu hỏi, ví dụ: Tính x^2 + 2x + 1 hoặc frac(2,3) + frac(1,6)' />
              <input style={styles.input} value={qA} onChange={(e) => setQA(e.target.value)} placeholder="Đáp án A" />
              <input style={styles.input} value={qB} onChange={(e) => setQB(e.target.value)} placeholder="Đáp án B" />
              <input style={styles.input} value={qC} onChange={(e) => setQC(e.target.value)} placeholder="Đáp án C" />
              <input style={styles.input} value={qD} onChange={(e) => setQD(e.target.value)} placeholder="Đáp án D" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select style={styles.input} value={qCorrect} onChange={(e) => setQCorrect(e.target.value as "A" | "B" | "C" | "D")}>
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                </select>
                <select style={styles.input} value={qDiff} onChange={(e) => setQDiff(e.target.value as Difficulty)}>
                  <option value="Dễ">Dễ</option><option value="Trung bình">Trung bình</option><option value="Khó">Khó</option>
                </select>
                <>
                  <input list="question-class-options-list" style={styles.input} value={qClassName} onChange={(e) => setQClassName(e.target.value)} placeholder="Nhập lớp cho câu hỏi (có thể để trống)" />
                  <datalist id="question-class-options-list">
                    {classOptions.map((x) => <option key={x} value={x} />)}
                  </datalist>
                </>
                <>
                  <input list="question-group-list" style={styles.input} value={qGroup} onChange={(e) => setQGroup(e.target.value)} placeholder="Tên nhóm câu hỏi, ví dụ: Toán tỉ lệ thức" />
                  <datalist id="question-group-list">
                    {questionGroupOptions.map((x) => <option key={x} value={x} />)}
                  </datalist>
                </>
              </div>
              <input style={styles.input} value={qImageUrl} onChange={(e) => setQImageUrl(e.target.value)} placeholder="Link hình ảnh minh họa của câu hỏi" />
              <input style={styles.input} type="file" accept="image/*" onChange={async (e) => { await handleQuestionImageUpload(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                Bạn có thể chèn ảnh bằng 2 cách: dán link ảnh hoặc chọn file ảnh từ máy tính.
              </div>
              {qImageUrl.trim() && <img src={qImageUrl} alt="preview" style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 10 }} />}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={styles.primaryBtn} onClick={addQuestion}>{questionEditId ? "Cập nhật câu hỏi" : "Thêm câu hỏi"}</button>
                {questionEditId && <button style={styles.secondaryBtn} onClick={clearQuestionForm}>Hủy sửa</button>}
              </div>
            </div>
            <div style={styles.card}>
              <h3>Import câu hỏi từ Excel / dữ liệu máy</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                Định dạng cột: Câu hỏi | A | B | C | D | Đáp án | Mức độ | Lớp | Nhóm | Link ảnh.
              </div>
              <input style={styles.input} type="file" accept=".xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values,text/plain" onChange={async (e) => { await handleQuestionImportFile(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
              <textarea style={styles.textarea} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={"Câu hỏi\tA\tB\tC\tD\tĐáp án\tMức độ\tLớp\tNhóm\tLink ảnh"} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={styles.primaryBtn} onClick={importQuestions}>Import từ vùng dữ liệu</button>
              </div>
            </div>

            <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
              <h3>Danh sách câu hỏi ({filteredQuestions.length})</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <select style={styles.input} value={questionFilterClass} onChange={(e) => setQuestionFilterClass(e.target.value)}>
                  <option value="Tất cả">Tất cả lớp</option>
                  {classOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
                <select style={styles.input} value={questionFilterGroup} onChange={(e) => setQuestionFilterGroup(e.target.value)}>
                  <option value="Tất cả">Tất cả nhóm</option>
                  {questionGroupOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {filteredQuestions.map((q) => (
                  <div key={q.id} style={styles.miniCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div><b>{q.question}</b> · {q.difficulty} · Lớp {q.className || "-"} · Nhóm {q.group} · Đáp án đúng: {q.correctAnswer}</div>
                        <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                          <div>A. {q.optionA}</div>
                          <div>B. {q.optionB}</div>
                          <div>C. {q.optionC}</div>
                          <div>D. {q.optionD}</div>
                        </div>
                        {q.imageUrl && <div style={{ marginTop: 10 }}><img src={q.imageUrl} alt="question" style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 12, border: "1px solid #e2e8f0" }} /></div>}
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        <button style={styles.secondaryBtn} onClick={() => editQuestion(q)}>Sửa câu hỏi</button>
                        <button style={styles.dangerBtn} onClick={() => deleteQuestion(q.id)}>Xóa câu hỏi</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "assignments" && (
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h3>{assignmentEditId ? "Cập nhật bài tập" : "Tạo bài tập"}</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Giao bài theo nhóm lớp. Bộ câu hỏi được chọn trước, sau đó mới chọn nhóm lớp nhận bài.</div>
              <input style={styles.input} value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} placeholder="Tên bài tập" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <>
                  <input list="assignment-group-list" style={styles.input} value={assignmentGroup} onChange={(e) => { setAssignmentGroup(e.target.value); setAssignmentQuestionIds([]); }} placeholder="Bộ câu hỏi cần giao" />
                  <datalist id="assignment-group-list">
                    {questionGroupOptions.map((x) => <option key={x} value={x} />)}
                  </datalist>
                </>
                <>
                  <input list="assignment-class-options-list" style={styles.input} value={assignmentClassName} onChange={(e) => setAssignmentClassName(e.target.value)} placeholder="Nhóm lớp nhận bài, ví dụ 6A, 6B" />
                  <datalist id="assignment-class-options-list">
                    {classOptions.map((x) => <option key={x} value={x} />)}
                  </datalist>
                </>
                <input style={styles.input} type="datetime-local" value={assignmentStartTime} onChange={(e) => setAssignmentStartTime(e.target.value)} />
                <input style={styles.input} type="datetime-local" value={assignmentEndTime} onChange={(e) => setAssignmentEndTime(e.target.value)} />
                <input style={styles.input} value={assignmentDuration} onChange={(e) => setAssignmentDuration(e.target.value)} placeholder="Số phút làm bài" />
                <select style={styles.input} value={assignmentStatus} onChange={(e) => setAssignmentStatus(e.target.value as AssignmentStatus)}>
                  <option value="published">Công khai</option>
                  <option value="draft">Nháp</option>
                  <option value="closed">Đóng</option>
                </select>
              </div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>Chọn câu hỏi trong bộ "{assignmentGroup}" ({assignmentQuestionIds.length})</div>
              <div style={{ display: "grid", gap: 8, maxHeight: 300, overflowY: "auto", marginTop: 10 }}>
                {assignableQuestions.map((q) => (
                  <label key={q.id} style={styles.miniCard}>
                    <input
                      type="checkbox"
                      checked={assignmentQuestionIds.includes(q.id)}
                      onChange={(e) => setAssignmentQuestionIds((prev) => e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id))}
                    /> {q.question}
                  </label>
                ))}
                {!assignableQuestions.length && <div>Chưa có câu hỏi nào trong bộ câu hỏi đã chọn.</div>}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button style={styles.primaryBtn} onClick={saveAssignment}>{assignmentEditId ? "Lưu cập nhật" : "Tạo bài tập"}</button>
                <button style={styles.secondaryBtn} onClick={clearAssignmentForm}>Làm mới</button>
              </div>
            </div>
            <div style={styles.card}>
              <h3>Danh sách bài tập</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {assignments.map((a) => (
                  <div key={a.id} style={styles.miniCard}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{a.title}</div>
                    <div>Bộ câu hỏi: {a.group}</div>
                    <div>Nhóm lớp: {a.className}</div>
                    <div>{getAssignmentWindowText(a)}</div>
                    <div>Trạng thái: {a.status}</div>
                    <div>Số câu hỏi: {a.questionIds.length}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      <button style={styles.primaryBtn} onClick={() => editAssignment(a)}>Sửa</button>
                      <button style={styles.secondaryBtn} onClick={() => deleteAssignment(a.id)}>Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "submissions" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={styles.grid2}>
              <div style={styles.card}>
                <h3>Xếp hạng tuần</h3>
                {weeklyRanking.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {weeklyRanking.slice(0, 5).map((row, idx) => (
                      <div key={row.studentId} style={styles.miniCard}>
                        <b>#{idx + 1} {row.studentName}</b> · {row.className} · {row.guildName}<br />
                        Đúng: {row.totalCorrect} · Bài nộp: {row.submissionCount} · TB thời gian: {formatDurationShort(row.avgDurationSeconds)}
                      </div>
                    ))}
                  </div>
                ) : <div>Chưa có dữ liệu tuần này.</div>}
              </div>
              <div style={styles.card}>
                <h3>Xếp hạng tháng</h3>
                {monthlyRanking.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {monthlyRanking.slice(0, 5).map((row, idx) => (
                      <div key={row.studentId} style={styles.miniCard}>
                        <b>#{idx + 1} {row.studentName}</b> · {row.className} · {row.guildName}<br />
                        Đúng: {row.totalCorrect} · Bài nộp: {row.submissionCount} · TB thời gian: {formatDurationShort(row.avgDurationSeconds)}
                      </div>
                    ))}
                  </div>
                ) : <div>Chưa có dữ liệu tháng này.</div>}
              </div>
            </div>

            <div style={styles.card}>
              <h3>Danh sách bài nộp</h3>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Học sinh</th>
                      <th style={styles.th}>Lớp</th>
                      <th style={styles.th}>Bài tập</th>
                      <th style={styles.th}>Nhóm câu hỏi</th>
                      <th style={styles.th}>Đúng</th>
                      <th style={styles.th}>Thời gian</th>
                      <th style={styles.th}>Bắt đầu</th>
                      <th style={styles.th}>Nộp bài</th>
                      <th style={styles.th}>Điểm</th>
                      <th style={styles.th}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const student = students.find((s) => s.id === sub.studentId);
                      const assignment = assignments.find((a) => a.id === sub.assignmentId);
                      const stats = getSubmissionStats(sub, assignments, questions);
                      return (
                        <tr key={sub.id}>
                          <td style={styles.td}>{student?.name || "-"}</td>
                          <td style={styles.td}>{student?.className || "-"}</td>
                          <td style={styles.td}>{assignment?.title || "-"}</td>
<td style={styles.td}>{assignment?.group || "-"}</td>
                          <td style={styles.td}>{stats.correctCount}/{stats.totalQuestions}</td>
                          <td style={styles.td}>{formatDurationShort(stats.durationSeconds)}</td>
                          <td style={styles.td}>{formatDateTime(sub.startedAt)}</td>
                          <td style={styles.td}>{formatDateTime(sub.submittedAt)}</td>
                          <td style={styles.td}>{sub.score}</td>
                          <td style={styles.td}>{sub.autoSubmitted ? "Tự nộp khi thoát/hết giờ" : "Nộp bình thường"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "rankings" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={styles.card}>
              <h3>Bảng xếp hạng lực chiến cá nhân</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Xếp theo lực chiến thú hiện tại, sau đó xét tư chất và cấp thú.</div>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Hạng</th>
                      <th style={styles.th}>Học sinh</th>
                      <th style={styles.th}>Lớp</th>
                      <th style={styles.th}>Quân đoàn</th>
                      <th style={styles.th}>Thú</th>
                      <th style={styles.th}>Tư chất</th>
                      <th style={styles.th}>Cấp thú</th>
                      <th style={styles.th}>Lực chiến</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combatPowerRanking
                      .filter((row) => rankingClassFilter === "Tất cả" || row.className === rankingClassFilter)
                      .map((row, idx) => (
                        <tr key={`combat-${row.studentId}`}>
                          <td style={styles.td}>{idx + 1}</td>
                          <td style={styles.td}>{row.studentName}</td>
                          <td style={styles.td}>{row.className}</td>
                          <td style={styles.td}>{row.guildName}</td>
                          <td style={styles.td}>{row.beastName}</td>
                          <td style={styles.td}>{row.quality}</td>
                          <td style={styles.td}>{row.level}</td>
                          <td style={styles.td}>{row.power}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={styles.card}>
              <h3>Lọc xếp hạng</h3>
              <select style={styles.input} value={rankingClassFilter} onChange={(e) => setRankingClassFilter(e.target.value)}>
                <option value="Tất cả">Tất cả lớp</option>
                {classOptions.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>

            <div style={styles.card}>
              <h3>Bảng xếp hạng cá nhân</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Xếp theo tổng điểm, nếu bằng nhau thì ưu tiên lực chiến thú cao hơn.</div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Hạng</th>
                      <th style={styles.th}>Học sinh</th>
                      <th style={styles.th}>Lớp</th>
                      <th style={styles.th}>Quân đoàn</th>
                      <th style={styles.th}>Điểm tuần</th>
                      <th style={styles.th}>Tổng điểm</th>
                      <th style={styles.th}>Lực chiến</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalPowerRanking
                      .filter((row) => rankingClassFilter === "Tất cả" || row.className === rankingClassFilter)
                      .map((row, idx) => (
                      <tr key={`personal-${row.studentId}`}>
                        <td style={styles.td}>{idx + 1}</td>
                        <td style={styles.td}>{row.studentName}</td>
                        <td style={styles.td}>{row.className}</td>
                        <td style={styles.td}>{row.guildName}</td>
                        <td style={styles.td}>{row.weeklyPoints}</td>
                        <td style={styles.td}>{row.totalPoints}</td>
                        <td style={styles.td}>{row.power}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.card}>
              <h3>Bảng xếp hạng quân đoàn</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Xếp theo tổng điểm của thành viên, sau đó đến tổng lực chiến và độ hiếm đồ.</div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Hạng</th>
                      <th style={styles.th}>Quân đoàn</th>
                      <th style={styles.th}>LV</th>
                      <th style={styles.th}>Thành viên</th>
                      <th style={styles.th}>Tổng điểm tuần</th>
                      <th style={styles.th}>Tổng điểm</th>
                      <th style={styles.th}>Tổng lực chiến</th>
                      <th style={styles.th}>Điểm đồ hiếm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guildRanking.map((row, idx) => (
                      <tr key={`guild-${row.guildId}`}>
                        <td style={styles.td}>{idx + 1}</td>
                        <td style={styles.td}>{row.guildName}</td>
                        <td style={styles.td}>{row.level}</td>
                        <td style={styles.td}>{row.memberCount}</td>
                        <td style={styles.td}>{row.totalWeeklyPoints}</td>
                        <td style={styles.td}>{row.totalPoints}</td>
                        <td style={styles.td}>{row.totalPower}</td>
                        <td style={styles.td}>{row.rareItemScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.card}>
              <h3>Bảng xếp hạng đồ hiếm</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Cộng điểm theo độ hiếm đồ đang có trong kho đồ. Cam cao nhất, Trắng thấp nhất.</div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Hạng</th>
                      <th style={styles.th}>Học sinh</th>
                      <th style={styles.th}>Lớp</th>
                      <th style={styles.th}>Quân đoàn</th>
                      <th style={styles.th}>Điểm đồ hiếm</th>
                      <th style={styles.th}>Số món</th>
                      <th style={styles.th}>Top đồ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rareItemRanking
                      .filter((row) => rankingClassFilter === "Tất cả" || row.className === rankingClassFilter)
                      .map((row, idx) => (
                      <tr key={`rare-${row.studentId}`}>
                        <td style={styles.td}>{idx + 1}</td>
                        <td style={styles.td}>{row.studentName}</td>
                        <td style={styles.td}>{row.className}</td>
                        <td style={styles.td}>{row.guildName}</td>
                        <td style={styles.td}>{row.rareItemScore}</td>
                        <td style={styles.td}>{row.itemCount}</td>
                        <td style={styles.td}>{row.topItems.length ? row.topItems.map((item) => `${item.slot} ${item.rarity}${item.damagePercent ? ` (+${item.damagePercent}% dam)` : ""}`).join(", ") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.card}>
              <h3>Bảng xếp hạng theo tuần</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Ưu tiên số câu đúng nhiều hơn. Nếu bằng nhau, ưu tiên thời gian trung bình ngắn hơn.</div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Hạng</th>
                      <th style={styles.th}>Học sinh</th>
                      <th style={styles.th}>Lớp</th>
                      <th style={styles.th}>Quân đoàn</th>
                      <th style={styles.th}>Tổng đúng</th>
                      <th style={styles.th}>Số bài</th>
                      <th style={styles.th}>TB thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyRanking.map((row, idx) => (
                      <tr key={`week-${row.studentId}`}>
                        <td style={styles.td}>{idx + 1}</td>
                        <td style={styles.td}>{row.studentName}</td>
                        <td style={styles.td}>{row.className}</td>
                        <td style={styles.td}>{row.guildName}</td>
                        <td style={styles.td}>{row.totalCorrect}</td>
                        <td style={styles.td}>{row.submissionCount}</td>
                        <td style={styles.td}>{formatDurationShort(row.avgDurationSeconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.card}>
              <h3>Bảng xếp hạng theo tháng</h3>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Ưu tiên số câu đúng nhiều hơn. Nếu bằng nhau, ưu tiên thời gian trung bình ngắn hơn.</div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Hạng</th>
                      <th style={styles.th}>Học sinh</th>
                      <th style={styles.th}>Lớp</th>
                      <th style={styles.th}>Quân đoàn</th>
                      <th style={styles.th}>Tổng đúng</th>
                      <th style={styles.th}>Số bài</th>
                      <th style={styles.th}>TB thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRanking.map((row, idx) => (
                      <tr key={`month-${row.studentId}`}>
                        <td style={styles.td}>{idx + 1}</td>
                        <td style={styles.td}>{row.studentName}</td>
                        <td style={styles.td}>{row.className}</td>
                        <td style={styles.td}>{row.guildName}</td>
                        <td style={styles.td}>{row.totalCorrect}</td>
                        <td style={styles.td}>{row.submissionCount}</td>
                        <td style={styles.td}>{formatDurationShort(row.avgDurationSeconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "events" && (
          <div style={styles.card}>
            <h3>Nhật ký sự kiện</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {eventLogs.map((log) => (
                <div key={log.id} style={styles.miniCard}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{formatDateTime(log.createdAt)} · {log.type}</div>
                  <div>{log.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div style={styles.card}>
            <h3>Đổi mật khẩu Admin</h3>
            <input style={styles.input} type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} placeholder="Mật khẩu cũ" />
            <input style={styles.input} type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Mật khẩu mới" />
            <button style={styles.primaryBtn} onClick={changeAdminPassword}>Đổi mật khẩu</button>
          </div>
        )}
      </div>

      <div style={styles.footer}>Bản quyền tác giả: Nguyễn Đức Doanh - THCS Đông Xá - Vân Đồn - Quảng Ninh. SĐT: 0388584296</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loginBg: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #0f172a, #2563eb)", padding: 24 },
  loginCard: { width: 460, maxWidth: "100%", background: "white", borderRadius: 24, padding: 28, boxShadow: "0 20px 40px rgba(0,0,0,0.2)", display: "grid", gap: 12 },
  header: { background: "linear-gradient(135deg, #0f172a, #1d4ed8)", color: "white", padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerStudent: { background: "linear-gradient(135deg, #0f172a, #1d4ed8)", color: "white", padding: 20, borderRadius: 20, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  tabs: { display: "flex", gap: 10, flexWrap: "wrap", padding: 16 },
  tab: { padding: "10px 14px", borderRadius: 12, border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: 700 },
  activeTab: { padding: "10px 14px", borderRadius: 12, border: "1px solid #0f172a", background: "#0f172a", color: "white", cursor: "pointer", fontWeight: 700 },
  card: { background: "white", borderRadius: 20, padding: 20, boxShadow: "0 10px 30px rgba(15,23,42,0.06)", border: "1px solid #e2e8f0" },
  miniCard: { background: "#f8fafc", borderRadius: 12, padding: 12, border: "1px solid #e2e8f0" },
  noticeBox: { marginTop: 12, marginBottom: 8, padding: "12px 14px", borderRadius: 12, background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", fontWeight: 700 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  input: { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #cbd5e1", outline: "none", marginTop: 8, marginBottom: 8, boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 110, padding: "12px 14px", borderRadius: 12, border: "1px solid #cbd5e1", outline: "none", marginTop: 8, marginBottom: 8, boxSizing: "border-box" },
  primaryBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid #1d4ed8", background: "#2563eb", color: "white", cursor: "pointer", fontWeight: 700 },
  secondaryBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid #cbd5e1", background: "white", color: "#0f172a", cursor: "pointer", fontWeight: 700 },
  dangerBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid #dc2626", background: "#ef4444", color: "white", cursor: "pointer", fontWeight: 700 },
  softBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)", color: "white", cursor: "pointer", fontWeight: 700 },
  softDarkBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)", color: "white", cursor: "pointer", fontWeight: 700 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 16, background: "#ffffff" },
  table: { width: "100%", minWidth: 760, borderCollapse: "separate", borderSpacing: 0, fontSize: 15, lineHeight: 1.45 },
  th: { padding: "14px 16px", textAlign: "left", fontWeight: 800, color: "#0f172a", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", verticalAlign: "middle" },
  td: { padding: "12px 16px", textAlign: "left", color: "#334155", borderBottom: "1px solid #eef2f7", verticalAlign: "top" },
  footer: { textAlign: "center", color: "#475569", padding: 18, fontSize: 13 },
  copyright: { textAlign: "center", color: "#64748b", fontSize: 12, marginTop: 8 },
  avatarRow: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" },
  avatarBadge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 13, color: "#334155" },
  avatarSm: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0", flexShrink: 0 },
  avatarMd: { width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid #e2e8f0", flexShrink: 0 },
  avatarLg: { width: 120, height: 120, borderRadius: 16, objectFit: "cover", border: "1px solid #cbd5e1", background: "#fff" },
  avatarFallback: { width: 72, height: 72, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1d4ed8, #0f172a)", color: "#fff", fontSize: 28, fontWeight: 800, flexShrink: 0 },
  avatarFallbackSm: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1d4ed8, #0f172a)", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 },
  qualityBadge: { display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: 999, border: "1px solid transparent", fontSize: 12, fontWeight: 800 },
  qualityBadgeSm: { display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: 999, border: "1px solid transparent", fontSize: 11, fontWeight: 800 },
  beastFrame: { width: 300, height: 300, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "8px auto 16px", transition: "all 0.3s ease", position: "relative" },
  beastImage: { width: "94%", height: "94%", objectFit: "contain", display: "block" },
  eggFrame: { width: 300, height: 300, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "8px auto 16px", background: "radial-gradient(circle at center, rgba(255,255,255,0.08), rgba(15,23,42,0.95))", transition: "all 0.3s ease", position: "relative" },
  eggImage: { width: "82%", height: "82%", objectFit: "contain", display: "block" },
  studentBeastGearRow: { display: "grid", gridTemplateColumns: "minmax(340px, 1.05fr) minmax(0, 1.95fr)", gap: 18, alignItems: "stretch" },
  studentBeastPanel: { display: "flex", flexDirection: "column", justifyContent: "flex-start" },
  studentBeastFrame: { width: "100%", minHeight: 388, borderRadius: 34, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "8px auto 0", position: "relative" },
  studentBeastImage: { width: "96%", height: "96%", objectFit: "contain", display: "block" },
  studentGearPanel: { minWidth: 0, display: "flex", flexDirection: "column" },
  studentGearGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, width: "100%" },
  studentGearCard: { minHeight: 187, borderRadius: 28, padding: 12, border: "1.5px solid #334155", background: "linear-gradient(135deg, rgba(2,6,23,0.98), rgba(15,23,42,0.98))", display: "grid", gridTemplateColumns: "40% 60%", alignItems: "stretch", gap: 12, boxShadow: "0 12px 28px rgba(15,23,42,0.28)" },
  studentGearVisual: { borderRadius: 22, padding: 10, background: "radial-gradient(circle at center, rgba(255,255,255,0.08), rgba(15,23,42,0.86))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", minHeight: "100%" },
  studentGearIconWrap: { flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  studentGearIcon: { width: "92%", height: "92%", objectFit: "contain", filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.35))" },
  studentGearInfo: { display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, minWidth: 0 },
  studentGearStats: { display: "grid", gap: 6 },
  beastItemsRow: { display: "grid", gridTemplateColumns: "minmax(390px, 1.05fr) minmax(0, 2fr)", alignItems: "start", columnGap: 24, rowGap: 16 },
  beastPanelInline: { width: "100%", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemsPanelInline: { minWidth: 0, width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignSelf: "stretch" },
  beastFrameWide: { width: 390, height: 390, borderRadius: 36, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "0 auto", transition: "all 0.3s ease", flexShrink: 0, position: "relative" },
  beastImageWide: { width: "96%", height: "96%", objectFit: "contain", display: "block" },
  eggFrameWide: { width: 390, height: 390, borderRadius: 36, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "0 auto", background: "radial-gradient(circle at center, rgba(255,255,255,0.08), rgba(15,23,42,0.95))", transition: "all 0.3s ease", flexShrink: 0, position: "relative" },
  eggImageWide: { width: "80%", height: "80%", objectFit: "contain", display: "block" },
  itemGridTwoRows: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, alignItems: "stretch", width: "100%" },
  itemCardSm: { minHeight: 185, height: 185, borderRadius: 32, padding: 14, border: "1.5px solid #334155", background: "linear-gradient(135deg, rgba(2,6,23,0.98), rgba(15,23,42,0.98))", display: "grid", gridTemplateColumns: "40% 60%", alignItems: "stretch", textAlign: "left", gap: 14, transition: "transform 0.2s ease, box-shadow 0.2s ease", boxShadow: "0 14px 30px rgba(15,23,42,0.18)", position: "relative", overflow: "hidden", width: "100%" },
  itemVisualPane: { borderRadius: 26, background: "radial-gradient(circle at center, rgba(30,41,59,0.88), rgba(2,6,23,0.96))", border: "1px solid rgba(148,163,184,0.18)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: 12, minWidth: 0 },
  itemSlotHeader: { alignSelf: "flex-start", padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.96)", color: "#0f172a", fontSize: 13, fontWeight: 800, boxShadow: "0 8px 18px rgba(15,23,42,0.14)" },
  itemIconWrapSm: { flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", borderRadius: 20, minHeight: 0 },
  itemIconSm: { width: "96%", height: "96%", objectFit: "contain", display: "block", filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.42))" },
  itemInfoPane: { borderRadius: 26, background: "linear-gradient(180deg, rgba(15,23,42,0.74), rgba(2,6,23,0.64))", border: "1px solid rgba(148,163,184,0.16)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 },
  itemStatsList: { display: "grid", gap: 6, marginTop: 10 },
  itemStatLineStrong: { fontSize: 14, fontWeight: 800, color: "#f8fafc", lineHeight: 1.35 },
  itemStatLine: { fontSize: 13, fontWeight: 700, color: "#cbd5e1", lineHeight: 1.35 },
  itemRarityBadgeInline: { alignSelf: "flex-start", padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 12, fontWeight: 800, border: "1px solid rgba(148,163,184,0.2)" },
  beastDisplayRow: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%" },
  beastMetaColumn: { display: "none" },
  beastSideBadge: { padding: "6px 10px", borderRadius: 999, border: "1px solid", fontSize: 13, fontWeight: 800, lineHeight: 1.2, whiteSpace: "nowrap", boxShadow: "0 4px 10px rgba(15,23,42,0.08)" },
  beastSideBadgeMuted: { padding: "6px 10px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontSize: 12, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap" },
  beastSpeciesText: { fontSize: 12, fontWeight: 700, color: "#475569", lineHeight: 1.4 },
  beastOverlayTop: { position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "flex-start", pointerEvents: "none" },
  beastOverlayBottom: { position: "absolute", left: 14, right: 14, bottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", pointerEvents: "none" },
  beastOverlayBadge: { padding: "8px 14px", borderRadius: 999, border: "1px solid", fontSize: 16, fontWeight: 800, lineHeight: 1.2, whiteSpace: "nowrap", boxShadow: "0 8px 24px rgba(15,23,42,0.18)", backdropFilter: "blur(6px)" },
  beastOverlayMuted: { padding: "7px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.28)", background: "rgba(15,23,42,0.58)", color: "#f8fafc", fontSize: 13, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(15,23,42,0.18)", backdropFilter: "blur(6px)" },

  beastAnimated: { animation: "beastFloat 3.6s ease-in-out infinite", transformOrigin: "center bottom" },
  beastAnimatedSlow: { animation: "beastFloat 4.6s ease-in-out infinite", transformOrigin: "center bottom" },
  itemAnimated: { animation: "itemPulse 2.8s ease-in-out infinite" },
  eggAnimated: { animation: "eggPulse 2.6s ease-in-out infinite", transformOrigin: "center center" },
  eggGlowAnimated: { animation: "eggGlow 2.4s ease-in-out infinite" },
  serverBanner: { marginBottom: 16, borderRadius: 20, padding: "16px 18px", background: "linear-gradient(135deg, rgba(254,249,195,0.98), rgba(255,237,213,0.98), rgba(254,215,170,0.96))", border: "1px solid rgba(245,158,11,0.35)", animation: "bannerPulse 2.8s ease-in-out infinite", position: "relative", overflow: "hidden" },
  serverBannerBadge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(146,64,14,0.08)", color: "#9a3412", fontSize: 12, fontWeight: 900, letterSpacing: 0.6 },
  serverBannerTitle: { marginTop: 10, fontSize: 24, fontWeight: 900, color: "#7c2d12" },
  serverBannerText: { marginTop: 6, fontSize: 15, fontWeight: 700, color: "#9a3412", lineHeight: 1.5 },
  hatchCelebrationFrame: { overflow: "visible" },
  hatchBurstRing: { position: "absolute", inset: -16, borderRadius: "50%", border: "3px solid rgba(251,191,36,0.55)", animation: "hatchBurst 1.8s ease-out infinite", pointerEvents: "none" },
  hatchBurstSparkLeft: { position: "absolute", left: -10, top: "44%", fontSize: 24, animation: "hatchSparkle 1.6s ease-out infinite", pointerEvents: "none" },
  hatchBurstSparkRight: { position: "absolute", right: -8, top: "36%", fontSize: 24, animation: "hatchSparkle 1.6s ease-out 0.35s infinite", pointerEvents: "none" },
  hatchBurstSparkTop: { position: "absolute", top: -16, left: "50%", marginLeft: -12, fontSize: 24, animation: "hatchSparkle 1.6s ease-out 0.15s infinite", pointerEvents: "none" },
  hatchCelebrationText: { marginTop: 10, textAlign: "center", padding: "10px 12px", borderRadius: 14, background: "linear-gradient(135deg, rgba(254,240,138,0.4), rgba(253,186,116,0.3))", color: "#9a3412", fontSize: 13, fontWeight: 800, border: "1px solid rgba(245,158,11,0.28)" },
};
