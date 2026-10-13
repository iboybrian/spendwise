import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const validCategories = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Home', 'Education', 'Other']

// Fall back to "Other" if the model hallucinates a category.
const toCategory = (raw: unknown) =>
  validCategories.find(c => c.toLowerCase() === String(raw ?? '').trim().toLowerCase()) || 'Other'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function groq(system: string, user: string, extra: Record<string, unknown> = {}): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 50,
      temperature: 0,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      ...extra,
    })
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Groq API error: ${JSON.stringify(data)}`)
  }
  return data.choices?.[0]?.message?.content?.trim() || ''
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { description, amount, text } = await req.json()

    // Dictation: a whole spoken sentence ("Mi almuerzo me costó 35 quetzales")
    // in, amount + short description + category out.
    if (text) {
      const raw = await groq(
        `You extract an expense from a sentence someone spoke, usually in Spanish. Respond with JSON only: {"amount": number or null, "description": string, "category": string}.
- amount: the money spent as a plain number. Convert spelled-out numbers to digits ("treinta y cinco" -> 35, "veinte con cincuenta" -> 20.5). Ignore currency words (quetzales, pesos, dólares, Q, $). null if no amount was said.
- description: 1 to 3 words naming what was bought, in the sentence's language, first letter capitalized ("Almuerzo", "Uber al trabajo").
- category: exactly one of Food, Transport, Entertainment, Health, Shopping, Home, Education, Other.`,
        text,
        { max_tokens: 100, response_format: { type: 'json_object' } },
      )
      const parsed = JSON.parse(raw)
      const parsedAmount = Number(parsed.amount)
      const category = toCategory(parsed.category)
      return json({
        amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : null,
        description: typeof parsed.description === 'string' && parsed.description.trim() ? parsed.description.trim() : null,
        category,
        confidence: category === 'Other' ? 0.5 : 0.95,
      })
    }

    if (!description) {
      return json({ error: 'Missing expense description' }, 400)
    }

    const rawCategory = await groq(
      `You are an expense categorizer. Given an expense description, respond with ONLY one of these categories: Food, Transport, Entertainment, Health, Shopping, Home, Education, Other. Do not add any explanation or punctuation, just the single category word.`,
      `Expense: "${description}"${amount ? ` Amount: ${amount}` : ''}`,
    )
    const category = toCategory(rawCategory)

    return json({
      category,
      confidence: category === 'Other' && rawCategory.toLowerCase() !== 'other' ? 0.5 : 0.95,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message, category: 'Other', confidence: 0 }, 500)
  }
})
