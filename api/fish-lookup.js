export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name } = req.body
  if (!name) return res.status(400).json({ error: '請提供魚種名稱' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

  const prompt = `你是台灣最權威的海鮮專家，精通台灣各地漁市、魚港、夜市、餐廳對海鮮的俗名、台語名、地方叫法。

使用者輸入：「${name}」

以下是常見台灣俗名對照，請參考（但不限於此）：
- 金花魚 → 盤仔魚 / 花身雞魚（Terapon jarbua）
- 石狗公 → 石狗公（Sebastiscus marmoratus）
- 三牙 → 黃錫鯛（Acanthopagrus latus）
- 過魚 / 石斑 → 石斑魚（Epinephelus spp.）
- 黑毛 → 白鯧（Kyphosus bigibbus）或黑毛（Girella punctata）
- 嘉臘 / 加臘 → 黃錫鯛、赤鯮等鯛科
- 午仔 → 四指馬鲅（Eleutheronema tetradactylum）
- 白北 → 鰆魚（Scomberomorus commerson）
- 煙仔 / 煙仔虎 → 正鰹（Katsuwonus pelamis）
- 鬼頭刀 → 鬼頭刀（Coryphaena hippurus）
- 紅目鰱 → 大眼鰱（Priacanthus macracanthus）
- 飛魚 → 飛魚（Exocoetidae spp.）
- 白帶魚 → 白帶魚（Trichiurus lepturus）
- 竹莢魚 / 巴攏 → 竹莢魚（Trachurus japonicus）
- 臭肚 → 臭肚魚（Siganus spp.）
- 土魠 → 鰆魚（Scomberomorus commerson）
- 赤鯮 → 赤鯮（Pagrus major）
- 黑鯛 / 烏格 → 黑棘鯛（Acanthopagrus schlegelii）
- 黃雞 / 赤海 → 黃雞魚（Lutjanus spp.）
- 金線 / 金線魚 → 金線魚（Nemipterus virgatus）
- 硬尾 / 甘仔魚 → 瓜仔魚（Decapterus spp.）
- 虱目魚 → 虱目魚（Chanos chanos）
- 烏魚 → 烏魚（Mugil cephalus）
- 龍膽石斑 → 龍膽石斑（Epinephelus lanceolatus）
- 象魚 / 曼波魚 → 翻車魚（Mola mola）
- 三點仔 → 花身雞魚（Terapon jarbua）
- 盤仔 → 花身雞魚（Terapon jarbua）

請根據你的知識，判斷「${name}」在台灣最可能指的是哪種魚，然後只回傳 JSON，格式如下（不要任何說明文字、不要 markdown）：
{
  "matched_name": "台灣最常見叫法或正式名稱",
  "scientific_name": "正式中文學名",
  "common_names": "台灣常見別名，逗號分隔，必須包含輸入的「${name}」",
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
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
    const clean = text.replace(/```json|```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 未回傳有效資料，請重試')
    const parsed = JSON.parse(jsonMatch[0])

    const { latin_name, ...rest } = parsed
    return res.status(200).json({ ...rest, latin_name })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
