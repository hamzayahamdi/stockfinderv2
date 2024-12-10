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

const validateMarginCalculation = (price: number, costPrice: number | null) => {
  if (!costPrice) return null;
  
  const margin = ((price - costPrice) / price) * 100;
  // Sanity check - margins should be between -100% and +100%
  if (margin < -100 || margin > 100) {
    console.error('Invalid margin calculation detected:', {
      price,
      costPrice,
      calculatedMargin: margin
    });
    return null;
  }
  return margin;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Received request data:', JSON.stringify(req.body, null, 2));
    
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
    
    // Add validation for current margin calculation
    const currentMargin = validateMarginCalculation(currentPrice, crValue);
    
    if (currentMargin === null && crValue) {
      throw new Error('Invalid margin calculation detected');
    }

    const prompt = `As a pricing strategy expert, analyze this product data and ALWAYS suggest a price change based on the following criteria:

PRODUCT DATA:
- Name: ${product['Libellé']}
- Reference: ${product['Ref. produit']}
- Current Price: ${currentPrice} DH
- Cost Price: ${crValue || 'Unknown'} DH
- Current Margin: ${currentMargin ? currentMargin.toFixed(1) + '%' : 'Unknown'}
- Total Stock: ${product['Total Stock']} units
- Current Sales Velocity: ${currentVelocity} units/day
- Stock Coverage: ${stockCoverage} days
- Last 28 Days Sales: ${salesMetrics?.totals.units || 0} units
- Last 28 Days Revenue: ${salesMetrics?.totals.revenue || 0} DH

IMPORTANT VALIDATION RULES:
- The recommended price MUST be higher than the cost price (${crValue} DH)
- Current margin is ${currentMargin ? currentMargin.toFixed(1) + '%' : 'unknown'} - verify this matches your calculations
- All price recommendations must result in a positive margin
- If cost price is ${crValue} DH, any price below this would result in a loss

DECISION CRITERIA:
1. HIGH STOCK (Coverage > 90 days):
   - Suggest 15-25% price reduction BUT never below cost price + 10%
   - Higher reduction for higher coverage

2. LOW STOCK (Coverage < 30 days) with high velocity (>1 unit/day):
   - Suggest 10-20% price increase
   - Higher increase for lower coverage

3. MARGIN OPTIMIZATION:
   - Target margin should be between 25-60%
   - Never suggest a price that results in a negative margin
   - Current margin is ${currentMargin ? currentMargin.toFixed(1) + '%' : 'unknown'}

4. SALES VELOCITY:
   - If velocity < 0.5 units/day: Suggest reduction but maintain minimum 15% margin
   - If velocity > 2 units/day: Consider 10-15% increase

Return a JSON object with exact margin calculations included.`;

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
    }).catch(error => {
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API Error: ${error.message}`);
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error('No content in AI response');
    }

    try {
      const aiResponse = JSON.parse(completion.choices[0].message.content);
      
      // Validate recommended price
      if (crValue && aiResponse.recommendedPrice <= crValue) {
        console.error('AI suggested price below cost price, adjusting...');
        aiResponse.recommendedPrice = crValue * 1.15; // Set minimum 15% margin
        aiResponse.confidence = 'low';
        aiResponse.reasoning.unshift('Price adjusted to maintain minimum margin');
      }

      // Recalculate margins to ensure accuracy
      if (crValue) {
        const newMargin = validateMarginCalculation(aiResponse.recommendedPrice, crValue);
        if (newMargin === null) {
          throw new Error('Invalid margin calculation in AI response');
        }
        aiResponse.impact.margin = newMargin;
      }

      return res.status(200).json(aiResponse);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw AI Response:', completion.choices[0]?.message?.content);
      return res.status(500).json({ 
        message: 'Error parsing AI response',
        error: parseError instanceof Error ? parseError.message : 'JSON parse error',
        raw: completion.choices[0]?.message?.content
      });
    }

  } catch (error) {
    console.error('AI Analysis Error:', error);
    return res.status(500).json({ 
      message: 'Error analyzing pricing',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 