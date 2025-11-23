import { appendSessionNoteToTodayWorkout } from '../integrations/notion';

export const handleTextMessage = async (rawText: string): Promise<string> => {
  const text = rawText.trim();

  if (!text) {
    return '📝 Send `note ...` to add a session note to today’s workout.\nExample: `note Energy was low but form felt strong on RDLs.`';
  }

  const lower = text.toLowerCase();

  if (lower.startsWith('note ')) {
    const note = text.slice(5).trim();

    if (!note) {
      return '📝 To add a session note, reply like: `note Felt strong on hip thrusts today.`';
    }

    const { workoutName } = await appendSessionNoteToTodayWorkout(note);
    return `📝 Got it. I added this note to today’s “${workoutName}” session in Notion.`;
  }

  return 'Hi. I can currently log workout session notes from your messages.\nSend:\n`note Your message here`\n\nMore commands (hydration, recovery, etc.) will be enabled later.';
};

