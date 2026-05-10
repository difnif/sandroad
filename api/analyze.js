// Vercel Serverless: /api/analyze
// Multi-step: scan, analyze, compare, verify, notes, inspect

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { step, data } = req.body;
  if (!step) return res.status(400).json({ error: 'step required' });

  try {
    const { system, user } = buildPrompt(step, data);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, system, messages: [{ role: 'user', content: user }] })
    });
    if (!response.ok) { const err = await response.text(); return res.status(response.status).json({ error: `API ${response.status}: ${err.slice(0, 200)}` }); }
    const result = await response.json();
    const text = result.content?.[0]?.text || '';
    let parsed = null;
    try { const m = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[1] || m[0]); } catch {}
    return res.status(200).json({ text, parsed });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

function buildPrompt(step, data) {
  const lang = data?.lang || 'ko';
  const L = lang === 'ko';

  switch (step) {
    case 'scan':
      return {
        system: `You analyze code projects. Given file list + package.json, identify framework, pattern, key files. Respond ONLY in JSON:
{"framework":"...","detectedPattern":"mvc/redux/clean/etc or null","keyFiles":["path"...],"structure":{"pages":[],"api":[],"models":[],"components":[],"config":[],"other":[]},"summary":"brief description"}`,
        user: `File list:\n${data.fileList}\n\npackage.json:\n${data.packageJson || 'not found'}`
      };

    case 'analyze':
      return {
        system: `You analyze source code for "sandroad" tool. Building types: page,component,api,db,auth,storage,noti,payment,analytics,cache,queue,external,config. Respond ONLY in JSON:
{"columns":[{"label":"name","color":"sand/clay/river/moss/brick/sky"}],"items":[{"column":0,"name":"...","parentName":null,"buildingType":"page","description":"..."}],"roads":[{"from":"name","to":"name","roadType":"main/sub","vehicle":"car/drone/truck","dataType":"content/user/auth","label":""}],"detectedPattern":"...","summary":"..."}`,
        user: `Scan:\n${data.scanSummary}\n\nFiles:\n${data.fileContents}`
      };

    case 'compare':
      return {
        system: `You compare a code analysis result with an existing sandroad project structure.
For each item in the code analysis, determine if it matches an existing item, is new, or is a renamed version.
For connections (roads), find which exist and which are missing.

Use ${L ? 'Korean' : 'English'} for descriptions.

Respond ONLY in JSON:
{
  "matched": [
    { "codeName": "from code", "sandName": "from sandroad", "confidence": "high/medium/low", "note": "why matched" }
  ],
  "newItems": [
    { "name": "...", "buildingType": "...", "parentName": null, "column": 0, "description": "..." }
  ],
  "possibleRenames": [
    { "codeName": "...", "sandName": "...", "reason": "why might be same" }
  ],
  "missingConnections": [
    { "from": "item name", "to": "item name", "vehicle": "car/drone/etc", "dataType": "content/user/etc", "reason": "found in code import/route" }
  ],
  "existingConnections": [
    { "from": "...", "to": "...", "note": "already connected" }
  ],
  "summary": "brief comparison summary"
}`,
        user: `Code analysis result:\n${data.codeStructure}\n\nExisting sandroad project:\n${data.sandStructure}`
      };

    case 'verify':
      return {
        system: `Review architecture structure with user feedback. Respond ONLY in JSON:
{"addItems":[{"column":0,"name":"...","parentName":null,"buildingType":"...","description":"..."}],"removeItems":["name"],"addRoads":[{"from":"...","to":"...","roadType":"...","vehicle":"...","dataType":"..."}],"removeRoads":[{"from":"...","to":"..."}],"notes":"summary"}`,
        user: `Structure:\n${data.currentStructure}\n\nFeedback: ${data.feedback}`
      };

    case 'notes':
      return {
        system: `Organize development notes into categories. Respond ONLY in JSON:
{"devNotes":[{"category":"requirement/constraint/integration/design/performance/security","content":"...","priority":"high/medium/low"}],"summary":"..."}`,
        user: `Structure:\n${data.structureSummary}\n\nNotes:\n${data.rawNotes}`
      };

    case 'inspect':
      return {
        system: `Analyze project architecture and suggest patterns. Use ${L ? 'Korean' : 'English'}. Respond ONLY in JSON:
{"patterns":[{"name":"MVC/MVVM/Redux/Clean/etc","confidence":"high/medium/low","reason":"why fits","changes":["change1","change2"]}],"generalAdvice":"overall advice","missingElements":["..."],"conflictingConnections":["..."]}`,
        user: `Structure:\n${data.structureSummary}\n\nLocal inspection:\n${data.localResults}`
      };

    case 'infra':
      return {
        system: `You are an infrastructure architect for an app/service.
Given the current project structure, generate a COMPREHENSIVE (120% generous) infrastructure/settings district.
Be generous — include everything the app might need. Users can delete what they don't need.

Group items into a main district and sub-districts if there are many items.
Each item needs: name, buildingType (config/noti/auth/analytics/cache/storage/external/queue), children array.
Valid buildingTypes: page, component, api, db, auth, storage, noti, payment, analytics, cache, queue, external, config, custom.

Use ${data.lang === 'ko' ? 'Korean' : 'English'} for names.

Respond ONLY in JSON:
{
  "districts": [
    {
      "label": "⚙️ 인프라",
      "color": "stone",
      "isSubDistrict": false,
      "items": [
        { "name": "알림 설정", "buildingType": "noti", "children": [
          { "name": "푸시 알림", "buildingType": "noti" },
          { "name": "이메일 알림", "buildingType": "noti" }
        ]}
      ]
    },
    {
      "label": "🔒 보안/권한",
      "color": "stone",
      "isSubDistrict": true,
      "parentDistrict": "⚙️ 인프라",
      "items": [...]
    }
  ],
  "memo": "이 인프라 구역에 대한 간단한 설명..."
}

Consider including: notifications (push/email/SMS/in-app), sound/vibration, theme/darkmode, language/i18n, account management, privacy settings, data backup/export, cache management, error logging/monitoring, analytics/tracking consent, accessibility, performance settings, network/offline mode, update management, security settings, permissions, rate limiting, API keys management, webhook configuration, scheduled tasks, storage management, CDN settings, and any other infrastructure the project might need.`,
        user: data.structureSummary
      };

    default:
      return { system: 'You are a helpful assistant.', user: JSON.stringify(data) };
  }
}
