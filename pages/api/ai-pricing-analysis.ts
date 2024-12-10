import OpenAI from 'openai';
import type { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const validatedData = validateRequestData(req.body);
    
    const { 
      product, 
      salesMetrics, 
      crValue, 
      supplierReceptions 
    } = validatedData;

    const currentPrice = Number(product['Prix Promo']);
    const currentVelocity = Number(salesMetrics?.salesVelocity || 0);
    const stockCoverage = salesMetrics?.salesVelocity ? Math.round(product['Total Stock'] / salesMetrics.salesVelocity) : 0;
    const currentMargin = crValue ? ((currentPrice - crValue) / currentPrice) * 100 : null;

    const prompt = `As a pricing strategy expert, analyze this product data and ALWAYS suggest a price change based on the following criteria:

PRODUCT DATA:
- Name: ${product['Libellé']}
- Reference: ${product['Ref. produit']}
- Current Price: ${currentPrice} DH
- Cost Price: ${crValue || 'Unknown'} DH
- Total Stock: ${product['Total Stock']} units
- Current Sales Velocity: ${currentVelocity} units/day
- Stock Coverage: ${stockCoverage} days
- Last 28 Days Sales: ${salesMetrics?.totals.units || 0} units
- Last 28 Days Revenue: ${salesMetrics?.totals.revenue || 0} DH
${currentMargin !== null ? `- Current Margin: ${currentMargin.toFixed(1)}%` : ''}

DECISION CRITERIA:
1. HIGH STOCK (Coverage > 90 days):
   - Suggest 15-25% price reduction
   - Higher reduction for higher coverage

2. LOW STOCK (Coverage < 30 days) with high velocity (>1 unit/day):
   - Suggest 10-20% price increase
   - Higher increase for lower coverage

3. MARGIN OPTIMIZATION:
   - If margin > 60%: Consider 10-15% reduction to boost sales
   - If margin < 35%: Suggest 10-15% increase if velocity allows

4. SALES VELOCITY:
   - If velocity < 0.5 units/day: Suggest 15-25% reduction
   - If velocity > 2 units/day: Consider 10-15% increase

ELASTICITY RULES:
- Price increase: Each 1% increase reduces velocity by 1.5%
- Price decrease: Each 1% decrease increases velocity by 1.2%
- Maximum velocity change: +100% to -70% of current

You MUST provide a price recommendation. If no clear optimization needed, suggest at least a 5% adjustment based on the most relevant factor.

Return a JSON object with this exact structure:
{
  "recommendedPrice": number,
  "confidence": "high" | "medium" | "low",
  "reasoning": string[],
  "impact": {
    "margin": number,
    "expectedSales": number
  },
  "risks": string[]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: "You are a pricing optimization AI that ALWAYS suggests price changes. You analyze data thoroughly and provide specific, actionable recommendations with detailed reasoning."
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
      
      if (!aiResponse || typeof aiResponse !== 'object' || aiResponse.recommendedPrice === null) {
        throw new Error('Invalid AI response - must include price recommendation');
      }

      // Validate and adjust velocity
      if (aiResponse.impact && typeof aiResponse.impact.expectedSales === 'number') {
        const maxVelocity = currentVelocity * 2;
        const minVelocity = currentVelocity * 0.3;
        
        aiResponse.impact.expectedSales = Math.min(
          Math.max(aiResponse.impact.expectedSales, minVelocity),
          maxVelocity
        );

        // Recalculate margin
        if (crValue && aiResponse.recommendedPrice) {
          aiResponse.impact.margin = ((aiResponse.recommendedPrice - crValue) / aiResponse.recommendedPrice) * 100;
        }
      }

      // Ensure we have a price recommendation
      if (!aiResponse.recommendedPrice || aiResponse.recommendedPrice === currentPrice) {
        // Force at least a 5% change if no change was suggested
        const defaultChange = currentPrice * 0.05;
        aiResponse.recommendedPrice = currentPrice + (stockCoverage > 45 ? -defaultChange : defaultChange);
        aiResponse.confidence = "low";
        aiResponse.reasoning.push("Suggesting minimal price adjustment for optimization");
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