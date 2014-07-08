#!/usr/bin/env node
'use strict';

var minimist = require('minimist'),
    path = require('path'),
    debug = require('debug')('fineuploader');

var argv = minimist(process.argv.slice(2), {
    alias: {
        'p': ['port'],
        'h': ['host'],
        's': ['storage'],
        'u': ['upload-dir'],
        'b': ['bucket']
    },
    default: {
        'host': 'localhost',
        'port': '8000',
        'storage': 'traditional',

        'upload-dir': '/tmp/uploads'
    }
});

if (argv.help){
    console.log('Usage: \n' +
'\n' +
'   cli.js [options] STATIC \n' +
'\n' +
'\n' +
'   STATIC is an optional directory to host static files from\n' +
'\n' +
'   -p, --port  The port (default: 8000)\n' +
'   -h, --host  The hostname (default: localhost)\n' +
'   -s, --storage The storage backend to use (default: traditional)\n' +
'\n'+
'   Traditional Storage Backend Options:\n' +
'       -u, --upload-dir The name of the disk upload directory (default: ./uploads)\n' +
'\n'+
'   S3 Storage Backend Options:\n' +
'       -b, --bucket    The S3 bucket name\n');

    process.exit();
}

var fineuploader = require('../index');

var opts = {};
if (argv._[0]){
    opts.static = path.resolve(argv._[0]);
}

if (argv.storage === 's3'){
    opts.auth = {};
    opts.bucket = argv.bucket;
    opts.auth.server_public = process.env.SERVER_PUBLIC_KEY;
    opts.auth.server_secret = process.env.SERVER_SECRET_KEY;
    opts.auth.client_secret = process.env.CLIENT_SECRET_KEY;
} else {
    opts.uploads = path.resolve(argv['upload-dir']);
}

debug("storage: " + argv.storage);
debug("options: " + JSON.stringify(opts));

var app = fineuploader(argv.storage, opts);

app.listen(argv.port, argv.host, function(){
    var startMessage = "start: " + argv.host + ":" + argv.port;
    debug(startMessage);
});

