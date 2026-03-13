var Service = require('node-windows').Service;
var path = require('path');

var svc = new Service({
  name: 'OpticUp Sync Watcher',
  description: 'Watches Dropbox folder and syncs Access sales to Supabase',
  script: path.join(__dirname, 'sync-watcher.js')
});

svc.on('uninstall', function () {
  console.log('Service removed.');
});

svc.on('error', function (err) {
  console.error('Service error:', err);
});

svc.uninstall();
