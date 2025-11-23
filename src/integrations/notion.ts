import { Client } from '@notionhq/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { startOfUserDay } from '../utils/date-helpers';
import type { NotionExercise, NotionWorkout } from '../types';

let notionClient: Client | null = null;

const getClient = () => {
  if (!notionClient) {
    notionClient = new Client({
      auth: env.notionApiKey,
      timeoutMs: 5000,
      // Use a stable API version that still supports querying databases directly.
      notionVersion: '2022-06-28',
    });
  }
  return notionClient;
};

const ensureDatabaseId = (id: string | undefined, name: string) => {
  if (!id) {
    throw new Error(`Missing Notion database id for ${name}`);
  }
  return id;
};

const hydrationDailyPropertyMap = {
  date: 'Date',
  total: 'Total (oz)',
  goal: 'Goal (oz)',
};

interface HydrationDay {
  id: string;
  date: string;
  totalOz: number;
  goalOz: number | null;
}

const getTodayHydrationDay = async (): Promise<HydrationDay> => {
  const databaseId = ensureDatabaseId(env.notionHydrationDatabaseId, 'hydration');
  const client = getClient();

  const todayIsoDate = startOfUserDay().toISOString().split('T')[0];

  const existing = await client.request<{ results: any[] }>({
    path: `databases/${databaseId}/query`,
    method: 'post',
    body: {
      filter: {
        property: hydrationDailyPropertyMap.date,
        date: { equals: todayIsoDate },
      },
      page_size: 1,
    },
  });

  if (existing.results.length > 0) {
    const page: any = existing.results[0];
    const props = page.properties ?? {};
    return {
      id: page.id,
      date: todayIsoDate,
      totalOz: props[hydrationDailyPropertyMap.total]?.number ?? 0,
      goalOz: props[hydrationDailyPropertyMap.goal]?.number ?? null,
    };
  }

  const defaultGoal = env.hydrationDailyGoalOz;

  const created = await client.pages.create({
    parent: { database_id: databaseId },
    properties: {
      [hydrationDailyPropertyMap.date]: { date: { start: todayIsoDate } },
      [hydrationDailyPropertyMap.total]: { number: 0 },
      [hydrationDailyPropertyMap.goal]: { number: defaultGoal },
    },
  });

  logger.info('Created new hydration day in Notion', {
    id: created.id,
    date: todayIsoDate,
    goal: defaultGoal,
  });

  return {
    id: created.id,
    date: todayIsoDate,
    totalOz: 0,
    goalOz: defaultGoal,
  };
};

export const addHydrationForToday = async (amountOz: number) => {
  const databaseId = ensureDatabaseId(env.notionHydrationDatabaseId, 'hydration');
  const client = getClient();

  const day = await getTodayHydrationDay();
  const newTotal = (day.totalOz ?? 0) + amountOz;

  await client.pages.update({
    page_id: day.id,
    properties: {
      [hydrationDailyPropertyMap.total]: { number: newTotal },
    },
  });

  const goal = day.goalOz ?? env.hydrationDailyGoalOz;
  const remaining = Math.max(goal - newTotal, 0);

  logger.info('Updated hydration total for today', {
    amountAdded: amountOz,
    newTotal,
    goal,
    remaining,
  });

  return { total: newTotal, goal, remaining };
};

export const getTodayHydrationTotal = async (): Promise<number> => {
  const day = await getTodayHydrationDay();
  return day.totalOz;
};

const workoutPropertyMap = {
  title: 'Name',
  date: 'Workout Date',
  type: 'Workout Type',
  redLight: 'Red Light Therapy',
  acupuncture: 'Acupuncture',
  sauna: 'Sauna',
};

const mapWorkoutPage = (page: any): NotionWorkout => {
  const props = page.properties ?? {};

  const titleProp = props[workoutPropertyMap.title];
  const title =
    titleProp?.title?.[0]?.plain_text ??
    titleProp?.rich_text?.[0]?.plain_text ??
    'Untitled Workout';

  const dateProp = props[workoutPropertyMap.date]?.date;
  const date = dateProp?.start ?? undefined;

  const typeProp = props[workoutPropertyMap.type]?.multi_select ?? [];
  const workoutType = typeProp.map((t: any) => t.name).filter(Boolean);

  return {
    id: page.id,
    name: title,
    date,
    workoutType,
    redLightTherapy: Boolean(props[workoutPropertyMap.redLight]?.checkbox),
    acupuncture: Boolean(props[workoutPropertyMap.acupuncture]?.checkbox),
    sauna: Boolean(props[workoutPropertyMap.sauna]?.checkbox),
  };
};

export const getTodaysWorkouts = async (): Promise<NotionWorkout[]> => {
  if (!env.notionWorkoutDatabaseId) return [];
  const client = getClient();

  const todayIsoDate = startOfUserDay().toISOString().split('T')[0];

  logger.info('Querying Notion for todays workouts', {
    databaseId: env.notionWorkoutDatabaseId,
    date: todayIsoDate,
  });

  const response = await client.request<{ results: any[] }>({
    path: `databases/${env.notionWorkoutDatabaseId}/query`,
    method: 'post',
    body: {
      filter: {
        property: workoutPropertyMap.date,
        date: { equals: todayIsoDate },
      },
      sorts: [
        {
          property: workoutPropertyMap.date,
          direction: 'ascending',
        },
      ],
    },
  });

  const workouts = response.results.map(mapWorkoutPage);

  logger.info('Retrieved workouts from Notion', {
    count: workouts.length,
  });

  return workouts;
};

export const getWorkoutTemplates = async () => {
  if (!env.notionWorkoutDatabaseId) return [];
  const client = getClient();
  const response = await client.request<{ results: any[] }>({
    path: `databases/${env.notionWorkoutDatabaseId}/query`,
    method: 'post',
    body: {},
  });
  return response.results.map(mapWorkoutPage);
};

const extractPlainText = (richTextArray: any[] | undefined): string => {
  if (!richTextArray || richTextArray.length === 0) return '';
  return richTextArray.map((r: any) => r.plain_text ?? '').join(' ').trim();
};

const parseExerciseTableRow = (row: any): NotionExercise | null => {
  if (row.type !== 'table_row') return null;
  const cells = row.table_row?.cells ?? [];

  const name = extractPlainText(cells[0]);
  if (!name) return null;

  const setsText = extractPlainText(cells[1]);
  const repsText = extractPlainText(cells[2]);
  const weightText = extractPlainText(cells[3]);

  const setsNumber = parseInt(setsText, 10);

  const exercise: NotionExercise = {
    name,
  };

  if (!Number.isNaN(setsNumber)) {
    exercise.sets = setsNumber;
  }

  if (repsText) {
    exercise.reps = repsText;
  }

  if (weightText) {
    const numericPart = parseFloat(weightText.split(/[^\d.]/)[0] || '');
    if (!Number.isNaN(numericPart)) {
      exercise.defaultWeight = numericPart;
    }
  }

  return exercise;
};

export const getWorkoutExercises = async (pageId: string): Promise<NotionExercise[]> => {
  const client = getClient();

  // List top-level blocks for the workout page
  const blocks = await client.blocks.children.list({
    block_id: pageId,
    page_size: 50,
  });

  const tableBlock = blocks.results.find((b: any) => b.type === 'table');
  if (!tableBlock) return [];

  const rowsResponse = await client.blocks.children.list({
    block_id: tableBlock.id,
    page_size: 50,
  });

  const exercises: NotionExercise[] = [];
  for (const row of rowsResponse.results as any[]) {
    const ex = parseExerciseTableRow(row);
    if (ex) exercises.push(ex);
  }

  return exercises;
};

export const appendNoteToWorkoutPage = async (pageId: string, note: string) => {
  const client = getClient();

  await client.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: note },
            },
          ],
        },
      },
    ],
  });

  logger.info('Appended session note to workout page', { pageId });
};

export const appendSessionNoteToTodayWorkout = async (note: string) => {
  const workouts = await getTodaysWorkouts();
  if (workouts.length === 0) {
    throw new Error('No workout found for today to attach a note to.');
  }

  // If multiple workouts exist, append to the last one (usually the most recent).
  const target = workouts[workouts.length - 1];
  await appendNoteToWorkoutPage(target.id, note);

  return { workoutId: target.id, workoutName: target.name };
};
