import type { Handle } from '@sveltejs/kit';
import '$lib/server/env';

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
