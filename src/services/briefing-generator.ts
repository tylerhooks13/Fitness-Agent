import { getTodaysWorkouts, getWorkoutExercises } from '../integrations/notion';
import type { NotionExercise, NotionWorkout } from '../types';

const formatTherapies = (workout: {
  redLightTherapy?: boolean;
  acupuncture?: boolean;
  sauna?: boolean;
}) => {
  const flags: string[] = [];
  if (workout.redLightTherapy) flags.push('Red Light');
  if (workout.acupuncture) flags.push('Acupuncture');
  if (workout.sauna) flags.push('Sauna');
  return flags.length > 0 ? `\nTherapies: ${flags.join(', ')}` : '';
};

export const generateDailyWorkoutBriefing = async (): Promise<string> => {
  const workouts = await getTodaysWorkouts();

  if (workouts.length === 0) {
    return "🌅 Morning Tyler! No workout is scheduled in Notion today.\n\n🧘 Treat this as a recovery day—light movement, hydration, and good sleep will set you up for the next session. 😴";
  }

  const enriched = await Promise.all(
    workouts.map(async (workout) => {
      const exercises = await getWorkoutExercises(workout.id);
      return { workout, exercises };
    }),
  );

  const lines: string[] = [];
  lines.push("🌅 Morning Tyler! Here's today’s training:");
  lines.push('');

  enriched.forEach(({ workout, exercises }, index) => {
    const typeLabel =
      workout.workoutType && workout.workoutType.length > 0
        ? ` — ${workout.workoutType.join(', ')}`
        : '';
    const headerPrefix = workouts.length > 1 ? `${index + 1}. ` : '';

    if (exercises.length > 0) {
      lines.push(`🏋️‍♀️ ${headerPrefix}${workout.name}${typeLabel}${formatTherapies(workout)}`);

      const maxExercisesToShow = 4;
      const toShow = exercises.slice(0, maxExercisesToShow);

      toShow.forEach((ex: NotionExercise) => {
        const setsPart = ex.sets ? `${ex.sets} x ` : '';
        const repsPart = ex.reps ?? '';
        const details = `${setsPart}${repsPart}`.trim();
        const suffix = details ? ` — ${details}` : '';
        lines.push(`• ${ex.name}${suffix}`);
      });

      if (exercises.length > maxExercisesToShow) {
        lines.push(`…and ${exercises.length - maxExercisesToShow} more movements.`);
      }

      lines.push('');
    } else {
      const nameLower = workout.name.toLowerCase();
      const typeLower = (workout.workoutType?.[0] || '').toLowerCase();
      const isPilates = nameLower.includes('pilates') || typeLower.includes('pilates');

      if (isPilates) {
        lines.push(`🧘 ${headerPrefix}${workout.name}${typeLabel}${formatTherapies(workout)}`);
        lines.push(
          '• Low‑impact full‑body session. Focus on breathing, control, and core engagement. Treat this as active recovery. 💆‍♀️',
        );
      } else {
        lines.push(`🏃‍♀️ ${headerPrefix}${workout.name}${typeLabel}${formatTherapies(workout)}`);
        lines.push(
          '• Movement‑focused session today. Aim for smooth, controlled reps—about a 7/10 effort. 🔥',
        );
      }

      lines.push('');
    }
  });

  return lines.join('\n').trim();
};
