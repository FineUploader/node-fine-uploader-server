'use strict';

var restify = require('restify'),
    debug = require('debug')('fineuploader');

var bodyParser = require('body-parser'),
    multer = require('multer'),
    st = require('st');

module.exports = function(handlerModule, opts){
    var server = restify.createServer({
        name: 'fine-uploader-server'
    });

    // request body parser
    server.use(restify.bodyParser());

    // static site hosting
    if (opts.static) {
        debug("Hosting static files from: " + opts.static);
        server.get(/\/?.*/, restify.serveStatic({
            directory: opts.static,
            default: 'index.html'
        }));
    }

    // specification for routes
    var routes = {
        // traditional endpoint specification
        upload: {
            method: 'post',
            url: '/upload'
        },
        delete: {
            method: 'del',
            url: '/upload/:uuid'
        },

        // s3 endpoint specification
        sign: {
            method: 'post',
            url: '/sign'
        },
        success: {
            method: 'post',
            url: '/success'
        }
    };

    // require the module which handles requests based on the `routes`
    // defined above.
    // (traditional, s3, etc...)
    var uploadHandlerModule = require('./lib/' + handlerModule),
        uploadHandler = uploadHandlerModule(opts);


    // serverly the handler methods to the restify serverlication
    Object.keys(uploadHandler).forEach(function(handler_name){
        var route_spec = routes[handler_name],
            handler = uploadHandler[handler_name];

        if (route_spec){
            var method = route_spec.method,
                url = route_spec.url;

            server[method](url, handler);
        }
    });

    return server;
};

