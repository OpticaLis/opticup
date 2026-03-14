#!/usr/bin/env node
// =========================================================
// Optic Up — Install Sync Watcher as Windows Service
// =========================================================
// Usage:
//   node install-service.js --key=eyJ... --watch-dir="C:\path\to\sales" --export-dir="C:\path\to\new"
//   node install-service.js   (interactive prompts)
// =========================================================

const Service = require('node-windows').Service;
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const DEFAULT_WATCH_DIR  = 'C:\\Users\\User\\Dropbox\\InventorySync\\sales';
const DEFAULT_EXPORT_DIR = 'C:\\Users\\User\\Dropbox\\InventorySync\\new';

// ── Parse CLI arguments ─────────────────────────────────────
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const match = arg.match(/^--(\w[\w-]*)=(.+)$/);
    if (match) args[match[1]] = match[2];
  });
  return args;
}

// ── Prompt helper ───────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

// ── Set system environment variable (persists across reboots) ─
function setSystemEnv(name, value) {
  try {
    execSync(`setx ${name} "${value}" /M`, { stdio: 'pipe' });
    // Also set for current process so the service can start immediately
    process.env[name] = value;
    console.log(`  ✅ ${name} set as system environment variable`);
  } catch (e) {
    console.error(`  ❌ Failed to set ${name}. Run this script as Administrator.`);
    console.error(`     Right-click Command Prompt → "Run as administrator"`);
    process.exit(1);
  }
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('============================================');
  console.log('  Optic Up — Sync Watcher Service Installer');
  console.log('============================================\n');

  const args = parseArgs();

  // 1. Get service role key
  let key = args.key || '';
  if (!key) {
    console.log('Get your key from: Supabase Dashboard → Settings → API → service_role → Reveal\n');
    key = await prompt('Enter service role key: ');
  }
  if (!key || key.length < 20) {
    console.error('❌ Invalid key. Aborting.');
    process.exit(1);
  }

  // 2. Get watch directory
  let watchDir = args['watch-dir'] || '';
  if (!watchDir) {
    watchDir = await prompt(`Enter watch directory [${DEFAULT_WATCH_DIR}]: `);
    if (!watchDir) watchDir = DEFAULT_WATCH_DIR;
  }

  // 3. Get export directory
  let exportDir = args['export-dir'] || '';
  if (!exportDir) {
    exportDir = await prompt(`Enter export directory [${DEFAULT_EXPORT_DIR}]: `);
    if (!exportDir) exportDir = DEFAULT_EXPORT_DIR;
  }

  console.log('\n--- Configuration ---');
  console.log(`  Key:        ${key.substring(0, 10)}...${key.substring(key.length - 6)}`);
  console.log(`  Watch dir:  ${watchDir}`);
  console.log(`  Export dir: ${exportDir}`);
  console.log('');

  // 4. Set system environment variables
  console.log('Setting environment variables (requires Administrator)...');
  setSystemEnv('OPTICUP_SERVICE_ROLE_KEY', key);
  setSystemEnv('OPTICUP_WATCH_DIR', watchDir);
  setSystemEnv('OPTICUP_EXPORT_DIR', exportDir);

  // 5. Install Windows Service
  console.log('\nInstalling Windows Service...');
  const svc = new Service({
    name: 'OpticUp Sync Watcher',
    description: 'Watches Dropbox folder and syncs Access sales to Supabase',
    script: path.join(__dirname, 'sync-watcher.js'),
    nodeOptions: [],
    env: [
      { name: 'OPTICUP_SERVICE_ROLE_KEY', value: key },
      { name: 'OPTICUP_WATCH_DIR',        value: watchDir },
      { name: 'OPTICUP_EXPORT_DIR',       value: exportDir },
    ],
    wait: 2,
    grow: 0.25,
    maxRestarts: 10,
    abortOnError: false
  });

  svc.on('install', function () {
    console.log('✅ Service installed. Starting...');
    svc.start();
  });

  svc.on('start', function () {
    console.log('✅ Service started successfully!');
    console.log('\nThe watcher is now running in the background.');
    console.log('It will start automatically when Windows boots.');
    console.log('\nTo check status: Go to inventory.html → סנכרון Access → should show "🟢 Watcher פעיל"');
    console.log('To remove:       node uninstall-service.js');
  });

  svc.on('alreadyinstalled', function () {
    console.log('⚠️  Service is already installed.');
    console.log('To reinstall, first run: node uninstall-service.js');
  });

  svc.on('error', function (err) {
    console.error('❌ Service error:', err);
  });

  svc.install();
}

main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
