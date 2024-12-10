import { Configuration, OpenAIApi } from 'openai';
import type { NextApiRequest, NextApiResponse } from 'next';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

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
${supplierReceptions.slice(-5).map(r => 
  `- ${r.date_reception}: ${r.qte_recus} units`
).join('\n')}

Based on this data, provide:
1. A recommended price (if change needed)
2. Confidence level (high/medium/low)
3. Detailed reasoning
4. Expected impact on sales and margins
5. Risk assessment

Format as JSON.`;

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a pricing strategy expert for an e-commerce business. Analyze data and provide actionable pricing recommendations in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(completion.data.choices[0].message?.content || '{}');

    return res.status(200).json(aiResponse);
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return res.status(500).json({ message: 'Error analyzing pricing' });
  }
} 