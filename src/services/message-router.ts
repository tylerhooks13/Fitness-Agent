import {
  appendSessionNoteToTodayWorkout,
  getWorkoutFrequency,
  getDistinctWorkoutNames,
  createWorkoutSessionFromTemplateName,
} from '../integrations/notion';
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

  if (
    lower.startsWith('create') &&
    lower.includes('today') &&
    (lower.includes('workout') || lower.includes('page'))
  ) {
    const templates = await getDistinctWorkoutNames();

    if (templates.length === 0) {
      return 'I do not see any workout templates in your Notion database yet. Once you have a few saved workouts, I can use them as templates to stand up new sessions.';
    }

    const lines: string[] = [];
    lines.push('Here are the workout templates I see in Notion:');
    templates.forEach((name, index) => {
      lines.push(`${index + 1}. ${name}`);
    });
    lines.push('');
    lines.push(
      'Reply with the number or the exact name of the template you want to use for today. Example: `1` or `Legs & Glutes Pt.2`.',
    );

    return lines.join('\n');
  }

  if (
    lower.includes('top workout') ||
    lower.includes('most frequent workout') ||
    lower.includes('most logged workout') ||
    lower.includes('favorite workout')
  ) {
    const top = await getWorkoutFrequency(30);
    if (!top.name || top.count === 0) {
      return "I don't see any completed workouts in the last 30 days in Notion. Once you start logging sessions, I can tell you which one you come back to the most.";
    }

    return `Over the last 30 days, your most frequent workout has been **${top.name}**, completed ${top.count} time${
      top.count === 1 ? '' : 's'
    }.\n\nThis is the pattern your body knows best—use it as an anchor while we deliberately add in the supporting sessions (upper body, sprints, recovery days).`;
  }

  const numericSelection = lower.match(/^\d+$/);
  if (numericSelection) {
    const index = parseInt(numericSelection[0], 10) - 1;
    const templates = await getDistinctWorkoutNames();

    if (index < 0 || index >= templates.length) {
      return 'That number does not match any template in your list. Reply with a number from the list I gave you or the exact name of the workout.';
    }

    const name = templates[index];
    const today = new Date();
    await createWorkoutSessionFromTemplateName(name, today);

    return `I’ve created a new workout page for today in Notion based on **${name}**. Return to the ritual and let’s move through it with intention.`;
  }

  // If the message exactly matches a known template name, create from that.
  const templates = await getDistinctWorkoutNames();
  const matchedTemplate = templates.find(
    (name) => name.toLowerCase() === lower.trim(),
  );
  if (matchedTemplate) {
    const today = new Date();
    await createWorkoutSessionFromTemplateName(matchedTemplate, today);
    return `I’ve created a new workout page for today in Notion based on **${matchedTemplate}**. Return to the ritual and move through the session with focus.`;
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
