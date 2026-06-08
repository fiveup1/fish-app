export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name } = req.body
  if (!name) return res.status(400).json({ error: '請提供魚種名稱' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

  // ── Step 1: 查中文維基百科，搜尋魚名 ──────────────────────
  let wikiSummary = ''
  let wikiTitle   = ''
  let wikiUrl     = ''

  try {
    // 先搜尋，找出最相關的條目
    const searchRes = await fetch(
      `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + ' 魚')}&srlimit=3&format=json&origin=*`
    )
    const searchData = await searchRes.json()
    const firstResult = searchData?.query?.search?.[0]

    if (firstResult) {
      wikiTitle = firstResult.title

      // 取得該條目的摘要內容
      const summaryRes = await fetch(
        `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`
      )
      const summaryData = await summaryRes.json()
      if (summaryData.extract) {
        wikiSummary = summaryData.extract.slice(0, 800) // 最多 800 字
        wikiUrl     = summaryData.content_urls?.desktop?.page || ''
      }
    }
  } catch (_) {
    // 維基查詢失敗不中斷，繼續用 AI 自身知識
  }

  // ── Step 2: 把維基資料餵給 AI，整理成結構化 JSON ──────────
  const wikiContext = wikiSummary
    ? `以下是維基百科關於「${wikiTitle}」的資料，請以此為準：\n${wikiSummary}\n\n`
    : `維基百科找不到相關資料，請用你自身的知識回答。\n\n`

  const prompt = `你是台灣海鮮專家。使用者輸入的魚名是：「${name}」
維基百科搜尋結果條目：「${wikiTitle || '無'}」

${wikiContext}請根據以上資料，整理出這種魚的完整資訊，只回傳 JSON，不要任何說明文字，不要 markdown：
{
  "matched_name": "最常見的中文名稱（參考維基條目標題）",
  "scientific_name": "正式中文學名",
  "common_names": "台灣常見別名，逗號分隔，必須包含使用者輸入的「${name}」",
  "flavor": "味道描述（2-3句，說明甜度鮮味腥味）",
  "texture": "肉質描述（1-2句，說明細緻度刺多不多）",
  "market_price": 數字（台幣每台斤均價，不確定填null）,
  "cooking_methods": "適合料理方式3-5種，逗號分隔",
  "habitat_depth": 數字（主要棲息深度公尺，不確定填null）,
  "description": "季節性產地特色挑選訣竅等（2-4句）",
  "latin_name": "拉丁學名",
  "category": "只能填：魚、蝦、蟹、貝、花枝、章魚、其他"
}`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const aiData = await aiRes.json()
    if (aiData.error) throw new Error(aiData.error.message)

    const text = (aiData.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
    const jsonMatch = text.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 未回傳有效資料，請重試')
    const parsed = JSON.parse(jsonMatch[0])

    const { latin_name, ...rest } = parsed
    return res.status(200).json({
      ...rest,
      latin_name,
      wiki_title: wikiTitle || null,
      wiki_url:   wikiUrl   || null,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
