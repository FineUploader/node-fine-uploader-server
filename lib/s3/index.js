'use strict';

var assert = require('assert'),
    crypto = require('crypto'),
    aws = require('aws-sdk'),
    debug = require('debug')('fineuploader');

/**
 * The Fine Uploader S3 middleware.
 *
 * @param opts object An object full of options for the middleware.
 *
 *      opts = {
 *          bucket: '', // REQUIRED
 *          auth: {
 *              client_secret: '', // REQUIRED
 *              server_public: '', // REQUIRED
 *              server_secret: '', // REQUIRED
 *          }
 *      }
 *
 * @return object An object of middleware routes that can be used by express/connect.
 *
 */
module.exports = function(opts){

    assert(typeof opts.auth.client_secret === 'string', 'CLIENT_SECRET_KEY required');
    assert(typeof opts.auth.server_public === 'string', 'SERVER_PUBLIC_KEY required');
    assert(typeof opts.auth.server_secret === 'string', 'SERVER_SECRET_KEY required');

    aws.config.update({
        accessKeyId: opts.auth.server_public,
        secretAccessKey: opts.auth.server_secret
    });

    assert(typeof opts.bucket === 'string', 'Bucket required');

    var expectedBucket = opts.bucket,
        expectedMaxSize = 200*1024*1024*1024,
        s3 = new aws.S3();


    function deleteFile(bucket, key, callback) {
        callS3('delete', {
            bucket: bucket,
            key: key
        }, callback);
    }

    function callS3(type, spec, callback) {
        s3[type + 'Object']({
            Bucket: spec.bucket,
            Key: spec.key
        }, callback)
    }


    /**
     * After the file is in S3, make sure it isn't too big.
     * Omit if you don't have a max file size, or add more logic as required.
     */
    function verifyFileInS3(req, res) {
        function headReceived(err, data) {
            if (err) {
                res.status(500);
                debug(err);
                res.end(JSON.stringify({error: 'Problem querying S3!'}));
            }
            else if (data.ContentLength > expectedMaxSize) {
                res.status(400);
                res.write(JSON.stringify({error: 'Too big!'}));
                deleteFile(req.body.bucket, req.body.key, function(err) {
                    if (err) {
                        debug('Couldn\'t delete invalid file!');
                    }

                    res.end();
                });
            }
            else {
                res.end();
            }
        }

        callS3('head', {
            bucket: req.body.bucket,
            key: req.body.key
        }, function(err, data){
            if (err) {
                res.status(500);
                debug(err);
                res.end(JSON.stringify({error: 'Problem querying S3!'}));
            }
            else if (data.ContentLength > expectedMaxSize) {
                res.status(400);
                res.write(JSON.stringify({error: 'Too big!'}));
                deleteFile(req.body.bucket, req.body.key, function(err) {
                    if (err) {
                        debug('Couldn\'t delete invalid file!');
                    }

                    res.end();
                });
            }

        });
    }

    return {
        /**
         * Sign a REST request or form submit with the secret key and request
         * data for sending to S3.
         */
        'sign': function(req, res, next){
            debug('signature request received');

            res.setHeader('Content-Type', 'application/json');

            if (req.body.headers) {
                debug('REST upload request');
                var headers = req.body.headers,
                    signature = sign_headers(headers, opts.auth.client_secret);

                if (validate_rest_signature(headers, opts.bucket)){
                    res.status(200);
                    res.send(JSON.stringify(signature));

                } else {
                    res.status(400);
                    res.send(JSON.stringify({invalid: true, error: 'Invalid REST request.'}));

                }

            }
            else {
                debug('simple upload request');
                var body = JSON.parse(JSON.stringify(req.body)),
                    signature = sign_policy(body, opts.auth.client_secret);

                // @TODO: remove short-circuit
                if (true || validate_policy(body, opts)){
                    res.status(200);
                    res.send(JSON.stringify(signature));

                } else {
                    res.status(400);
                    res.send(JSON.stringify({invalid: true, error: 'Invalid policy request.'}));

                }
            }

            res.end();

        },

        /**
         * Delete a file from S3.
         */
        'delete': function(req, res, next){
            debug('delete request received');

            var bucket = req.query.bucket,
                key = req.query.key;

            deleteFile(bucket, key, function(err) {
                if (err) {
                    var response = {
                        error: true,
                        message: err.message
                    };
                    res.status(500);
                    res.send(JSON.stringify(response));
                }

                res.status(200);
                res.end();
            });
        },

        /**
         * Respond to Fine Uploader's success request by verifying the file
         * has successfully arrived in our S3 bucket.
         */
        'success': function(req, res, next){
            debug('success request received');
            callS3('head', {
                bucket: req.body.bucket,
                key: req.body.key
            }, function(err, data){
                if (err) {
                    debug(err);
                    res.status(500);
                    res.send(JSON.stringify({error: 'Problem querying S3!'}));
                }
                else if (data.ContentLength > expectedMaxSize) {
                    deleteFile(req.body.bucket, req.body.key, function(err) {
                        var data = {error: 'Too big!'}
                        if (err) {
                            data.error+='. Could not delete invalid file!!';
                        }

                        res.status(400)
                        res.send(JSON.stringify(data));
                    });
                } else {
                    debug('success');
                    res.status(200);
                    res.end();
                }

            });
        }
    };

};

// Signs multipart (chunked) requests.  Omit if you don't want to support chunking.
function sign_headers(headers, client_secret){
    var stringToSign = headers,
        signature = crypto.createHmac('sha1', client_secret)
            .update(stringToSign)
            .digest('base64');

    return {
        signature: signature
    };

}

/**
 * Sign the policy document sent by the client.
 * The signature is the the sha1 HMAC of the client's secret key and the
 * base64 encoded request body.
 *
 * @param body          string  The JSON.stringified policy request's body/payload.
 * @param client_secret string  The client secret key.
 *
 * @return object   The signed policy document which has a policy and signature.
 */
function sign_policy(body, client_secret){
    var base64Policy = new Buffer(JSON.stringify(body)).toString('base64'),
        signature = crypto.createHmac('sha1', client_secret)
            .update(base64Policy)
            .digest('base64');

    return  {
        policy: base64Policy,
        signature: signature
    };

}

/**
 * Ensures the REST request is targeting the correct bucket.
 *  Omit if you don't want to support chunking.
 */
function validate_rest_signature(headerStr, expectedBucket) {
    return new RegExp('\/' + expectedBucket + '\/.+$').exec(headerStr) != null;
}

/**
 * Ensures the policy document associated with a 'simple' (non-chunked) request is
 * targeting the correct bucket and the min/max-size is as expected.
 * Comment out the expectedMaxSize and expectedMinSize variables near
 * the top of this file to disable size validation on the policy document.
 *
 * @param  policy   string  The JSON.stringified policy request's body/payload.
 *
 * @return boolean True or false depending on whether the policy is valid.
 */
function validate_policy(policy) {
    var bucket, parsedMaxSize, parsedMinSize, isValid;

    policy.conditions.forEach(function(condition) {
        if (condition.bucket) {
            bucket = condition.bucket;
        }
        else if (condition instanceof Array && condition[0] === 'content-length-range') {
            parsedMinSize = condition[1];
            parsedMaxSize = condition[2];
        }
    });

    isValid = bucket === expectedBucket;

    // If expectedMinSize and expectedMax size are not null (see above), then
    // ensure that the client and server have agreed upon the exact same
    // values.
    if (expectedMinSize != null && expectedMaxSize != null) {
        isValid = isValid && (parsedMinSize === expectedMinSize.toString())
                          && (parsedMaxSize === expectedMaxSize.toString());
    }

    return isValid;
}

