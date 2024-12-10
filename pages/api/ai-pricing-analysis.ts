import OpenAI from 'openai';
import type { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add data validation
const validateRequestData = (data: any) => {
  const {
    product,
    salesMetrics,
    crValue,
    supplierReceptions
  } = data;

  if (!product || typeof product !== 'object') throw new Error('Invalid product data');
  if (!salesMetrics || typeof salesMetrics !== 'object') throw new Error('Invalid sales metrics');
  if (typeof product['Prix Promo'] !== 'number') throw new Error('Invalid price');
  if (typeof salesMetrics.salesVelocity !== 'number') throw new Error('Invalid sales velocity');
  if (crValue !== null && typeof crValue !== 'number') throw new Error('Invalid cost price');
  if (!Array.isArray(supplierReceptions)) throw new Error('Invalid supplier receptions');

  return {
    product,
    salesMetrics,
    crValue,
    supplierReceptions
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Validate request data
    const validatedData = validateRequestData(req.body);
    
    const { 
      product, 
      salesMetrics, 
      crValue, 
      supplierReceptions 
    } = validatedData;

    const currentPrice = Number(product['Prix Promo']);
    const currentVelocity = Number(salesMetrics?.salesVelocity || 0);

    const prompt = `Analyze this product's pricing strategy based on the following data:

Product: ${product['Libellé']}
Reference: ${product['Ref. produit']}
Current Price: ${currentPrice} DH
Cost Price: ${crValue || 'Unknown'} DH
Total Stock: ${product['Total Stock']} units
Current Sales Velocity: ${currentVelocity} units/day
Stock Coverage: ${salesMetrics?.salesVelocity ? Math.round(product['Total Stock'] / salesMetrics.salesVelocity) : 0} days
Last 28 Days Sales: ${salesMetrics?.totals.units || 0} units
Last 28 Days Revenue: ${salesMetrics?.totals.revenue || 0} DH

Recent Factory Receptions:
${supplierReceptions.slice(-5).map((r: { date_reception: string; qte_recus: number }) => 
  `- ${r.date_reception}: ${r.qte_recus} units`
).join('\n')}

For the price elasticity calculation:
- If recommending a price increase: Use a conservative elasticity estimate where each 1% price increase typically results in a 1.5% decrease in sales velocity
- If recommending a price decrease: Use a moderate elasticity estimate where each 1% price decrease typically results in a 1.2% increase in sales velocity
- The estimated velocity should never increase more than 100% or decrease more than 70% from the current velocity

Based on this data, analyze the pricing strategy and provide recommendations. Return only a JSON object with this exact structure:
{
  "recommendedPrice": number | null,
  "confidence": "high" | "medium" | "low",
  "reasoning": string[],
  "impact": {
    "margin": number,
    "expectedSales": number (calculate using the elasticity guidelines above)
  },
  "risks": string[]
}

Example velocity calculation:
If current price is 100 DH and recommended price is 90 DH (10% decrease):
- Price change percentage = -10%
- Expected velocity change = -10% * 1.2 = +12%
- If current velocity is 5 units/day, new velocity = 5 * 1.12 = 5.6 units/day`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a pricing strategy expert for an e-commerce business. Use the provided elasticity guidelines to calculate expected sales velocity changes. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    try {
      const aiResponse = JSON.parse(completion.choices[0].message.content);
      
      // Additional validation of AI response
      if (!aiResponse || typeof aiResponse !== 'object') {
        throw new Error('Invalid AI response structure');
      }

      // Validate and adjust velocity if needed
      if (aiResponse.impact && typeof aiResponse.impact.expectedSales === 'number') {
        const maxVelocity = currentVelocity * 2;
        const minVelocity = currentVelocity * 0.3;
        
        aiResponse.impact.expectedSales = Math.min(
          Math.max(aiResponse.impact.expectedSales, minVelocity),
          maxVelocity
        );

        // Ensure margin calculation is correct
        if (crValue && aiResponse.recommendedPrice) {
          aiResponse.impact.margin = ((aiResponse.recommendedPrice - crValue) / aiResponse.recommendedPrice) * 100;
        }
      }

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