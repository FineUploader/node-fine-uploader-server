/* globals before, after, describe, it */
'use strict';

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    os = require('os');

var mocha = require('mocha'),
    Promise = require('promise'),
    uuid = require('uuid'),
    tempWrite = require('temp-write');

var rimraf = Promise.denodeify(require('rimraf')),
    mkdirp = Promise.denodeify(require('mkdirp'));

var ROOT_TEST_FOLDER = 'node-fu-test';

var Storage = require('../../lib/traditional/storage');

function mktmp_file(size, name){
    var content = '';

    for (var i = 0; i < size; i++){
        content = content + '0';
    }

    return tempWrite.sync(content, name);
}

function mktmp_files(n, name){
    var files = [];

    for (var i = 0; i < n; i++){
        files.push(mktmp_file(100, name+'_'+i+'.dat'));
    }
}

function mktmp_dir(name){
    name = name || uuid.v4();

    return path.join(os.tmpdir(), name);

}

describe('traditional - storage', function(){

    var tmpRoot, chunksPath, uploadsPath, storage;

    before(function(){

        tmpRoot = mktmp_dir(ROOT_TEST_FOLDER);

        chunksPath = path.join(tmpRoot, 'chunks'),
        uploadsPath = path.join(tmpRoot, 'uploads');

        storage = new Storage(chunksPath, uploadsPath);

    });

    after(function(){
        rimraf(tmpRoot);
    });

    it('#store_file', function(){

        var file_mock = { file: {} };

        file_mock.uuid = uuid.v4();
        file_mock.name = 'foo.dat';
        file_mock.file.path = mktmp_file(100, 'foo.dat');

        return storage.store_file(file_mock).then(function(newPath){

            var stats = fs.statSync(newPath);
            if (stats.isFile()){
                assert.ok(true);
            } else {
                assert(false);
            }

        });
    });

    it.skip('#store_chunk', function(){
        var chunk_mock = { chunk: {} };

        chunk_mock.uuid = uuid.v4();
        chunk_mock.name = 'foo.dat';
        chunk_mock.chunk.path = mktmp_files(100, 'foo.dat');

    });

    it.skip('#assemble_chunks', function(){

    });

    it.skip('#delete_file', function(){

    });

    it.skip('#verify_upload', function(){

    });

});

