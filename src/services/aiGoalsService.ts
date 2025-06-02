// AI Goals Service for generating dynamic wellness goals
interface AllCategoriesGoalResponse {
  nourish: string[];
  center: string[];
  play: string[];
}

// OpenAI API configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Combined prompt for all categories at once - enhanced for better specificity
const getAllCategoriesPrompt = () => `You are a menopause wellness expert. Generate 5 unique, specific, actionable wellness goals for each category that women 40+ going through perimenopause/menopause can complete in one day. Make each goal detailed and practical.

**NOURISH** (Nutrition & Self-Care):
Focus on hormone-balancing nutrition, gut health, hydration, sleep support, and emotional well-being.
Examples: "Add 2 tablespoons of ground flaxseed to your breakfast for omega-3s", "Drink herbal tea with evening primrose before bed", "Take your vitamin D3 supplement with breakfast"

**CENTER** (Mindfulness & Balance): 
Focus on grounding practices, stress reduction, emotional regulation, and finding inner balance.
Examples: "Practice 4-7-8 breathing technique for 5 minutes when feeling stressed", "Write 3 gratitude statements in your journal", "Do a 10-minute guided meditation"

**PLAY** (Movement & Joy):
Focus on joyful movement, bone health, flexibility, creative expression, and energy-boosting activities.
Examples: "Dance to 2 favorite songs in your living room", "Take a 15-minute nature walk and notice 5 beautiful things", "Do 10 wall push-ups to strengthen bones"

Format your response as valid JSON only:
{
  "nourish": ["specific goal 1", "specific goal 2", "specific goal 3", "specific goal 4", "specific goal 5"],
  "center": ["specific goal 1", "specific goal 2", "specific goal 3", "specific goal 4", "specific goal 5"], 
  "play": ["specific goal 1", "specific goal 2", "specific goal 3", "specific goal 4", "specific goal 5"]
}

Make each goal unique, specific, and immediately actionable. No generic "complete activity" goals.`;

export const generateAllCategoriesGoals = async (): Promise<AllCategoriesGoalResponse> => {
  try {
    if (!OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, using fallback goals');
      return getFallbackAllCategoriesGoals();
    }

    console.log('🤖 Generating AI goals for all categories...');

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a menopause wellness expert. Generate unique, varied daily goals for each wellness category. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: getAllCategoriesPrompt()
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} - ${response.statusText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('🤖 Raw OpenAI response:', data);
    
    const content = data.choices[0].message.content;
    console.log('🤖 OpenAI content:', content);
    
    try {
      // Parse the JSON response
      const parsedGoals = JSON.parse(content);
      console.log('🤖 Parsed goals:', parsedGoals);
      
      // Validate the structure
      if (parsedGoals.nourish && parsedGoals.center && parsedGoals.play) {
        const result = {
          nourish: parsedGoals.nourish.slice(0, 5),
          center: parsedGoals.center.slice(0, 5),
          play: parsedGoals.play.slice(0, 5)
        };
        console.log('✅ Successfully generated AI goals:', result);
        return result;
      } else {
        console.error('❌ Invalid AI response structure:', parsedGoals);
        throw new Error('Invalid response structure');
      }
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      console.error('❌ Raw content that failed to parse:', content);
      return getFallbackAllCategoriesGoals();
    }

  } catch (error) {
    console.error('❌ Error generating AI goals:', error);
    console.log('🔄 Using fallback goals instead');
    return getFallbackAllCategoriesGoals();
  }
};

// Enhanced fallback goals with specific, actionable tasks
const getFallbackAllCategoriesGoals = (): AllCategoriesGoalResponse => {
  const allGoals = {
    nourish: [
      'Add 2 tablespoons of ground flaxseed to your breakfast for hormone-supporting omega-3s',
      'Drink a calcium-rich smoothie with almond milk, spinach, and chia seeds',
      'Sip ginger tea after lunch to support digestion and reduce inflammation',
      'Include 5 different colored vegetables in your meals today for antioxidants',
      'Take your vitamin D3 supplement with a healthy fat like avocado or nuts'
    ],
    center: [
      'Practice the 4-7-8 breathing technique for 5 minutes when you feel stressed today',
      'Write down 3 specific things you appreciate about your changing body',
      'Spend 10 minutes in quiet meditation focusing only on your breath',
      'Do gentle neck and shoulder rolls every 2 hours to release physical tension',
      'Set one positive intention this morning and check in with it before bed'
    ],
    play: [
      'Put on your favorite upbeat song and dance freely for 3 full minutes',
      'Take a mindful 15-minute walk outside and count 10 beautiful things you notice',
      'Do 15 wall push-ups in 3 sets throughout the day to strengthen your bones',
      'Practice tree pose for 30 seconds on each leg to improve balance',
      'Do 20 arm circles (10 forward, 10 backward) to energize your upper body'
    ]
  };

  return allGoals;
};

// Generate goals for a specific category (keeping for backward compatibility)
export const generateDynamicGoals = async (category: 'nourish' | 'center' | 'play'): Promise<string[]> => {
  const allGoals = await generateAllCategoriesGoals();
  return allGoals[category];
};

// Generate a single goal for immediate replacement
export const generateSingleGoal = async (category: 'nourish' | 'center' | 'play'): Promise<string> => {
  const goals = await generateDynamicGoals(category);
  return goals[Math.floor(Math.random() * goals.length)];
}; 