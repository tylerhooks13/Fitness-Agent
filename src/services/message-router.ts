import { appendSessionNoteToTodayWorkout } from '../integrations/notion';
import { generateDailyWorkoutBriefing } from './briefing-generator';

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

  return 'Hi. I can currently log workout session notes from your messages, or send today’s briefing.\n\nTry:\n- `brief`\n- `note Your message here`\n\nMore commands (hydration, recovery, etc.) will be enabled later.';
};

