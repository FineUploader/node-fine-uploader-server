'use strict';

var assert = require('assert'),
    path = require('path'),
    debug = require('debug')('fineuploader');

var Storage = require('./storage');

// A map of fine uploaders parameter names
var params = {
    'file': 'qqfile',
    'name': 'qqfilename',
    'uuid': 'qquuid',

    'totalSize': 'qqtotalfilesize',
    'chunkIndex': 'qqpartindex',
    'totalChunks': 'qqtotalparts'
};

/**
 * Traditional (on disk) upload module
 *
 */
module.exports = function(opts){

    assert(typeof opts.uploads === 'string' ,"Uploads directory required");

    var chunksPath = path.join(opts.uploads, 'chunks'),
        uploadsPath = path.join(opts.uploads, 'uploads');

    var storage = new Storage(chunksPath, uploadsPath);

    function respond(error, retry, reset){
        var response = {};

        if (error) {
            response.error = error.message || 'Unknown error!';
            if (retry !== undefined){ response.preventRetry = !retry; }
            if (reset !== undefined){ response.reset = reset; }
            debug('response: <error ' + response.error + '>');
        } else {
            debug('response: success');
            response.success = true;
        }

        return JSON.stringify(response);
    }

    function validate_chunk(chunk){
        var maxChunkSize = 5000000000000; //@TODO: parameterize
        return (chunk.size === 0 || chunk.size < maxChunkSize);
    }

    function validate_file(file){
        var maxFileSize = 5000000000000; //@TODO: parameterize
        return (file.size === 0 || file.size < maxFileSize);
    }

    return {
        'upload': function(req, res, next){
            debug('upload received');
            var uploadedFile = {};

            uploadedFile.file = req.files[params.file];
            uploadedFile.uuid = req.body[params.uuid];
            uploadedFile.name = req.body[params.name] || uploadedFile.file.name;

            if (req.body[params.chunkIndex]){

                debug('chunked upload');
                uploadedFile.totalSize = req.body[params.totalSize];
                uploadedFile.chunkIndex = req.body[params.chunkIndex];
                uploadedFile.totalChunks = req.body[params.totalChunks];

                storage.store_chunk(uploadedFile).then(function(){
                    debug('storing chunk');

                    storage.verify_chunks(uploadedFile).then(function(){
                        debug('all chunks found');
                        storage.assemble_chunks(uploadedFile).then(function(){
                            res.end(respond());
                        }, function(e){
                            res.end(respond(e));
                        });
                    }, function(e){
                        debug('waiting for more chunks ...');
                        res.end(respond());
                    });

                }, function(error){
                    res.end(respond(error));
                });

            } else {
                debug('simple upload');
                storage.store_file(uploadedFile).then(function(){
                    res.end(respond());

                }, function(error){
                    res.end(respond(error));
                });
            }

        },
        'delete': function(req, res, next){
            debug('delete received');
            var deleteParams = {};
            deleteParams.uuid = req.params.uuid;

            storage.delete_file(deleteParams.uuid).then(function(){
                res.statusCode = 200;
                res.send(JSON.stringify(respond()));

            }, function(err){
                res.statusCode = 500;
                res.send(JSON.stringify(respond(err)));

            });

            return res.end();

        },
        'success': function(req, res, next){
            var uuid = req.body[params.uuid],
                name = req.body[params.name],
                totalSize = req.body[params.totalSize],
                totalChunks = req.body[params.totalChunks];

            var chunk = {
                uuid: uuid,
                name: name,
                totalSize: totalSize,
                totalChunks: totalChunks
            };

            storage.verify_chunks(chunk).then(function(){
                storage.assemble_chunks(chunk).then(function(){
                    storage.verify_upload(chunk).then(function(){
                        debug('success received');
                        res.send(200);

                    }, function(err){
                        res.status(300);
                        res.send(JSON.stringify(err));

                    });
                });
            }, function(e){
                res.status(300);
                res.send(JSON.stringify(err));
            });

            return res.end();

        }
    };

};
