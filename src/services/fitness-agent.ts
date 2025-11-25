import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { logger } from '../utils/logger';

let cachedSystemPrompt: string | null = null;
let openaiClient: OpenAI | null = null;

const loadSystemPrompt = (): string => {
  if (cachedSystemPrompt) return cachedSystemPrompt;

  try {
    const rootDir = process.cwd();
    const personaPath = path.join(rootDir, 'agent-persona.md');
    const interactionsPath = path.join(rootDir, 'Agent-interactions.md');

    const persona = fs.existsSync(personaPath)
      ? fs.readFileSync(personaPath, 'utf8')
      : '';
    const interactions = fs.existsSync(interactionsPath)
      ? fs.readFileSync(interactionsPath, 'utf8')
      : '';

    cachedSystemPrompt = [
      'You are the Where the Fire Went Fitness Agent.',
      'Follow the persona and behavioral rules below when responding.',
      '',
      persona,
      '',
      '---',
      '',
      'Interaction patterns and response structure:',
      interactions,
    ]
      .join('\n')
      .trim();

    return cachedSystemPrompt;
  } catch (error) {
    logger.error('Failed to load agent persona files', error);
    cachedSystemPrompt =
      'You are a warm but stern fitness coach focused on discipline, recovery, and simple, effective training.';
    return cachedSystemPrompt;
  }
};

const getClient = (): OpenAI | null => {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY is not set; runFitnessAgent will return a fallback message.');
    return null;
  }
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
};

export const runFitnessAgent = async (message: string): Promise<string> => {
  const client = getClient();
  if (!client) {
    return 'I can log session notes and generate your daily brief. To enable deeper coaching conversations, set OPENAI_API_KEY in the environment.';
  }

  const systemPrompt = loadSystemPrompt();

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 600,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return 'I was not able to generate a response. Try asking that again in different words.';
    }
    return content;
  } catch (error) {
    logger.error('OpenAI chat completion failed', error);
    return 'I ran into an issue while generating a response. Try again in a moment.';
  }
};

