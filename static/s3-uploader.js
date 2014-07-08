$(document).ready(function(){
    $('#fineuploader-s3').fineUploaderS3({
        debug: true,
        request: {
            //endpoint: "http://fineuploadertest.s3.amazonaws.com",
            endpoint: '',
            accessKey: ''
        },
        signature: {
            endpoint: '/sign'
        },
        uploadSuccess: {
            endpoint: '/success'
        },
        iframeSupport: {
            localBlankPagePath: 'success.html'
        },
        chunking: {
            enabled: true,
            concurrent: {
                enabled: true
            }
        },
        resume: {
            enabled: true
        },
        retry: {
            enableAuto: true,
            showButton: true
        },
        deleteFile: {
            enabled: true,
            endpoint: '/upload',
            forceConfirm: true,
        },
        failedUploadTextDisplay: {
            mode: 'custom'
        },
        display: {
            fileSizeOnSubmit: true
        },
        paste: {
            targetElement: $(document)
        },
        thumbnails: {
            placeholders: {
                waitingPath: "/fineuploader/placeholders/waiting-generic.png",
                notAvailablePath: "/fineuploader/placeholders/not_available-generic.png"
            }
        }
    });

});
