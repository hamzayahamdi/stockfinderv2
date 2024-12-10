import OpenAI from 'openai';
import type { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

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

    const prompt = `As a pricing optimization expert, analyze this product's performance and suggest optimal pricing based on the following comprehensive data:

PRODUCT INFORMATION:
- Product: ${product['Libellé']}
- Reference: ${product['Ref. produit']}
- Current Price: ${currentPrice} DH
- Cost Price: ${crValue || 'Unknown'} DH
- Current Margin: ${currentMargin ? currentMargin.toFixed(1) + '%' : 'Unknown'}

INVENTORY STATUS:
- Total Stock: ${product['Total Stock']} units
- Stock Distribution:
  ${Object.entries(product)
    .filter(([key]) => key.startsWith('Stock '))
    .map(([location, qty]) => `  ${location}: ${qty} units`)
    .join('\n')}
- Stock Coverage: ${stockCoverage} days

SALES PERFORMANCE:
- Current Sales Velocity: ${currentVelocity.toFixed(2)} units/day
- Last 28 Days:
  * Total Units Sold: ${salesMetrics?.totals.units || 0}
  * Total Revenue: ${salesMetrics?.totals.revenue || 0} DH
  * Average Daily Revenue: ${((salesMetrics?.totals.revenue || 0) / 28).toFixed(2)} DH

SUPPLY CHAIN:
Recent Factory Receptions:
${supplierReceptions.slice(-5).map(r => 
  `- ${r.date_reception}: ${r.qte_recus} units`
).join('\n')}

FINANCIAL METRICS:
- Current Margin Amount: ${crValue ? Math.round(currentPrice - crValue) : 'Unknown'} DH
- Margin Percentage: ${currentMargin ? currentMargin.toFixed(1) : 'Unknown'}%
- Daily Profit: ${crValue ? Math.round((currentPrice - crValue) * currentVelocity) : 'Unknown'} DH

PRICING RULES:
1. NEVER recommend a price below cost price (${crValue} DH)
2. Maintain minimum margin of 15%
3. Consider stock coverage impact:
   - High coverage (>90 days): Consider aggressive pricing
   - Low coverage (<30 days): Protect stock with higher margins
4. Factor in sales velocity:
   - Low velocity (<0.5/day): Price elasticity is crucial
   - High velocity (>2/day): Opportunity for margin optimization

REQUIRED ANALYSIS:
1. Evaluate current price positioning
2. Analyze stock coverage impact
3. Consider sales velocity trends
4. Calculate margin optimization potential
5. Assess supply chain patterns

PROVIDE A JSON RESPONSE WITH:
{
  "recommendedPrice": number,
  "confidence": "high" | "medium" | "low",
  "reasoning": string[],
  "impact": {
    "margin": number,
    "expectedSales": number
  },
  "risks": string[]
}

IMPORTANT:
- Price changes should be justified by multiple factors
- Consider both revenue optimization and stock management
- Account for current market position
- Provide specific reasoning for the recommendation
- Include quantified impact predictions
- Always suggest a price change, even if small
- Factor in the relationship between stock coverage and pricing strategy`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert pricing analyst with deep experience in e-commerce and retail. 
          Your recommendations must be data-driven and consider multiple factors including:
          - Stock management efficiency
          - Margin optimization
          - Sales velocity impact
          - Market positioning
          Always provide specific, actionable pricing recommendations with detailed justification.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4, // Reduced for more consistent responses
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
      
      // Ensure aiResponse has the correct structure
      const validatedResponse = {
        recommendedPrice: aiResponse.recommendedPrice || null,
        confidence: aiResponse.confidence || 'low',
        reasoning: Array.isArray(aiResponse.reasoning) ? aiResponse.reasoning : [],
        impact: {
          margin: 0,
          expectedSales: currentVelocity
        },
        risks: Array.isArray(aiResponse.risks) ? aiResponse.risks : []
      };

      // Validate recommended price
      if (crValue && validatedResponse.recommendedPrice <= crValue) {
        console.error('AI suggested price below cost price, adjusting...');
        validatedResponse.recommendedPrice = crValue * 1.15; // Set minimum 15% margin
        validatedResponse.confidence = 'low';
        validatedResponse.reasoning.unshift('Price adjusted to maintain minimum margin');
      }

      // Recalculate margins to ensure accuracy
      if (crValue && validatedResponse.recommendedPrice) {
        const newMargin = validateMarginCalculation(validatedResponse.recommendedPrice, crValue);
        if (newMargin === null) {
          throw new Error('Invalid margin calculation in AI response');
        }
        validatedResponse.impact.margin = newMargin;

        // Calculate expected sales based on price elasticity
        const priceChange = (validatedResponse.recommendedPrice - currentPrice) / currentPrice;
        const elasticity = priceChange > 0 ? -1.5 : 1.2; // Different elasticity for price increase vs decrease
        const velocityChange = priceChange * elasticity;
        const newVelocity = currentVelocity * (1 + velocityChange);
        
        // Ensure velocity stays within reasonable bounds
        validatedResponse.impact.expectedSales = Math.max(
          currentVelocity * 0.3, // Min 30% of current
          Math.min(
            newVelocity,
            currentVelocity * 2 // Max 200% of current
          )
        );
      }

      return res.status(200).json(validatedResponse);
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