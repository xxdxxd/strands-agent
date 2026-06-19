/**
 * Server-side OpenAI-compatible configuration via SvelteKit private env.
 */

import { env } from '$env/dynamic/private';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const PLACEHOLDER_KEYS = new Set(['MY_OPENAI_API_KEY', 'your_actual_api_key', '']);

export function getOpenAIApiKey(): string {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey || PLACEHOLDER_KEYS.has(apiKey)) {
    throw new Error(
      'No valid OPENAI_API_KEY was provided. Set OPENAI_API_KEY in your .env file.'
    );
  }
  return apiKey;
}

export function getOpenAIBaseURL(): string {
  return env.OPENAI_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

export function getOpenAIModel(): string {
  return env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function getAppUrl(): string {
  return env.APP_URL?.trim() || 'https://github.com/xxdxxd/strands-agent';
}

export function hasConfiguredApiKey(): boolean {
  const apiKey = env.OPENAI_API_KEY?.trim();
  return !!apiKey && !PLACEHOLDER_KEYS.has(apiKey);
}
