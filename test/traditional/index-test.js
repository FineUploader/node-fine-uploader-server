/* globals before, after, describe, it */
'use strict';

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    os = require('os');

var mocha = require('mocha'),
    request = require('supertest'),
    Promise = require('promise'),
    uuid = require('uuid'),
    tempWrite = require('temp-write');

var rimraf = Promise.denodeify(require('rimraf')),
    mkdirp = Promise.denodeify(require('mkdirp'));

var ROOT_TEST_FOLDER = 'node-fu-test';

var FineUploader = require('../../index');

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

    return files;
}

function mktmp_dir(name){
    name = name || uuid.v4();

    return path.join(os.tmpdir(), name);

}

describe('traditional', function(){

    var rootDir, fineuploader;

    before(function(){

        rootDir = mktmp_dir(ROOT_TEST_FOLDER);

        var opts = {
            uploads: rootDir
        };

        fineuploader = FineUploader('traditional', opts);

    });

    after(function(){
        rimraf(rootDir);
    });

    it('upload - form', function(done){

        var file_mock = { file: {} };

        file_mock.uuid = uuid.v4();
        file_mock.name = 'foo.dat';
        file_mock.file.path = mktmp_file(100, 'foo.dat');

        return request(fineuploader).
            post('/upload').
            type('form').
            send({ 'qquuid': file_mock.uuid }).
            send({ 'qqfilename': file_mock.name }).
            send({ 'qqfile[filename]': file_mock.name }).
            expect(200, done);
    });

    it('upload - multipart', function(done){

        var file_mock = { file: {} };

        file_mock.uuid = uuid.v4();
        file_mock.name = 'foo.dat';
        file_mock.file.path = mktmp_file(100, 'foo.dat');

        return request(fineuploader).
            post('/upload').
            field('qquuid', file_mock.uuid).
            field('qqfilename', file_mock.name).
            field('qqfile[filename]', file_mock.name).
            attach(file_mock.name, file_mock.file.path).
            expect(200, done);
    });

    it.skip('upload - chunked', function(){
        // doing multiple requests one after the other is clunky in superagent

        var file_mock = { file: {} };

        file_mock.uuid = uuid.v4();
        file_mock.name = 'foo.dat';
        file_mock.files = mktmp_files(100, 'foo.dat');

        for (var i = 0; i < file_mock.files.size; i++){
            request(fineuploader).
                post('/upload').
                field('qquuid', file_mock.uuid).
                field('qqfilename', file_mock.name).
                field('qqfile[filename]', file_mock.name).
                field('qqpartindex', i).
                field('qqpartbyteoffset', 100).
                field('qqchunksize', 100).
                field('qqtotalparts', 100).
                field('qqtotalfilesize', 100*100).
                attach(file_mock.name, file_mock.file.path).
                expect(200);
        }

    });


});

