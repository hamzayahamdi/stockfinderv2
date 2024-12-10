import Anthropic from '@anthropic-ai/sdk';
import type { NextApiRequest, NextApiResponse } from 'next';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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

Based on this data, analyze the pricing strategy and provide recommendations. Return only a JSON object with this exact structure:
{
  "recommendedPrice": number | null,
  "confidence": "high" | "medium" | "low",
  "reasoning": string[],
  "impact": {
    "margin": number,
    "expectedSales": number
  },
  "risks": string[]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      temperature: 0.7,
      system: "You are a pricing strategy expert for an e-commerce business. Analyze data and provide actionable pricing recommendations. Always respond with valid JSON only.",
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    try {
      const aiResponse = JSON.parse(message.content[0].text);
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