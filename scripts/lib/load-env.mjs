import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const REQUIRED = ['PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'PUBLIC_DEFAULT_TENANT'];

/** Reads credentials from $HOME/.optic-up/credentials.env (local dev) or process.env (CI). */
export default function loadEnv() {
  const credPath = join(homedir(), '.optic-up', 'credentials.env');
  if (existsSync(credPath)) {
    const raw = readFileSync(credPath, 'utf-8');
    const env = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
    }
    return env;
  }

  // Fallback: process.env (for CI)
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length === 0) {
    const env = {};
    for (const k of REQUIRED) env[k] = process.env[k];
    return env;
  }

  throw new Error(
    `Credentials not found. Checked ${credPath} (missing) and ` +
    `process.env (missing keys: ${missing.join(', ')}). ` +
    'Set up locally via $HOME/.optic-up/credentials.env or via CI env vars.'
  );
}
