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

  const trimmedLower = lower.trim();

  if (trimmedLower === 'hi' || trimmedLower === 'hey' || trimmedLower === 'hello') {
    return "🌅 Morning Tyler. How are you feeling physically and mentally today?\n\nReply with `note ...` (for example: `note Energy is 7/10, hips feel tight, slept lightly`) and I’ll log it into today’s session.";
  }

  if (lower === 'brief' || lower === 'brief today') {
    const workoutSection = await generateDailyWorkoutBriefing();
    return workoutSection;
  }

  if (
    lower.includes('workout database') ||
    lower.includes('training history') ||
    lower.includes('how my training looks') ||
    lower.includes('how my training has been')
  ) {
    const { getWorkoutOverview } = await import('../integrations/notion');
    const overview = await getWorkoutOverview(60);

    if (overview.totalSessions === 0) {
      return "I don't see any completed workouts in your Notion database yet. Once you start logging, I can read your history back to you and help you see the patterns.";
    }

    const typeLines = Object.entries(overview.byType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `- ${type}: ${count} session${count === 1 ? '' : 's'}`);

    const summary = [
      `From ${overview.sinceDate} to ${overview.untilDate}, you logged ${overview.totalSessions} workout session${
        overview.totalSessions === 1 ? '' : 's'
      } across ${overview.distinctWorkouts} different workouts.`,
      '',
      'Breakdown by type:',
      ...typeLines,
    ].join('\n');

    const coachingReply = await runFitnessAgent(
      `Here is a summary of Tyler's workout database over the last 60 days:\n\n${summary}\n\nUser question: "${text}"\n\nAnswer as the Where the Fire Went Fitness Agent and connect these patterns to discipline, recovery, and next aligned steps.`,
    );

    return coachingReply;
  }

  if (lower.includes('create') && lower.includes('new') && lower.includes('workout')) {
    return 'I can create today’s workout from one of your existing templates, or build a custom session for how you feel right now.\n\nReply `template` to choose from saved workouts, or `custom` to have me design a fresh session.';
  }

  if (
    trimmedLower === 'template' ||
    lower.includes('from template') ||
    (lower.startsWith('create') &&
      lower.includes('today') &&
      (lower.includes('workout') || lower.includes('page')))
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

  if (trimmedLower === 'custom' || lower.includes('custom workout')) {
    const coachingReply = await runFitnessAgent(
      `Tyler has asked for a custom workout session for today. Design a single-session plan that fits her protocol (as defined in the persona), including a brief warm-up and 4–5 movements with sets and rep ranges. Do not mention databases or tools—just speak to her directly in the established Where the Fire Went tone.`,
    );
    return coachingReply;
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
