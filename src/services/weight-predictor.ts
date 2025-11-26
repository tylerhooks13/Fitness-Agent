import { getWorkoutExercises, getRecentWorkoutsByName, getTodaysWorkouts } from '../integrations/notion';
import type { NotionExercise, NotionWorkout } from '../types';
import { logger } from '../utils/logger';

export interface ExerciseWeightSuggestion {
  exercise: string;
  lastWeight?: number;
  suggestedWeight?: number;
}

const suggestNextWeight = (lastWeight: number | undefined): number | undefined => {
  if (lastWeight === undefined || Number.isNaN(lastWeight)) return undefined;

  if (lastWeight < 40) return lastWeight + 2.5;
  if (lastWeight < 80) return lastWeight + 5;
  return lastWeight + 10;
};

const getLastHistoricalWeight = async (
  workoutName: string,
  exerciseName: string,
): Promise<number | undefined> => {
  const historyWorkouts = await getRecentWorkoutsByName(workoutName, 5);
  for (const w of historyWorkouts) {
    const exs = await getWorkoutExercises(w.id);
    const match = exs.find(
      (ex) => ex.name.toLowerCase() === exerciseName.toLowerCase() && ex.defaultWeight,
    );
    if (match?.defaultWeight && !Number.isNaN(match.defaultWeight)) {
      return match.defaultWeight;
    }
  }
  return undefined;
};

export const getSuggestedWeightsForTodayWorkout = async (
  workoutName: string,
): Promise<{ workout: NotionWorkout | null; suggestions: ExerciseWeightSuggestion[] }> => {
  const todaysWorkouts = await getTodaysWorkouts();
  const workout =
    todaysWorkouts.find((w) => w.name.toLowerCase() === workoutName.toLowerCase()) || null;

  if (!workout) {
    return { workout: null, suggestions: [] };
  }

  const exercises = await getWorkoutExercises(workout.id);

  const suggestions: ExerciseWeightSuggestion[] = [];

  for (const ex of exercises as NotionExercise[]) {
    const historicalLast = await getLastHistoricalWeight(workout.name, ex.name);
    const baseline = historicalLast ?? ex.defaultWeight;
    const suggestedWeight = suggestNextWeight(baseline);

    suggestions.push({
      exercise: ex.name,
      lastWeight: baseline,
      suggestedWeight,
    });
  }

  logger.info('Computed suggested weights for workout', {
    workoutName,
    suggestions,
  });

  return { workout, suggestions };
};
