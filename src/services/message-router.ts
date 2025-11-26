import {
  appendSessionNoteToTodayWorkout,
  getWorkoutFrequency,
  getDistinctWorkoutNames,
  createWorkoutSessionFromTemplateName,
  getUpcomingWorkoutsThisWeek,
  logDailyCheckin,
  getTemplateWorkouts,
} from '../integrations/notion';
import { generateDailyWorkoutBriefing } from './briefing-generator';
import { runFitnessAgent } from './fitness-agent';
import { getSuggestedWeightsForTodayWorkout } from './weight-predictor';

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
    lower.includes('plans for the rest of the week') ||
    lower.includes('plans for the remainder of the week') ||
    lower.includes('what’s left this week') ||
    lower.includes("what's left this week") ||
    lower.includes('what is left this week') ||
    lower.includes('rest of the week')
  ) {
    const upcoming = await getUpcomingWorkoutsThisWeek();

    if (upcoming.length === 0) {
      return 'From today through Sunday, there are no workouts scheduled in Notion. If you’d like, I can help you stand up a simple structure for the rest of this week.';
    }

    const lines: string[] = [];
    lines.push("Here’s what remains for this week:");
    upcoming.forEach((w) => {
      const dateLabel = w.date?.slice(5) ?? 'Today';
      const typeLabel =
        w.workoutType && w.workoutType.length > 0 ? ` — ${w.workoutType.join(', ')}` : '';
      lines.push(`${dateLabel} — ${w.name}${typeLabel}`);
    });

    return lines.join('\n');
  }

  if (
    lower.includes('plan next week') ||
    lower.includes('help me plan next week') ||
    lower.includes('next week plan') ||
    lower.includes('training plan for next week')
  ) {
    const templates = await getTemplateWorkouts();

    if (templates.length === 0) {
      return 'I don’t see any workout templates in Notion yet. Once you’ve saved a few (Legs & Glutes, Upper Body & Abs, Sprint Intervals, etc.), I can help you turn them into a weekly structure.';
    }

    const templateLines = templates.map((t) => {
      const typeLabel =
        t.workoutType && t.workoutType.length > 0 ? ` — ${t.workoutType.join(', ')}` : '';
      return `• ${t.name}${typeLabel}`;
    });

    const context = [
      'Here are the workout templates available in Notion:',
      ...templateLines,
    ].join('\n');

    const coachingReply = await runFitnessAgent(
      `${context}\n\nTyler is asking you to help plan her training for next week (Monday through Sunday).\n\nBased on these templates and her protocol, propose a simple weekly structure with 2 lower-body/glute-focused days, 2 upper/back days, 1–2 conditioning or interval days, and at least 1 active recovery / Pilates or walking day.\n\nRespond with a clear list like:\nMon — [Workout]\nTue — [Workout]\n...\n\nInclude 1–2 short coach notes at the end about how to approach the week, in the Where the Fire Went tone.`,
    );

    return coachingReply;
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

  if (
    lower.includes('where can i improve') ||
    lower.includes('what am i neglecting') ||
    lower.includes('what am i missing in my training') ||
    lower.includes('what do i need more of')
  ) {
    const { getWorkoutOverview } = await import('../integrations/notion');
    const overview = await getWorkoutOverview(60);

    if (overview.totalSessions === 0) {
      return "I don't see any completed workouts in your Notion database yet. Once you’ve logged a few weeks, I can tell you exactly which edges want more attention.";
    }

    const entries = Object.entries(overview.byType).sort((a, b) => b[1] - a[1]);
    const top = entries[0];
    const low = entries.filter(([, count]) => count > 0).slice(-2);

    const statsLines = entries.map(
      ([type, count]) => `${type}: ${count} session${count === 1 ? '' : 's'}`,
    );

    const summary = [
      `Total sessions (last 60 days): ${overview.totalSessions}`,
      `Distinct workouts: ${overview.distinctWorkouts}`,
      '',
      'By type:',
      ...statsLines,
    ].join('\n');

    const coachingReply = await runFitnessAgent(
      `Tyler is asking where she can improve in her training.\n\nHere are her stats over the last 60 days:\n\n${summary}\n\nHighlight which training types are overrepresented versus underrepresented, and give 2–3 concrete adjustments (sessions to add, shift, or soften) that stay within her protocol and protect her nervous system.\n\nRespond in the established Where the Fire Went tone.`,
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

  if (
    lower.includes('suggested weights') ||
    lower.includes('what weights should i use') ||
    lower.includes('predict weights') ||
    lower.includes('weight suggestions')
  ) {
    const templatesForWeights = await getDistinctWorkoutNames(50);
    const matchedTemplateForWeights = templatesForWeights.find((name) =>
      lower.includes(name.toLowerCase()),
    );

    if (!matchedTemplateForWeights) {
      return 'Tell me which workout you want suggestions for. For example: `suggested weights for Legs & Glutes Pt.2`.';
    }

    const { workout, suggestions } = await getSuggestedWeightsForTodayWorkout(
      matchedTemplateForWeights,
    );

    if (!workout) {
      return `I don’t see a workout for today in Notion named **${matchedTemplateForWeights}**. Once today’s page is created from that template, I can generate suggestions directly into it.`;
    }

    if (!suggestions.length) {
      return `I couldn’t infer any weights for **${matchedTemplateForWeights}** yet. Log at least one session with weights and I’ll build suggestions from there.`;
    }

    const { updateWorkoutWeights } = await import('../integrations/notion');
    await updateWorkoutWeights(
      workout.id,
      suggestions.map((s) => ({ exercise: s.exercise, suggestedWeight: s.suggestedWeight })),
    );

    const lines: string[] = [];
    lines.push(
      `Here are suggested weights for today’s **${matchedTemplateForWeights}** session (written into the Lbs. column in Notion):`,
    );
    suggestions.forEach((s) => {
      if (s.suggestedWeight === undefined) {
        lines.push(`• ${s.exercise} — start conservatively and focus on clean form.`);
      } else if (s.lastWeight !== undefined) {
        lines.push(
          `• ${s.exercise} — last: ${s.lastWeight} lb → suggest: ${s.suggestedWeight} lb`,
        );
      } else {
        lines.push(`• ${s.exercise} — suggest: ${s.suggestedWeight} lb`);
      }
    });

    lines.push('');
    lines.push(
      'Treat these as a progressive starting point—never at the expense of form, joints, or nervous system calm.',
    );

    return lines.join('\n');
  }

  if (lower.startsWith('note ')) {
    const note = text.slice(5).trim();

    if (!note) {
      return '📝 To add a session note, reply like: `note Felt strong on hip thrusts today.`';
    }

    await logDailyCheckin(note);
    const { workoutName } = await appendSessionNoteToTodayWorkout(note);
    return `📝 Got it. I added this note to today’s “${workoutName}” session in Notion.`;
  }

  // Fallback to LLM-powered coaching for open-ended questions.
  const coachingReply = await runFitnessAgent(text);
  return coachingReply;
};
