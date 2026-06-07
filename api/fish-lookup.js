export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name } = req.body
  if (!name) return res.status(400).json({ error: '請提供魚種名稱' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

  const prompt = `你是一位專業的海洋生物學家和料理達人。請查詢「${name}」的詳細資訊，並以 JSON 格式回傳。

只回傳 JSON 物件，不要有其他文字，格式如下：
{
  "scientific_name": "中文學名（正式中文名稱）",
  "common_names": "台灣常見別名，用逗號分隔（例：石狗公、石頭魚、虎魚）",
  "flavor": "味道描述（2-3句）",
  "texture": "肉質描述（1-2句）",
  "market_price": 數字（台幣每台斤，若不確定填null）,
  "cooking_methods": "建議料理方式（3-5種）",
  "habitat_depth": 數字（主要棲息深度，公尺，若不確定填null）,
  "description": "額外補充資訊（季節性、產地、特色等）",
  "latin_name": "拉丁學名（例：Sebastiscus marmoratus）"
}`

  try {
    // Step 1: Get fish info
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    const text = data.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Step 2: Try multiple image sources
    let suggested_image = null
    const latinName = parsed.latin_name

    if (latinName) {
      // Try iNaturalist first
      try {
        const inatRes = await fetch(
          `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(latinName)}&rank=species&per_page=1`
        )
        const inatData = await inatRes.json()
        const taxon = inatData.results?.[0]
        if (taxon?.default_photo?.medium_url) {
          suggested_image = taxon.default_photo.medium_url
        }
      } catch (_) {}

      // Fallback: Wikipedia
      if (!suggested_image) {
        try {
          const wikiTitle = latinName.replace(/ /g, '_')
          const wikiRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`
          )
          const wikiData = await wikiRes.json()
          if (wikiData.thumbnail?.source) {
            suggested_image = wikiData.thumbnail.source.replace(/\/\d+px-/, '/400px-')
          }
        } catch (_) {}
      }

      // Fallback: FishBase via GBIF
      if (!suggested_image) {
        try {
          const gbifRes = await fetch(
            `https://api.gbif.org/v1/species?name=${encodeURIComponent(latinName)}&limit=1`
          )
          const gbifData = await gbifRes.json()
          const key = gbifData.results?.[0]?.key
          if (key) {
            const mediaRes = await fetch(
              `https://api.gbif.org/v1/occurrence/search?taxonKey=${key}&mediaType=StillImage&limit=1`
            )
            const mediaData = await mediaRes.json()
            const img = mediaData.results?.[0]?.media?.[0]?.identifier
            if (img) suggested_image = img
          }
        } catch (_) {}
      }
    }

    const { latin_name, ...rest } = parsed
    return res.status(200).json({ ...rest, suggested_image, latin_name })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
