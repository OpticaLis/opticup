var Service = require('node-windows').Service;
var path = require('path');

var svc = new Service({
  name: 'OpticUp Sync Watcher',
  description: 'Watches Dropbox folder and syncs Access sales to Supabase',
  script: path.join(__dirname, 'sync-watcher.js')
});

svc.on('uninstall', function () {
  console.log('✅ Service removed successfully.');
});

svc.on('alreadyuninstalled', function () {
  console.log('⚠️  Service is not installed (nothing to remove).');
});

svc.on('error', function (err) {
  console.error('❌ Service error:', err);
  process.exitCode = 1;
});

svc.uninstall();
