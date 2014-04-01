#!/usr/bin/env node

var cluster = require('cluster');
var path = require('path');
var chokidar = require('chokidar');
var argv = require('minimist')(process.argv.slice(2));
var Superstatic = require('../lib/server');
var defaults = require('../lib/defaults');
var ConfigFile = require('../lib/server/settings/file');
var JSUN = require('jsun');
var fs = require('fs');

// app working directory
var port = exports.port =  argv.port || argv.p || defaults.PORT;
var host = exports.host = argv.host || argv.h || defaults.HOST;
var overrideConfig =  exports.overrideConfig = parseOverrideConfig(argv);
var awd = exports.awd = (argv._[0])
 ? path.resolve(process.cwd(), argv._[0])
 : defaults.DIRECTORY;
var envJSON = path.join(awd, "./.env.json");

////////////
// MASTER //
////////////

if (cluster.isMaster) {
  console.log('Cluster: Master running ... ');

  // Count the number of CPUs
  var cpuCount = require('os').cpus().length;

  // Create a worker for each CPU
  for (var i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    cluster.fork();

    if (worker.suicide === true) {
      console.log('Cluster: Worker ' + worker.id + ' was intentionally killed.');
    } else {
      console.log('Cluster: Worker ' + worker.id + ' died.');
    }
  });
}

////////////
// WORKER //
////////////

if (cluster.isWorker) {
  console.log('Cluster: Worker ' + cluster.worker.id + ' running ... ');

  // Set configuration options
  var configOptions = (overrideConfig)
    ? {
        config: overrideConfig,
        cwd: awd
      }
    : {
        file: (argv.c || argv.config || 'superstatic.json'),
        cwd: awd
      }

    if (fs.existsSync(envJSON)) {
      var localEnv = JSON.parse(fs.readFileSync(envJSON));
    }

  // Create server
  server = Superstatic.createServer({
    port: port,
    host: host,
    settings: new ConfigFile(configOptions),
    localEnv: localEnv,
    store: {
      type: 'local',
      options: {
        cwd: awd
      }
    }
  });

  // Alert on start
  server.start(function () {
    console.log('Server started on port ' + port.toString());
  });

  // Kill (and restart) the worker if the configuation changes
  process.nextTick(function () {
    try{
      chokidar.watch(server.settings.getConfigFileName())
        .on('change', function() {
          console.log('Configuration file changed. Restarting worker...');
          cluster.worker.kill()
        });
    }
    catch (e) {}
  });
}

function parseOverrideConfig (argv) {
  var overrideConfig = argv.config || argv.c || undefined;
  
  if (overrideConfig) {
    var parsed = JSUN.parse(overrideConfig);
    if (parsed.err) return overrideConfig = undefined;
    
    overrideConfig = parsed.json;
  }
  
  return overrideConfig;
}
