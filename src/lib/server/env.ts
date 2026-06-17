/**
 * Load variables from the project-root `.env` file into `process.env`.
 * Existing environment variables (shell, Docker, etc.) are not overwritten.
 */

import dotenv from 'dotenv';
import path from 'node:path';

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;

  dotenv.config({
    path: path.resolve(process.cwd(), '.env'),
    quiet: true,
  });

  loaded = true;
}

loadEnv();
