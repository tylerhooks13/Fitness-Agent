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

const checkinPropertyMap = {
  date: 'Date',
  note: 'Note',
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

export const logDailyCheckin = async (note: string, atDate: Date = new Date()) => {
  const databaseId = env.notionCheckinDatabaseId;
  if (!databaseId) return;

  const client = getClient();
  const dateIso = atDate.toISOString().split('T')[0];

  await client.pages.create({
    parent: { database_id: databaseId },
    properties: {
      [checkinPropertyMap.date]: {
        date: { start: dateIso },
      },
      [checkinPropertyMap.note]: {
        rich_text: [
          {
            type: 'text',
            text: { content: note },
          },
        ],
      },
    },
  });

  logger.info('Logged daily check-in to Notion', { date: dateIso });
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

  // Notion requires one title property per database; in your workout DB
  // this is currently "Day of Week". We also fall back to a generic "Name"
  // property so the code remains resilient if you rename columns later.
  const titleProp =
    props['Day of Week'] ??
    props[workoutPropertyMap.title] ??
    props['Name'] ??
    props['Title'];
  const title =
    titleProp?.title?.[0]?.plain_text ??
    titleProp?.rich_text?.[0]?.plain_text ??
    '';

  const dateProp = props[workoutPropertyMap.date]?.date;
  const date = dateProp?.start ?? undefined;

  const typeProp = props[workoutPropertyMap.type]?.multi_select ?? [];
  const workoutType = typeProp.map((t: any) => t.name).filter(Boolean);

  return {
    id: page.id,
    name: title || 'Workout',
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

export const getTemplateWorkouts = async (): Promise<NotionWorkout[]> => {
  if (!env.notionWorkoutDatabaseId) return [];
  const client = getClient();

  const response = await client.request<{ results: any[] }>({
    path: `databases/${env.notionWorkoutDatabaseId}/query`,
    method: 'post',
    body: {
      filter: {
        property: workoutPropertyMap.date,
        date: {
          is_empty: true,
        },
      },
      page_size: 100,
    },
  });

  return response.results.map(mapWorkoutPage);
};

export const getRecentWorkoutsByName = async (
  workoutName: string,
  limit: number = 5,
): Promise<NotionWorkout[]> => {
  if (!env.notionWorkoutDatabaseId) return [];
  const client = getClient();

  const todayIsoDate = startOfUserDay().toISOString().split('T')[0];

  const response = await client.request<{ results: any[] }>({
    path: `databases/${env.notionWorkoutDatabaseId}/query`,
    method: 'post',
    body: {
      filter: {
        and: [
          {
            property: 'Day of Week',
            title: {
              equals: workoutName,
            },
          },
          {
            property: workoutPropertyMap.date,
            date: {
              before: todayIsoDate,
            },
          },
        ],
      },
      sorts: [
        {
          property: workoutPropertyMap.date,
          direction: 'descending',
        },
      ],
      page_size: limit,
    },
  });

  return response.results.map(mapWorkoutPage);
};

export const getWorkoutFrequency = async (
  daysBack: number = 30,
): Promise<{ name: string; count: number }> => {
  if (!env.notionWorkoutDatabaseId) {
    return { name: '', count: 0 };
  }

  const client = getClient();

  const today = startOfUserDay();
  const since = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const sinceDate = since.toISOString().split('T')[0];

  const response = await client.request<{ results: any[] }>({
    path: `databases/${env.notionWorkoutDatabaseId}/query`,
    method: 'post',
    body: {
      filter: {
        and: [
          {
            property: workoutPropertyMap.date,
            date: {
              on_or_after: sinceDate,
            },
          },
          {
            property: workoutPropertyMap.date,
            date: {
              on_or_before: today.toISOString().split('T')[0],
            },
          },
        ],
      },
    },
  });

  const counts: Record<string, number> = {};

  response.results.forEach((page: any) => {
    const workout = mapWorkoutPage(page);
    const key = workout.name || 'Workout';
    counts[key] = (counts[key] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return sorted[0] ?? { name: '', count: 0 };
};

export const getWorkoutOverview = async (
  daysBack: number = 60,
): Promise<{
  totalSessions: number;
  distinctWorkouts: number;
  byType: Record<string, number>;
  sinceDate: string;
  untilDate: string;
}> => {
  if (!env.notionWorkoutDatabaseId) {
    return {
      totalSessions: 0,
      distinctWorkouts: 0,
      byType: {},
      sinceDate: '',
      untilDate: '',
    };
  }

  const client = getClient();

  const today = startOfUserDay();
  const since = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const sinceDate = since.toISOString().split('T')[0];
  const untilDate = today.toISOString().split('T')[0];

  const response = await client.request<{ results: any[] }>({
    path: `databases/${env.notionWorkoutDatabaseId}/query`,
    method: 'post',
    body: {
      filter: {
        and: [
          {
            property: workoutPropertyMap.date,
            date: {
              on_or_after: sinceDate,
            },
          },
          {
            property: workoutPropertyMap.date,
            date: {
              on_or_before: untilDate,
            },
          },
        ],
      },
      page_size: 100,
    },
  });

  const byType: Record<string, number> = {};
  const names = new Set<string>();

  response.results.forEach((page: any) => {
    const workout = mapWorkoutPage(page);
    if (workout.name) names.add(workout.name);
    const types = workout.workoutType && workout.workoutType.length > 0 ? workout.workoutType : ['Uncategorized'];
    types.forEach((t) => {
      byType[t] = (byType[t] || 0) + 1;
    });
  });

  return {
    totalSessions: response.results.length,
    distinctWorkouts: names.size,
    byType,
    sinceDate,
    untilDate,
  };
};

export const getUpcomingWorkoutsThisWeek = async (): Promise<NotionWorkout[]> => {
  if (!env.notionWorkoutDatabaseId) return [];
  const client = getClient();

  const today = startOfUserDay();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const endOfWeek = new Date(today.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);

  const todayIso = today.toISOString().split('T')[0];
  const endIso = endOfWeek.toISOString().split('T')[0];

  const response = await client.request<{ results: any[] }>({
    path: `databases/${env.notionWorkoutDatabaseId}/query`,
    method: 'post',
    body: {
      filter: {
        and: [
          {
            property: workoutPropertyMap.date,
            date: {
              on_or_after: todayIso,
            },
          },
          {
            property: workoutPropertyMap.date,
            date: {
              on_or_before: endIso,
            },
          },
        ],
      },
      sorts: [
        {
          property: workoutPropertyMap.date,
          direction: 'ascending',
        },
      ],
    },
  });

  return response.results.map(mapWorkoutPage);
};

export const getDistinctWorkoutNames = async (maxTemplates = 20): Promise<string[]> => {
  if (!env.notionWorkoutDatabaseId) return [];
  const client = getClient();

  const response = await client.request<{ results: any[] }>({
    path: `databases/${env.notionWorkoutDatabaseId}/query`,
    method: 'post',
    body: {
      // Treat pages without a Workout Date as templates.
      filter: {
        property: workoutPropertyMap.date,
        date: {
          is_empty: true,
        },
      },
      page_size: 100,
    },
  });

  const seen = new Set<string>();
  for (const page of response.results) {
    const workout = mapWorkoutPage(page);
    if (workout.name) {
      seen.add(workout.name);
      if (seen.size >= maxTemplates) break;
    }
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b));
};

export const createWorkoutSessionFromTemplateName = async (
  templateName: string,
  forDate: Date,
): Promise<{ pageId: string }> => {
  if (!env.notionWorkoutDatabaseId) {
    throw new Error('NOTION_WORKOUT_DATABASE_ID is not configured');
  }

  const client = getClient();
  const databaseId = env.notionWorkoutDatabaseId;

  // Find a page whose title matches the template name.
  const searchResponse = await client.request<{ results: any[] }>({
    path: `databases/${databaseId}/query`,
    method: 'post',
    body: {
      filter: {
        property: 'Day of Week',
        title: {
          equals: templateName,
        },
      },
      page_size: 1,
    },
  });

  if (searchResponse.results.length === 0) {
    throw new Error(`No workout template found with name "${templateName}"`);
  }

  const templatePage: any = searchResponse.results[0];

  const dateIso = forDate.toISOString().split('T')[0];

  // Read properties from the template so we can reuse workout type.
  const templateProps = templatePage.properties ?? {};
  const workoutTypeProp = templateProps[workoutPropertyMap.type];
  const workoutType =
    workoutTypeProp?.multi_select?.map((t: any) => ({ name: t.name })).filter((t: any) => t.name) ??
    [];

  const newPage = await client.pages.create({
    parent: { database_id: databaseId },
    properties: {
      // Title property for this DB
      'Day of Week': {
        title: [
          {
            type: 'text',
            text: { content: templateName },
          },
        ],
      },
      [workoutPropertyMap.date]: {
        date: { start: dateIso },
      },
      ...(workoutType.length > 0
        ? {
            [workoutPropertyMap.type]: {
              multi_select: workoutType,
            },
          }
        : {}),
    },
  });

  // Copy blocks from template page to new page body.
  const blocks = await client.blocks.children.list({
    block_id: templatePage.id,
    page_size: 100,
  });

  const children = blocks.results as any[];

  if (children.length > 0) {
    await client.blocks.children.append({
      block_id: newPage.id,
      // The SDK types are stricter than what Notion actually accepts here;
      // we reuse the fetched blocks as the request payload.
      children: children as any,
    });
  }

  logger.info('Created workout session from template', {
    templateName,
    templateId: templatePage.id,
    newPageId: newPage.id,
    date: dateIso,
  });

  return { pageId: newPage.id };
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

export const updateWorkoutWeights = async (
  pageId: string,
  suggestions: { exercise: string; suggestedWeight?: number }[],
) => {
  if (!suggestions.length) return;

  const client = getClient();
  const suggestionMap = new Map(
    suggestions
      .filter((s) => s.suggestedWeight !== undefined)
      .map((s) => [s.exercise.toLowerCase(), s.suggestedWeight as number]),
  );

  if (suggestionMap.size === 0) return;

  const blocks = await client.blocks.children.list({
    block_id: pageId,
    page_size: 50,
  });

  const tableBlock = blocks.results.find((b: any) => b.type === 'table');
  if (!tableBlock) return;

  const rowsResponse = await client.blocks.children.list({
    block_id: tableBlock.id,
    page_size: 50,
  });

  for (const row of rowsResponse.results as any[]) {
    if (row.type !== 'table_row') continue;
    const name = extractPlainText(row.table_row?.cells?.[0]);
    const key = name.toLowerCase();
    if (!suggestionMap.has(key)) continue;

    const weight = suggestionMap.get(key);
    if (weight === undefined) continue;

    const cells = row.table_row?.cells ?? [];
    const newCells = cells.slice();

    // Ensure there is a 4th column for Lbs.
    while (newCells.length < 4) {
      newCells.push([]);
    }

    newCells[3] = [
      {
        type: 'text',
        text: { content: `${weight}` },
      },
    ];

    await client.blocks.update({
      block_id: row.id,
      table_row: {
        cells: newCells,
      },
    } as any);
  }

  logger.info('Updated workout weights in Notion', {
    pageId,
  });
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
