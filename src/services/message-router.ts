import { appendSessionNoteToTodayWorkout } from '../integrations/notion';
import { generateDailyWorkoutBriefing } from './briefing-generator';
import { runFitnessAgent } from './fitness-agent';

export const handleTextMessage = async (rawText: string): Promise<string> => {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return '📝 Send `note ...` to add a session note, or `brief` to get today’s training overview.\n\nExamples:\n- `brief`\n- `note Energy was low but form felt strong on RDLs.`';
  }

  if (lower === 'brief' || lower === 'brief today') {
    const workoutSection = await generateDailyWorkoutBriefing();
    return workoutSection;
  }

  if (lower.startsWith('note ')) {
    const note = text.slice(5).trim();

    if (!note) {
      return '📝 To add a session note, reply like: `note Felt strong on hip thrusts today.`';
    }

    const { workoutName } = await appendSessionNoteToTodayWorkout(note);
    return `📝 Got it. I added this note to today’s “${workoutName}” session in Notion.`;
  }

  // Fallback to LLM-powered coaching for open-ended questions.
  const coachingReply = await runFitnessAgent(text);
  return coachingReply;
};
