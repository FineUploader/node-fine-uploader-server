$(document).ready(function(){
    'use strict';

    $('#fineuploader-traditional').fineUploader({
        debug: true,
        chunking: {
            //concurrent: { enabled: true },
            //success: {
            //    endpoint: '/success'
            //},
            enabled: true
        },
        deleteFile: {
            endpoint: '/upload',
            enabled: true
        },
        request: {
            endpoint: '/upload'
        }
    });

});
