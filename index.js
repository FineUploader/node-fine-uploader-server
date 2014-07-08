'use strict';

var express = require('express'),
    debug = require('debug')('fineuploader');

var bodyParser = require('body-parser'),
    multer = require('multer'),
    st = require('st');

module.exports = function(handlerModule, opts){
    var app = express();

    // request body parser
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    // multipart request body parser
    app.use(multer());

    // static site hosting
    if (opts.static) {
        debug("Hosting static files from: " + opts.static);
        app.use(st(opts.static));
    }

    // specification for routes
    var routes = {
        // traditional endpoint specification
        upload: {
            method: 'post',
            url: '/upload'
        },
        delete: {
            method: 'delete',
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


    // apply the handler methods to the express application
    Object.keys(uploadHandler).forEach(function(handler_name){
        var route_spec = routes[handler_name],
            handler = uploadHandler[handler_name];

        if (route_spec){
            var method = route_spec.method,
                url = route_spec.url;

            app[method](url, handler);
        }
    });

    return app;
};

