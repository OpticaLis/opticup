var Service = require('node-windows').Service;
var path = require('path');

var svc = new Service({
  name: 'OpticUp Sync Watcher',
  description: 'Watches Dropbox folder and syncs Access sales to Supabase',
  script: path.join(__dirname, 'sync-watcher.js'),
  nodeOptions: [],
  wait: 2,
  grow: 0.25,
  maxRestarts: 5,
  abortOnError: false
});

svc.on('install', function () {
  svc.start();
  console.log('Service installed and started.');
});

svc.on('alreadyinstalled', function () {
  console.log('Service is already installed.');
});

svc.on('error', function (err) {
  console.error('Service error:', err);
});

svc.install();
