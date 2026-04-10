import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Reads credentials from $HOME/.optic-up/credentials.env.
 * Returns an object mapping KEY → value. No dotenv, no interpolation.
 */
export default function loadEnv() {
  const filePath = join(homedir(), '.optic-up', 'credentials.env');
  let raw;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(
      `credentials file not found at ${filePath}. ` +
      'Create it per docs/CREDENTIALS.md (TODO)'
    );
  }
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    env[key] = value;
  }
  return env;
}
