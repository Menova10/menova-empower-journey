
import { ChatMessage } from '@/stores/chatStore';

// Simple function to generate responses based on keywords
// In production, you would replace this with an API call to a language model
export const generateResponse = (message: string): string => {
  const messageText = message.toLowerCase();
  
  if (messageText.includes('hot flash') || messageText.includes('hot flush')) {
    return "Hot flashes are a common symptom of menopause. Try keeping your environment cool, dressing in layers, avoiding triggers like spicy foods and caffeine, and practicing deep breathing when a hot flash begins.";
  } else if (messageText.includes('sleep') || messageText.includes('insomnia')) {
    return "Sleep issues during menopause can be challenging. Establishing a regular sleep schedule, keeping your bedroom cool, limiting screen time before bed, and relaxation techniques like meditation may help.";
  } else if (messageText.includes('mood') || messageText.includes('anxiety') || messageText.includes('depression')) {
    return "Mood changes are normal during menopause due to hormonal fluctuations. Regular exercise, mindfulness meditation, and staying socially connected can help. If these feelings are persistent, speaking with a healthcare provider might be beneficial.";
  } else if (messageText.includes('menopause')) {
    return "Menopause is a natural biological process marking the end of menstrual cycles, typically occurring in your 40s or 50s. It's diagnosed after 12 months without a period. The transition can last several years and includes physical symptoms like hot flashes and emotional symptoms like mood changes, all driven by changing hormone levels.";
  } else {
    return "I'm here to support you through your menopause journey. I can provide information about symptoms, offer management strategies, or simply listen. What specific aspect of menopause would you like to discuss today?";
  }
};

// Function to process a message for symptoms
export const processForSymptoms = (message: string): string | null => {
  const messageText = message.toLowerCase();
  
  const symptomKeywords = [
    { keyword: "hot flash", symptom: "Hot flashes" },
    { keyword: "night sweat", symptom: "Night sweats" },
    { keyword: "sleep", symptom: "Sleep problems" },
    { keyword: "insomnia", symptom: "Insomnia" },
    { keyword: "mood swing", symptom: "Mood swings" },
    { keyword: "anxiety", symptom: "Anxiety" },
    { keyword: "depression", symptom: "Depression" },
    { keyword: "fatigue", symptom: "Fatigue" },
    { keyword: "joint pain", symptom: "Joint pain" },
    { keyword: "headache", symptom: "Headaches" },
    { keyword: "brain fog", symptom: "Brain fog" }
  ];
  
  for (const { keyword, symptom } of symptomKeywords) {
    if (messageText.includes(keyword)) {
      return symptom;
    }
  }
  
  return null;
};

// Get initial welcome message
export const getWelcomeMessage = (): ChatMessage => {
  return {
    id: crypto.randomUUID(),
    sender: 'assistant',
    message: "Hello! I'm MeNova, your menopause wellness companion. How can I help you today?",
    timestamp: new Date().toISOString()
  };
};

// Get sample conversation starters
export const getConversationStarters = (): string[] => {
  return [
    "What is menopause?",
    "Hot flash management",
    "Sleep difficulties",
    "Mood changes",
    "Weight management",
    "How MeNova helps"
  ];
};
