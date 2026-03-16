import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async () => {
    try {
        // 1. Get all users
        const { data: users, error: usersError } = await supabase.from('users').select('*')
        if (usersError) throw usersError

        const today = new Date()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - 7)

        // Process each user
        for (const user of users) {
            // 2. Fetch expenses for the past 7 days
            const { data: expenses, error: expError } = await supabase
                .from('expenses')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', weekStart.toISOString().split('T')[0])

            if (expError) throw expError
            if (!expenses || expenses.length === 0) continue

            // 3. Prepare summary data
            const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
            const categories = expenses.reduce((acc, curr) => {
                acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount)
                return acc
            }, {} as Record<string, number>)

            // 4. Call Groq API (Llama 3.1)
            const languageLabel = user.language === 'es' ? 'Spanish' : user.language === 'pt' ? 'Portuguese' : 'English'

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    max_tokens: 500,
                    temperature: 0.7,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a friendly financial advisor. Write a warm, personalized weekly spending summary. Be concise (2-3 short paragraphs). Use encouraging tone. Respond in ${languageLabel}.`
                        },
                        {
                            role: 'user',
                            content: `User: ${user.full_name || 'there'}
Weekly budget: ${user.weekly_budget} ${user.currency}
Total spent this week: ${totalSpent} ${user.currency}
Category breakdown: ${JSON.stringify(categories)}
Please summarize their spending, note if over/under budget, and give 1-2 practical tips for next week.`
                        }
                    ]
                })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(`Groq error: ${JSON.stringify(data)}`)

            const summaryText = data.choices[0].message.content

            // 5. Save to database
            await supabase.from('weekly_reports').insert({
                user_id: user.id,
                week_start: weekStart.toISOString().split('T')[0],
                week_end: today.toISOString().split('T')[0],
                total_spent: totalSpent,
                summary_text: summaryText
            })
        }

        return new Response(JSON.stringify({ success: true, processedUsers: users?.length }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
