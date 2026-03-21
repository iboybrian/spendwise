import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { description, amount } = await req.json()

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Missing expense description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        messages: [
          {
            role: 'system',
            content: `You are an expense categorizer. Given an expense description, respond with ONLY one of these categories: Food, Transport, Entertainment, Health, Shopping, Home, Education, Other. Do not add any explanation or punctuation, just the single category word.`
          },
          {
            role: 'user',
            content: `Expense: "${description}"${amount ? ` Amount: ${amount}` : ''}`
          }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Groq API error: ${JSON.stringify(data)}`)
    }

    const rawCategory = data.choices?.[0]?.message?.content?.trim() || 'Other'

    // Validate the category — fall back to "Other" if the model hallucinates
    const validCategories = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Home', 'Education', 'Other']
    const category = validCategories.find(
      c => c.toLowerCase() === rawCategory.toLowerCase()
    ) || 'Other'

    return new Response(
      JSON.stringify({
        category,
        confidence: category === 'Other' && rawCategory.toLowerCase() !== 'other' ? 0.5 : 0.95,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message, category: 'Other', confidence: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
