export type RecoverySource = 'whoop' | 'sms' | 'manual';

export interface WhoopRecovery {
  score: number; // 0-100
  recordedAt: string; // ISO string
}

export interface WhoopSleep {
  hoursSlept: number;
  quality: 'poor' | 'fair' | 'good' | 'great';
  recordedAt: string;
}

export interface WhoopStrain {
  strainScore: number;
  recordedAt: string;
}

export interface NotionExercise {
  name: string;
  sets?: number;
  reps?: string;
  defaultWeight?: number;
  type?: 'compound' | 'isolation';
}

export interface NotionWorkout {
  id: string;
  name: string;
  date?: string; // ISO (Workout Date)
  workoutType?: string[];
  redLightTherapy?: boolean;
  acupuncture?: boolean;
  sauna?: boolean;
  exercises?: NotionExercise[];
  recoveryScore?: number;
}

export interface NotionSession {
  id: string;
  workoutId: string;
  performedAt: string; // ISO
  notes?: string;
}

export interface HydrationLog {
  id?: string;
  amountOz: number;
  source: 'sms' | 'manual' | 'cron';
  loggedAt: string; // ISO
  totalForDay?: number;
}

export interface WorkoutPrediction {
  exercise: string;
  suggestedWeight: number;
  rationale: string;
  change: 'increase' | 'maintain' | 'decrease';
}

export interface DailyBriefing {
  recovery?: WhoopRecovery;
  workout?: NotionWorkout;
  predictions?: WorkoutPrediction[];
  hydrationGoalOz?: number;
  hydrationToDateOz?: number;
}

export enum ConversationState {
  AWAITING_HYDRATION = 'AWAITING_HYDRATION',
  AWAITING_WORKOUT_FEEDBACK = 'AWAITING_WORKOUT_FEEDBACK',
  IDLE = 'IDLE',
}
