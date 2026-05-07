import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

interface MonthCategoryBreakdown {
  category: string
  total: number
}

interface MonthlyAggregate {
  month: string // YYYY-MM
  label: string // e.g. "Mayo 2026"
  total: number
  byCategory: MonthCategoryBreakdown[]
}

interface InsightsRequestBody {
  currency: string
  monthlyLimit?: number | null
  dayCutoff?: number // day-of-month used to truncate every month's data
  currentMonth: MonthlyAggregate
  previousMonths: MonthlyAggregate[] // ordered oldest -> newest, NOT including current
}

function isValidAggregate(value: unknown): value is MonthlyAggregate {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.month === 'string' &&
    typeof v.label === 'string' &&
    typeof v.total === 'number' &&
    Array.isArray(v.byCategory)
  )
}

function buildPrompt(body: InsightsRequestBody): string {
  const { currency, monthlyLimit, dayCutoff, currentMonth, previousMonths } = body

  const formatBreakdown = (m: MonthlyAggregate) => {
    if (m.byCategory.length === 0) return '  (sin gastos)'
    return m.byCategory
      .slice()
      .sort((a, b) => b.total - a.total)
      .map(c => `  - ${c.category}: ${c.total.toFixed(2)} ${currency}`)
      .join('\n')
  }

  const history = previousMonths
    .map(m => `${m.label} (total: ${m.total.toFixed(2)} ${currency}):\n${formatBreakdown(m)}`)
    .join('\n\n')

  const limitLine =
    typeof monthlyLimit === 'number' && monthlyLimit > 0
      ? `\nLímite mensual configurado por el usuario: ${monthlyLimit.toFixed(2)} ${currency}.`
      : ''

  const windowLine =
    typeof dayCutoff === 'number'
      ? `\nVentana de comparación: TODOS los meses están agregados solo hasta el día ${dayCutoff} (inclusive). Es decir, si hoy es día ${dayCutoff} del mes, los meses anteriores se compararon también con sus primeros ${dayCutoff} días. La comparación es justa día-a-día, no hace falta decir "es principio de mes" ni descartar una tendencia por eso.\nGASTOS FIJOS EXCLUIDOS: los datos NO incluyen los gastos que el usuario marcó como fijos (alquiler, seguros, monotributo, suscripciones, etc.). Esos se manejan aparte para la proyección de fin de mes y se excluyen acá porque su día de pago puede variar entre meses y distorsionaría la comparación. Estás analizando solo gastos variables.`
      : ''

  return `Sos un asistente financiero personal. Hablale al usuario en español rioplatense (vos, tuteo argentino), de forma cercana y directa, sin emojis innecesarios. No saludes ni te presentes.

Tu objetivo: analizar los gastos del usuario y darle observaciones útiles y específicas. Buscá:
1. Si en el mes actual hay alguna categoría donde está gastando notoriamente más de lo habitual respecto al mismo tramo de meses anteriores.
2. Si hay alguna tendencia creciente sostenida en los últimos meses (categorías que vienen subiendo mes a mes en el mismo tramo).
3. Si el total del mes actual está muy por encima o por debajo del promedio de meses anteriores en el mismo tramo.
4. Si está cerca o pasó el límite mensual (cuando aplica). OJO: el límite es mensual completo, pero los datos del mes actual están truncados al día actual.

Reglas de exactitud numérica (CRÍTICO):
- Trabajás SOLO con los números que aparecen en los "Datos" más abajo. Está prohibido inventar montos.
- Antes de afirmar "X > Y", "X superó Y", "subió de A a B", verificá los dígitos uno por uno. NO redondees mentalmente al comparar — un número con 6 dígitos NUNCA es mayor que uno con 7 dígitos.
- Para decir "subió" entre dos meses, el número del mes más reciente debe ser estrictamente mayor que el más viejo. Si bajó, decí que bajó.
- Para decir "superó el límite", el total del mes debe ser estrictamente mayor que el límite mensual. Si no, NO menciones que lo superó. Como el mes está truncado, mejor evitá afirmar que se superó el límite a menos que sea evidente.
- Si tenés dudas sobre una comparación, no la incluyas. Es preferible omitir un insight a afirmar algo falso.

Reglas de salida:
- Devolvé SOLO un JSON válido, sin markdown, sin texto previo ni posterior.
- Estructura exacta:
{
  "headline": "string corta de máximo 90 caracteres con la observación principal",
  "insights": [
    { "type": "alert" | "trend" | "info" | "good", "title": "string corta", "detail": "string breve, 1-2 oraciones" }
  ]
}
- Devolvé entre 2 y 4 ítems en "insights".
- "type": "alert" si hay algo preocupante (gasto muy alto, límite superado), "trend" si describís una tendencia, "good" si hay algo positivo, "info" para datos neutros relevantes.
- Si no hay datos suficientes (por ejemplo, primer mes del usuario), devolvé un único insight de tipo "info" explicándolo.
- Montos en el detalle: redondealos a número entero, sin decimales, agregando el código de moneda al final (ej: "1.250 ${currency}").

Datos:
Moneda: ${currency}${limitLine}${windowLine}

Mes actual — ${currentMonth.label} (total: ${currentMonth.total.toFixed(2)} ${currency}):
${formatBreakdown(currentMonth)}

Meses anteriores (más viejo a más nuevo, mismo tramo de días):
${history || '(sin datos previos)'}
`
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY no está configurada en el servidor.' },
      { status: 500 }
    )
  }

  let body: InsightsRequestBody
  try {
    body = (await request.json()) as InsightsRequestBody
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (
    !body ||
    typeof body.currency !== 'string' ||
    !isValidAggregate(body.currentMonth) ||
    !Array.isArray(body.previousMonths) ||
    !body.previousMonths.every(isValidAggregate)
  ) {
    return NextResponse.json({ error: 'Estructura de datos inválida.' }, { status: 400 })
  }

  const client = new OpenAI({ apiKey })
  const prompt = buildPrompt(body)

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        {
          role: 'system',
          content:
            'Sos un asistente financiero personal en español rioplatense. Respondés solo con JSON válido siguiendo exactamente el esquema pedido.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content?.trim() || ''
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: 'La respuesta del modelo no fue JSON válido.', raw: content },
        { status: 502 }
      )
    }

    return NextResponse.json({ data: parsed, generatedAt: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al llamar a OpenAI.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
