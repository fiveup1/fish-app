export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name } = req.body
  if (!name) return res.status(400).json({ error: '請提供魚種名稱' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

  // ── 強化 prompt：台灣俗名優先，先確認魚種再給資料 ──────────────────────
  const prompt = `你是一位精通台灣海鮮的專家，熟悉台灣漁民、魚市場、餐廳使用的各種俗名與台語叫法。

使用者輸入的名稱是：「${name}」

這可能是台灣俗名、台語發音、或漁市場常用名稱。請依照以下邏輯處理：

1. 先判斷這個名稱對應到哪一種（或哪幾種）魚／海鮮。例如：
   - 「金花魚」= 黃雞仔（Lutjanus argentimaculatus 或 Nemipterus）系列，不是金線魚
   - 「石狗公」= Sebastiscus marmoratus 石狗公
   - 「三牙」= 黃錫鯛
   - 「過魚」= 石斑魚
   請根據台灣市場最常見的對應來判斷，若有多個候選請選最常見的一個。

2. 確認正確魚種後，回傳以下 JSON（只回傳 JSON，不要任何說明文字、不要 markdown 符號）：
{
  "matched_name": "你判斷這個俗名對應到的正式中文名稱，或最常見叫法",
  "scientific_name": "正式中文學名",
  "common_names": "台灣常見別名，逗號分隔，含輸入的俗名",
  "flavor": "味道描述（2-3句，具體說明甜度、鮮味、腥味程度）",
  "texture": "肉質描述（1-2句，說明細緻度、刺多不多）",
  "market_price": 數字（台幣每台斤市場均價，若不確定填null）,
  "cooking_methods": "適合的料理方式，3-5種，用逗號分隔",
  "habitat_depth": 數字（主要棲息深度公尺，若不確定填null）,
  "description": "季節性、產地、特色、挑選訣竅等補充（2-4句）",
  "latin_name": "拉丁學名",
  "category": "分類（只能填：魚、蝦、蟹、貝、花枝、章魚、其他 其中一個）"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    const text  = data.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // 不再抓圖片，直接回傳資料
    const { latin_name, ...rest } = parsed
    return res.status(200).json({ ...rest, latin_name })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
