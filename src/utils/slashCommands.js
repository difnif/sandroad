// Slash Command System for Sandroad
// Type /command in any name field to transform the item
//
// Usage: user types "/api" → item becomes API building type
//        user types "/rest" → road becomes REST vehicle
//        user types "/redux" → item gets Redux architecture pattern tag
//
// Returns: { handled, updates, displayName }
//   handled: true if a command was recognized
//   updates: object to merge into the node/road (e.g. { buildingType: 'api' })
//   displayName: cleaned name (command stripped, or auto-generated)

import { BUILDING_TYPES, VEHICLE_TYPES, ROAD_TYPES, DATA_TYPES } from '../constants/unitTypes.js';
import { ARCH_PATTERNS, ARCH_LAYERS } from '../constants/archPatterns.js';

// ========== COMMAND REGISTRY ==========

const COMMANDS = {};

// Building type commands: /page, /api, /db, /auth, etc.
for (const [key, info] of Object.entries(BUILDING_TYPES)) {
  COMMANDS[`/${key}`] = {
    category: 'building',
    apply: (name) => ({
      handled: true,
      updates: { buildingType: key },
      displayName: name || info.label_en
    }),
    hint: `${info.emoji} ${info.label_ko} (${info.label_en})`,
    desc_ko: info.desc_ko,
    desc_en: info.desc_en
  };
}

// Aliases for common building types
const BUILDING_ALIASES = {
  '/screen': 'page', '/view': 'page', '/tab': 'page',
  '/widget': 'component', '/comp': 'component', '/ui': 'component',
  '/rest': 'api', '/graphql': 'api', '/endpoint': 'api',
  '/database': 'db', '/table': 'db', '/collection': 'db', '/firestore': 'db', '/supabase': 'db',
  '/login': 'auth', '/permission': 'auth', '/token': 'auth', '/oauth': 'auth',
  '/s3': 'storage', '/bucket': 'storage', '/upload': 'storage', '/cdn': 'storage',
  '/push': 'noti', '/email': 'noti', '/sms': 'noti', '/fcm': 'noti',
  '/pay': 'payment', '/stripe': 'payment', '/billing': 'payment',
  '/ga': 'analytics', '/tracking': 'analytics', '/mixpanel': 'analytics',
  '/redis': 'cache', '/memcache': 'cache',
  '/sqs': 'queue', '/kafka': 'queue', '/cron': 'queue', '/batch': 'queue',
  '/webhook': 'external', '/3rd': 'external', '/thirdparty': 'external',
  '/env': 'config', '/settings': 'config', '/dotenv': 'config',
};

for (const [alias, target] of Object.entries(BUILDING_ALIASES)) {
  const info = BUILDING_TYPES[target];
  COMMANDS[alias] = {
    category: 'building',
    apply: (name) => ({
      handled: true,
      updates: { buildingType: target },
      displayName: name || info.label_en
    }),
    hint: `→ ${info.emoji} ${info.label_ko}`,
    desc_ko: `${alias} → ${info.label_ko}`,
    desc_en: `${alias} → ${info.label_en}`
  };
}

// Vehicle type commands: /car, /drone, /truck, etc.
for (const [key, info] of Object.entries(VEHICLE_TYPES)) {
  COMMANDS[`/${key}`] = COMMANDS[`/${key}`] || {
    category: 'vehicle',
    apply: (name) => ({
      handled: true,
      updates: { vehicle: key },
      displayName: name || info.label_en
    }),
    hint: `${info.emoji} ${info.label_ko} (${info.desc_ko})`,
    desc_ko: info.desc_ko,
    desc_en: info.desc_en
  };
}

// Vehicle aliases
const VEHICLE_ALIASES = {
  '/sync': 'car', '/async': 'drone', '/ws': 'drone', '/websocket': 'drone',
  '/realtime': 'drone', '/socket': 'drone',
  '/manual': 'worker', '/admin': 'worker',
  '/upload': 'truck', '/bulk': 'truck', '/file': 'truck',
  '/poll': 'bike', '/event': 'bike', '/sse': 'bike',
  '/schedule': 'train', '/crontab': 'train', '/daily': 'train',
  '/fallback': 'ambulance', '/error': 'ambulance', '/retry': 'ambulance',
  '/guard': 'police', '/middleware': 'police', '/interceptor': 'police',
};

for (const [alias, target] of Object.entries(VEHICLE_ALIASES)) {
  if (COMMANDS[alias]) continue; // don't override building commands
  const info = VEHICLE_TYPES[target];
  COMMANDS[alias] = {
    category: 'vehicle',
    apply: (name) => ({
      handled: true,
      updates: { vehicle: target },
      displayName: name || info.label_en
    }),
    hint: `→ ${info.emoji} ${info.label_ko}`,
    desc_ko: info.desc_ko,
    desc_en: info.desc_en
  };
}

// Road type commands
const ROAD_COMMANDS = {
  '/highway': 'highway', '/main': 'main', '/sub': 'sub', '/tunnel': 'tunnel',
  '/pipe': 'highway', '/backbone': 'highway',
  '/internal': 'sub', '/bg': 'tunnel', '/background': 'tunnel',
};

for (const [cmd, target] of Object.entries(ROAD_COMMANDS)) {
  if (COMMANDS[cmd]) continue;
  const info = ROAD_TYPES[target];
  COMMANDS[cmd] = {
    category: 'road',
    apply: (name) => ({
      handled: true,
      updates: { type: target },
      displayName: name || info.label_en
    }),
    hint: `${info.label_ko} (${info.label_en})`,
    desc_ko: info.desc_ko,
    desc_en: info.desc_en
  };
}

// Data type commands
for (const [key, info] of Object.entries(DATA_TYPES)) {
  const cmd = `/data:${key}`;
  COMMANDS[cmd] = {
    category: 'data',
    apply: (name) => ({
      handled: true,
      updates: { dataType: key },
      displayName: name
    }),
    hint: `${info.emoji} ${info.label_ko}`,
    desc_ko: info.desc_ko || '',
    desc_en: info.desc_en || ''
  };
}

// Architecture pattern commands: /mvc, /mvvm, /redux, etc.
for (const [key, info] of Object.entries(ARCH_PATTERNS)) {
  COMMANDS[`/${key}`] = {
    category: 'architecture',
    apply: (name) => ({
      handled: true,
      updates: { archPattern: key },
      displayName: name
    }),
    hint: `🏗️ ${info.label} — ${info.desc_ko}`,
    desc_ko: info.desc_ko,
    desc_en: info.desc_en
  };
}

// Architecture layer commands: /model, /viewmodel, /controller, etc.
for (const [key, info] of Object.entries(ARCH_LAYERS)) {
  const cmd = `/${key}`;
  if (COMMANDS[cmd]) continue;
  COMMANDS[cmd] = {
    category: 'layer',
    apply: (name) => ({
      handled: true,
      updates: { archLayer: key, buildingType: info.defaultBuildingType || 'component' },
      displayName: name || info.label
    }),
    hint: `📐 ${info.label} — ${info.desc_ko}`,
    desc_ko: info.desc_ko,
    desc_en: info.desc_en
  };
}

// ========== PARSER ==========

// Parse input text for slash commands
// Input: "/api UserService" → command="/api", remainingName="UserService"
// Input: "/mvc /api AuthController" → commands=["/mvc", "/api"], name="AuthController"
// Input: "just a name" → no commands
export function parseSlashInput(input) {
  if (!input || !input.includes('/')) {
    return { commands: [], name: input, hasCommands: false };
  }

  const tokens = input.trim().split(/\s+/);
  const commands = [];
  const nameTokens = [];

  for (const token of tokens) {
    if (token.startsWith('/') && COMMANDS[token.toLowerCase()]) {
      commands.push(token.toLowerCase());
    } else {
      nameTokens.push(token);
    }
  }

  return {
    commands,
    name: nameTokens.join(' '),
    hasCommands: commands.length > 0
  };
}

// Apply all parsed commands, return merged updates + displayName
export function applySlashCommands(input) {
  const { commands, name, hasCommands } = parseSlashInput(input);

  if (!hasCommands) {
    return { handled: false, updates: {}, displayName: input };
  }

  let mergedUpdates = {};
  let displayName = name;

  for (const cmd of commands) {
    const handler = COMMANDS[cmd];
    if (!handler) continue;
    const result = handler.apply(displayName);
    mergedUpdates = { ...mergedUpdates, ...result.updates };
    if (!displayName && result.displayName) {
      displayName = result.displayName;
    }
  }

  return {
    handled: true,
    updates: mergedUpdates,
    displayName: displayName || 'unnamed'
  };
}

// ========== AUTOCOMPLETE ==========

// Get command suggestions for partial input
export function getCommandSuggestions(partial, lang = 'ko') {
  if (!partial || !partial.startsWith('/')) return [];

  const lower = partial.toLowerCase();
  const results = [];

  for (const [cmd, info] of Object.entries(COMMANDS)) {
    if (cmd.startsWith(lower)) {
      results.push({
        command: cmd,
        category: info.category,
        hint: info.hint,
        desc: lang === 'ko' ? info.desc_ko : info.desc_en
      });
    }
  }

  // Sort: exact prefix first, then by category priority
  const catOrder = { building: 0, architecture: 1, layer: 2, vehicle: 3, road: 4, data: 5 };
  results.sort((a, b) => {
    const ca = catOrder[a.category] ?? 99;
    const cb = catOrder[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    return a.command.length - b.command.length;
  });

  return results.slice(0, 10);
}

// Get all commands grouped by category (for help display)
export function getAllCommands(lang = 'ko') {
  const grouped = {};
  for (const [cmd, info] of Object.entries(COMMANDS)) {
    if (!grouped[info.category]) grouped[info.category] = [];
    grouped[info.category].push({
      command: cmd,
      hint: info.hint,
      desc: lang === 'ko' ? info.desc_ko : info.desc_en
    });
  }
  return grouped;
}

export const CATEGORY_LABELS = {
  building:     { ko: '건물 유형', en: 'Building Type' },
  vehicle:      { ko: '이동 수단', en: 'Vehicle' },
  road:         { ko: '도로 유형', en: 'Road Type' },
  data:         { ko: '데이터 유형', en: 'Data Type' },
  architecture: { ko: '아키텍처 패턴', en: 'Architecture Pattern' },
  layer:        { ko: '아키텍처 레이어', en: 'Architecture Layer' },
};
