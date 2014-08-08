/* globals before, after, describe, it */
'use strict';

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    os = require('os');

var mocha = require('mocha'),
    Promise = require('promise'),
    uuid = require('uuid'),
    tempWrite = require('temp-write'),
    async = require('async');

var rimraf = Promise.denodeify(require('rimraf')),
    mkdirp = Promise.denodeify(require('mkdirp'));

var ROOT_TEST_FOLDER = 'node-fu-test';

var Storage = require('../../lib/traditional/storage');

function mktmp_file(size, name){
    return new Promise(function(resolve, reject){
        var content = '';

        for (var i = 0; i < size; i++){
            content = content + '0';
        }

        tempWrite(content, name, function(err, path){
            if (err) return reject(err);
            return resolve(path);
        });

    });
}

function mktmp_files(n, name, size){
    var size = size || 100;

    return new Promise(function(resolve, reject){

        function success(path){
            files.push(path);
        }

        function error(err){
            reject(err);
        }

        async.timesSeries(n, function(i, next){
            mktmp_file(size, name+'_'+i+'.dat').then(function(path){
                next(null, path);
            }, function(err){
                reject(err);
            })
        }, function(err, files){
            resolve(files);

        });

    });
}

function mktmp_dir(name){
    name = name || uuid.v4();

    return path.join(os.tmpdir(), name);

}

function MockChunk(uuid, name, index, path, totalChunks){

    var chunk_mock = { file: {} };
    chunk_mock.uuid = uuid;
    chunk_mock.name = name;
    chunk_mock.chunkIndex = index;
    chunk_mock.file.path = path;
    chunk_mock.totalChunks = totalChunks;

    return chunk_mock;

}

describe('traditional - storage', function(){

    var tmpRoot, chunksPath, uploadsPath, storage;

    beforeEach(function(){

        tmpRoot = mktmp_dir(ROOT_TEST_FOLDER);

        chunksPath = path.join(tmpRoot, 'chunks'),
        uploadsPath = path.join(tmpRoot, 'uploads');

        storage = new Storage(chunksPath, uploadsPath);

    });

    afterEach(function(){
        rimraf(tmpRoot);
    });

    function store_chunks(num_chunks, size){
        return new Promise(function(resolve, reject){

            mktmp_files(num_chunks, 'many-foochunks.dat', size).then(function(chunks){
                var totalChunks = chunks.length,
                    chunkUuid = uuid.v4();


                var i = 0,
                    newPath, chunk_mock;

                // note that this is an `eachSeries`
                async.eachSeries(chunks, function(chunk, done) {
                    chunk_mock = MockChunk(chunkUuid, 'foo.dat', i, chunk,
                                           totalChunks);
                    i++;
                    storage.store_chunk(chunk_mock).then(function(p){
                        newPath = p;
                        done();
                    }, done);
                }, function(err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve({
                        newPath: newPath,
                        chunk_mock: chunk_mock
                    });
                });
            });
        });
    }

    it('#store_file', function(done){

        var file_mock = { file: {} };

        file_mock.uuid = uuid.v4();
        file_mock.name = 'foo.dat';
        mktmp_file(100, 'foo.dat', 100).then(function(path){
            file_mock.file.path = path;
            return storage.store_file(file_mock).then(function(newPath){

                var stats = fs.statSync(newPath);
                if (stats.isFile()){
                    assert.ok(true);
                } else {
                    assert(false);
                }
                done();

            });

        });

    });

    it('#store_chunk', function(){
        //var chunks = mktmp_files(100, 'foo.dat', 100),
        mktmp_file(100, 'foo.dat').then(function(chunk){
            var  chunkUuid = uuid.v4();

            var chunk_mock = { file: {} };
            chunk_mock.uuid = chunkUuid;
            chunk_mock.name = 'foochunk.dat';
            chunk_mock.chunkIndex = 0;
            chunk_mock.file.path = chunk;
            chunk_mock.totalChunks = 1;

            storage.store_chunk(chunk_mock).then(function(newPath){
                assert(newPath.indexOf(chunksPath) !== -1, "Chunks not in to chunks path");
                var chunksPath = path.join(chunksPath, chunkUuid);
                var chunks = fs.readdirSync(chunksPath);

                assert(chunks.length === 1, "Missing chunks!");
                done();

            }, function(e) {
                assert(false, "Error storing chunk!");
                done(e);
            });

        });

    });

    describe("#store_chunks (many)", function(){
        this.timeout(10000);

        it("100x10B", function(done) {

            var numChunks = 100,
                chunkSize = 10;

            store_chunks(numChunks, chunkSize).then(function(data){
                var newPath = data.newPath,
                    chunk_mock = data.chunk_mock;

                var testChunksPath = path.join(chunksPath, chunk_mock.uuid),
                    chunkList = fs.readdirSync(testChunksPath);

                console.log('done?');
                done();
                assert(chunkList.length == numChunks, "Missing " + (totalChunks - chunkList.length) + " chunks!");
                //console.log('done?');
                //done();

            }, function(e) {
                assert(false, "Error storing chunk!");
                done(e);

            }).fail;
        });

        it("10000x1B", function(done) {

            var numChunks = 10000,
                chunkSize = 1;

            store_chunks(numChunks, chunkSize, function(data) {
                var newPath = data.newPath,
                    chunk_mock = data.chunk_mock;

                var testChunksPath = path.join(chunksPath, chunk_mock.uuid),
                    chunkList = fs.readdirSync(testChunksPath);

                console.log(chunkList.length);
                console.log(numChunks - 1);

                console.log("done?");
                done();
                assert(chunkList.length === numChunks - 1, "Missing " + (totalChunks - chunkList.length) + " chunks!");
                //console.log("done?");
                //done();

            }, function(e) {
                assert(false, "Error storing chunk!");
                done(e);

            });
        });


    });

    describe('#assemble_chunks', function(){

        it.skip("100x100B", function(done){
            store_chunks(100, 100, function(data){
                var newPath = data.newPath,
                    chunk_mock = data.chunk_mock;

                console.log(chunk_mock);
                storage.assemble_chunks(chunk_mock).then(function(){
                    var uploadedFile = path.join(uploadsPath, chunk_mock.uuid,
                                                    chunk_mock.name);
                    var uploadedFileStats = fs.statSync(testUploadsPath);

                    console.log(uploadedFileStats);

                    assert(uploadedFileStats.size === 100*100,
                           "Incorrect assembled chunk size");

                    done();

                }, function(e) {
                    assert(false, "Error assembling chunks");
                    done(e);

                });
            }, function(e) {
                assert(false, "Error storing chunks");
                done(e);

            });
        });

    });

    it.skip('#delete_file', function(){

    });

    it.skip('#verify_upload', function(){

    });

});

