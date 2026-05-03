// Vercel Serverless Function: /api/consult
// Proxies requests to Claude API for structure consultation
//
// Required: Set ANTHROPIC_API_KEY in Vercel Environment Variables
// Dashboard → Settings → Environment Variables → Add

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { message, actions, projectStructure, projectName, themeId } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const lang = themeId === 'sand' ? 'ko' : 'en';

  // Build system prompt
  const systemPrompt = lang === 'ko'
    ? `당신은 "sandroad" 앱의 구조 설계 컨설턴트입니다.
사용자가 앱/서비스의 구조를 트리 형태로 정리하고 있습니다.
구조는 "구역(컬럼) > 대지(1차) > 건물(2차) > 하위건물(3차+)" 계층입니다.

당신의 역할:
- 구조 개선 제안 (하위 항목 추가, 재배치, 이름 변경 등)
- 누락된 기능/항목 지적
- 구조적 문제점 분석
- 사용자의 액션 기록을 참고하여 맥락에 맞는 조언

응답 규칙:
- 한국어로 답변
- 구체적인 제안은 "제안:" 으로 시작
- 구조 변경 제안 시 어떤 위치에 어떤 항목을 추가/이동할지 명확히
- 간결하게, 핵심만`
    : `You are a structure design consultant for the "sandroad" app.
The user organizes app/service structures as trees.
Hierarchy: District(column) > Land(L1) > Building(L2) > Sub-building(L3+).

Your role:
- Suggest structural improvements
- Point out missing features/items
- Analyze structural issues
- Reference user's recorded actions for context

Rules:
- Be specific: state where to add/move items
- Keep responses concise and actionable
- Use "Suggestion:" prefix for concrete proposals`;

  // Build context
  let contextParts = [];
  if (projectName) contextParts.push(`Project: ${projectName}`);
  if (projectStructure) {
    contextParts.push(`Current structure:\n${JSON.stringify(projectStructure, null, 2)}`);
  }
  if (actions && actions.length > 0) {
    const actionText = actions.map(a => `#${a.num} ${a.description}`).join('\n');
    contextParts.push(`Recent actions:\n${actionText}`);
  }

  const userMessage = contextParts.length > 0
    ? `${contextParts.join('\n\n')}\n\n---\nUser request: ${message}`
    : message;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return res.status(response.status).json({ error: `API error: ${response.status}` });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'No response';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Consult error:', err);
    return res.status(500).json({ error: err.message });
  }
}
