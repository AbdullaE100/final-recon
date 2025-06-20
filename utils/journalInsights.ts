import { JournalEntry } from '@/types/gamification';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { getAIResponse as getGeminiResponse } from '@/lib/ai-service';

export interface WeeklyDigestData {
  dateRange: string;
  highlight: string;
  themes: string[];
  moodSummary: string;
  moods: { mood: string, count: number }[];
}

const getAIWeeklyDigest = async (entries: JournalEntry[]): Promise<Partial<WeeklyDigestData>> => {
  const prompt = `
    You are a compassionate and insightful journaling assistant analyzing journal entries for someone in recovery. Create a concise but meaningful "Weekly Digest" that helps them reflect on their progress and insights.

    Journal Entries from the past week:
    ${entries.map(e => `- ${format(new Date(e.timestamp), 'E, MMM d')}: ${e.content} (Mood: ${e.mood || 'Not specified'})`).join('\n')}

    Provide a JSON object with the following fields (be concise but meaningful):
    1. "highlight": (String) The most impactful or insightful quote from any entry that shows progress, self-awareness, or a breakthrough moment. If no direct quote is suitable, summarize the most significant insight. Max 2 sentences.
    
    2. "themes": (Array of 3-4 strings) Key themes/patterns from the entries, focusing on:
       - Emotional patterns or growth
       - Coping strategies used
       - Challenges faced
       - Progress markers
       Example themes: "Building Self-Awareness", "Effective Coping Tools", "Emotional Growth", "Challenge Management"
    
    3. "moodSummary": (String) A brief but specific analysis of their emotional journey this week. Note any patterns, improvements, or areas needing attention. Max 2 sentences.

    Focus on recovery-oriented insights and growth. Be encouraging but realistic. Output ONLY the JSON object.
  `;

  try {
    const response = await getGeminiResponse(prompt);
    // Clean the response to ensure it's valid JSON
    const jsonString = response.replace(/```json|```/g, '').trim();
    const parsedResponse = JSON.parse(jsonString);
    return parsedResponse;
  } catch (error) {
    console.error("Error getting AI-powered digest:", error);
    return {
      highlight: "Could not generate AI highlight. Keep writing to unlock this feature!",
      themes: [],
      moodSummary: "Could not generate an AI summary this week."
    };
  }
};

export const generateWeeklyDigest = async (entries: JournalEntry[]): Promise<WeeklyDigestData | null> => {
  const now = new Date();
  const lastWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

  const weeklyEntries = entries.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= lastWeekStart && entryDate <= lastWeekEnd;
  });

  if (weeklyEntries.length < 3) {
    return null;
  }

  const dateRange = `${format(lastWeekStart, 'MMM d')} - ${format(lastWeekEnd, 'MMM d, yyyy')}`;

  const aiInsights = await getAIWeeklyDigest(weeklyEntries);

  const moodCounts = weeklyEntries.reduce((acc, entry) => {
    if (entry.mood) {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const moods = Object.entries(moodCounts).map(([mood, count]) => ({ mood, count }));

  return {
    dateRange,
    highlight: aiInsights.highlight || "You wrote a lot this week! Keep it up.",
    themes: aiInsights.themes || ['Reflection', 'Goals', 'Positivity'],
    moodSummary: aiInsights.moodSummary || "You had a mix of moods this week.",
    moods,
  };
}; 