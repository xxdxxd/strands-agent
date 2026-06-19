import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasConfiguredApiKey } from '$lib/server/openai-config';

export const GET: RequestHandler = async () => {
  return json({
    status: 'ok',
    timestamp: Date.now(),
    hasEnvKey: hasConfiguredApiKey(),
  });
};
