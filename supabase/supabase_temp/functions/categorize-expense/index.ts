import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { description } = await req.json()
    
    if (!description) {
      throw new Error('Description is required')
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')
    
    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API Key not configured')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 150,
        system: "You are an expense categorization assistant. Given a short expense description, return the best matching category from this list: Food, Transport, Entertainment, Health, Shopping, Home, Education, Other. Respond ONLY with valid JSON: {\"category\": string, \"confidence\": number, \"reasoning\": string}",
        messages: [
          {
            role: 'user',
            content: description
          }
        ]
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${JSON.stringify(data)}`)
    }

    const content = data.content[0].text
    
    // Attempt to parse JSON response
    let result = null;
    try {
      result = JSON.parse(content);
    } catch(e) {
      // Fallback if Claude didn't return pure JSON
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { category: 'Other', confidence: 0, reasoning: 'Failed to parse JSON' };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
