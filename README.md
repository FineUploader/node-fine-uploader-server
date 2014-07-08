fine-uploader-server
----

An [express](github.com/visionmedia/express) server for handling [Fine Uploader](github.com/widen/fine-uploader) upload requests.

[![Build Status](http://img.shields.io/travis/Widen/node-fine-uploader-server.svg?style=flat)](https://travis-ci.org/Widen/node-fine-uploader-server)

# Example

`npm install -g fine-uploader-server`

```
# upload to /tmp; serve from ./static
$ fine-uploader-server --storage traditional --uploads-dir /tmp ./static
```

To enable the debug log (useful for seeing what is going on):

```
$ DEBUG=fineuploader fine-uploader-server -u /tmp ./static
```

**or via the javascript api...**

```
var fineuploader = require('fineuploader');

// Traditional Storage
var storage = 'traditional';
var opts = {
   static: '/var/www/',
   uploads: '/tmp/uploads'
};

// S3 Storage - uncomment below to use an S3 storage backend instead.
// var storage = 's3';
// var opts = {
//     auth: {
//         server_public: '', // default is process.env.SERVER_PUBLIC_KEY
//         server_secret: '', // default is process.env.SERVER_SECRET_KEY
//        client_secret: ''  // default is process.env.CLIENT_SECRET_KEY
//    },
//    bucket: 'uploadbucket'
// };

var app = fineuploader(storage, opts);
app.listen('8000', function(){
    var startMessage = "start: " + argv.host + ":" + argv.port;
});
```

# API



### `var app = fineuploader(storage, opts);`


#### Parameters:

**`storage`**: A string indicating the storage backend ('traditional', 's3').

**`opts`**: An object containing the pertinent options for the storage backed being used. See the backend's documentation.

#### Returns:

An instance of an express http server.

# Command-Line Use

This server can also be launched from the command-line using the following options:

```
Usage:

   fineuploader [options] STATIC


   STATIC is an optional directory to host static files from

   -p, --port  The port (default: 8000)
   -h, --host  The hostname (default: localhost)
   -s, --storage The storage backend to use (default: traditional)

   Traditional Storage Backend Options:
       -u, --upload-dir The name of the disk upload directory (default: ./uploads)

   S3 Storage Backend Options:
       -b, --bucket    The S3 bucket name
```


# Storage Backends

Traditional and S3 storage backends are supported (with more planned). Non-chunked uploads, [chunked uploads](http://docs.fineuploader.com/branch/master/features/chunking.html), and [concurrently chunked uploads](http://docs.fineuploader.com/branch/master/features/concurrent-chunking.html) are supported.

All backends also support delete requests.

## Traditional (on disk) Storage

The traditional (on disk) storage backend requires a folder on disk to send uploads to.

**Name**: 's3'

**Options**:

| Option Name | Value Type | Default Value |
|-------------|------------|---------------|
| uploads | `string` | `'./uploads'` |

## Amazon S3 Storage

The S3 storage backend requires the user's S3 credentials in order to perform
delete operations, and to verify that a file has succesfully be uploaded.

**Name**: 's3'

**Options**:

| Option Name | Value Type | Default Value |
|-------------|------------|---------------|
| bucket | `string` | `undefined` |
| auth.client_secret | `string` | `process.env.CLIENT_SECRET_KEY` |
| auth.server_public | `string` | `process.env.SERVER_PUBLIC_KEY` |
| auth.server_private | `string` | `process.env.SERVER_SECRET_KEY` |

# Future Plans

The intent of this is to eventually be an express server that can be easily ran anywhere and support any Fine Uploader endpoint type.

The way this will work is that each endpoint handler will be a [connect middleware](http://stackoverflow.com/questions/5284340/what-is-node-js-connect-express-and-middleware). Each middleware will only depend on what it needs to depend on to get the job done. This repository will then act as a sort of meta-repository for Fine Uploader connect/express middleware, but bundled into an easy to run application. In the future, the user will be able to select which middleware they want to use and use this application if they so choose, without having to pull in dependencies for other middleware/storage backends.

This offers more advanced integrators to add more functionality to their upload handlers (CORS, authentication, etc.) without needing to touch the code that actually handles the upload. I believe this modular design will benefit end-users in the future.

## Future Backends

- [Azure](http://docs.fineuploader.com/branch/master/endpoint_handlers/azure.html)

## Future Features

- Method overrides (e.g., using POST to delete)
- [CORS Support](http://docs.fineuploader.com/branch/master/features/CORS.html) in non-modern browsers.
- [Thumbnail support](http://docs.fineuploader.com/branch/master/features/thumbnails.html) for non-modern browsers.

# Contributing

File uploads on the web is a complex process, especially when one wants to support a wide variety of browsers, and there are most likely holes in this server implementation (security, functionality, and otherwise). Please, feel free to [create a new issue](/issues/new), or submit a pull request if you see anything missing.

If you add features, try to add tests! Or help me complete the tests because they are definitely not 100% :P.

## Developing

Just some notes...

`package.json` is used as the build tool currently. Run `npm test` to run the tests. `npm run devsrv` will run a test traditional storage backed. `npm run s3` will run a test s3, but make sure you have your credentials in environment variables (detailed above)!
