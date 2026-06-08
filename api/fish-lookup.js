export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name } = req.body
  if (!name) return res.status(400).json({ error: '請提供魚種名稱' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

  const prompt = `請用網路搜尋「${name} 台灣 魚 海鮮」，找出這個名稱在台灣對應的是哪一種魚或海鮮，然後整理資料。

這個名稱可能是台灣漁市俗名、台語叫法、或漁民用語。請搜尋後確認正確魚種，再回傳資料。

只回傳 JSON 物件，不要任何說明文字，不要 markdown：
{
  "matched_name": "搜尋後確認的正式名稱或最常見叫法",
  "scientific_name": "正式中文學名",
  "common_names": "台灣常見別名，逗號分隔，含原本輸入的名稱",
  "flavor": "味道描述（2-3句，說明甜度、鮮味、腥味程度）",
  "texture": "肉質描述（1-2句，說明細緻度、刺多不多）",
  "market_price": 數字（台幣每台斤市場均價，不確定填null）,
  "cooking_methods": "適合料理方式3-5種，逗號分隔",
  "habitat_depth": 數字（主要棲息深度公尺，不確定填null）,
  "description": "季節性、產地、特色、挑選訣竅等（2-4句）",
  "latin_name": "拉丁學名",
  "category": "只能填：魚、蝦、蟹、貝、花枝、章魚、其他"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    // 收集所有 text block（web_search 會有多個 content block）
    const fullText = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    const jsonMatch = fullText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 未回傳有效 JSON，請重試')
    const parsed = JSON.parse(jsonMatch[0])

    const { latin_name, ...rest } = parsed
    return res.status(200).json({ ...rest, latin_name })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
