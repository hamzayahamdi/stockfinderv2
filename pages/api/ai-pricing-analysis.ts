import OpenAI from 'openai';
import type { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      product, 
      salesMetrics, 
      crValue, 
      supplierReceptions 
    } = req.body;

    const prompt = `Analyze this product's pricing strategy based on the following data:

Product: ${product['Libellé']}
Reference: ${product['Ref. produit']}
Current Price: ${product['Prix Promo']} DH
Cost Price: ${crValue || 'Unknown'} DH
Total Stock: ${product['Total Stock']} units
Sales Velocity: ${salesMetrics?.salesVelocity || 0} units/day
Stock Coverage: ${salesMetrics?.salesVelocity ? Math.round(product['Total Stock'] / salesMetrics.salesVelocity) : 0} days
Last 28 Days Sales: ${salesMetrics?.totals.units || 0} units
Last 28 Days Revenue: ${salesMetrics?.totals.revenue || 0} DH

Recent Factory Receptions:
${supplierReceptions.slice(-5).map((r: { date_reception: string; qte_recus: number }) => 
  `- ${r.date_reception}: ${r.qte_recus} units`
).join('\n')}

Provide your response in the following JSON format only, no other text:
{
  "recommendedPrice": (number or null - your recommended price if change needed),
  "confidence": ("high", "medium", or "low" - your confidence in this recommendation),
  "reasoning": [array of strings explaining your reasoning],
  "impact": {
    "margin": (number - expected margin percentage),
    "expectedSales": (number - expected daily sales)
  },
  "risks": [array of strings describing potential risks]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a pricing strategy expert for an e-commerce business. You must respond only with valid JSON, no other text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    // Ensure we get valid JSON
    try {
      const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
      return res.status(200).json(aiResponse);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return res.status(500).json({ 
        message: 'Error parsing AI response',
        error: 'Invalid JSON format received from AI'
      });
    }

  } catch (error) {
    console.error('AI Analysis Error:', error);
    return res.status(500).json({ 
      message: 'Error analyzing pricing',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 