define(['app','../js/forum-http-factory.js',], function (app) {

app.directive('kmUpload', function ( $q)
{
  return {
    restrict: 'EAC',
    templateUrl: '/cbd-forums/directives/file-upload-directive.html',
    replace: true,
    transclude: false,
    scope: {
      binding    : '=ngModel'
    },
    link: function ($scope, $element, $attr, ngModelController)
    {
      // init
      // $scope.cleanModel = $scope.binding;
      $scope.links = [];
      $.extend($scope.editor, {
        link     : null,
        url      : null,
        name     : null,
        progress : null,
        error    : null,
        type     : null,
        uploadPlaceholder : $element.find("#uploadPlaceholder"),
        mimeTypes : [//	"application/octet-stream",
                "application/json",
                "application/ogg",
                "application/pdf",
                "application/xml",
                "application/zip",
                "audio/mpeg",
                "audio/x-ms-wma",
                "audio/x-wav",
                "image/gif",
                "image/jpeg",
                "image/png",
                "image/tiff",
                "text/csv",
                "text/html",
                "text/plain",
                "text/xml",
                "video/mpeg",
                "video/mp4",
                "video/quicktime",
                "video/x-ms-wmv",
                "video/x-msvideo",
                "video/x-flv",
                "application/vnd.oasis.opendocument.text",
                "application/vnd.oasis.opendocument.spreadsheet",
                "application/vnd.oasis.opendocument.presentation",
                "application/vnd.oasis.opendocument.graphics",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ]
      });

      if ($attr.mimeTypes)
        $scope.editor.mimeTypes = $attr.mimeTypes.split(";");

    },
    controller: ["$scope", "forumHttp", "$filter", "$http", function ($scope, $http, $filter, $angularHttp)
    {
      $scope.editor = {};

      //==============================
      //
      //==============================
      $scope.remove = function(attachment)
      {
        if(confirm('Are you sure you want to delete this attachment?')){
          attachment.deletedOn = new Date();
          attachment.deletedBy = 1;
          ///$scope.$emit("postUpdated", {action:'delete', post:attachment});
        }
      }
      $scope.isDeleted = function(post){

        return post && !post.deletedOn;
      }

      $scope.openAttachment = function(attachment){

        if(!attachment)
          return;

        $http.get('/api/v2014/discussions/attachments/' + attachment.guid||attachment.attachmentId).then(function(result){
          console.log(result);
          // var anchor = $('<a/>');
          // anchor.href = result.data.URL;
          // anchor.click();
          // anchor.trigger('click')
          window.open(result.data.URL, '_blank');
        });

      }

      //==============================
      //
      //==============================
      $scope.addFile = function()
      {
        $scope.editor.startUploadProcess()
      }

      //==============================
      //
      //==============================
      $scope.editor.startUploadProcess = function(onStartCallback)
      {
        console.log($scope.binding);
        //Clear old <input[file] />;
        $scope.editor.progress = null;
        $scope.editor.uploadPlaceholder.children('input[type=file]').remove();
        $scope.editor.uploadPlaceholder.prepend("<input type='file' style='display:none' />");

        var qHtmlInputFile = $scope.editor.uploadPlaceholder.children("input[type=file]:first");

        qHtmlInputFile.change(function()
        {
          var file = this.files[0];
          var type = file.type;
          var link = {
            url: null,
            name: file.name
          };

          $scope.safeApply(function() {
            if (onStartCallback)
              onStartCallback();

            if (file.name != "")
              $scope.editor.name = file.name;

            if ($scope.editor.mimeTypes.indexOf(type) < 0) {
              $scope.editor.onUploadError(link, "File type not supported: " + type);
              return;
            };

            $scope.editor.progress = {
              style: "active",
              position: 0,
              percent:0,
              size: file.size
            }

            $http.get('/api/v2014/discussions/attachments/new/' + file.name).then(function(result){

                uploadToS3(file, result.data.URL, function(){
                    $scope.safeApply(function(){
                        if(!$scope.binding || $scope.binding.length==undefined)
                          $scope.binding = [];

                        $scope.binding.push({ name : file.name, guid : result.data.guid, size : file.size});
                    });
                });

            });
          });
        });

        qHtmlInputFile.click();
      }

      function createCORSRequest(method, url)
      {
        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr)
        {
          xhr.open(method, url, true);
        }
        else if (typeof XDomainRequest != "undefined")
        {
          xhr = new XDomainRequest();
          xhr.open(method, url);
        }
        else
        {
          xhr = null;
        }
        return xhr;
      }


      /**
       * Use a CORS call to upload the given file to S3. Assumes the url
       * parameter has been signed and is accessable for upload.
       */
      function uploadToS3(file, url,  successCallback)
      {
        setProgress(0, 'Upload started...');
        var xhr = createCORSRequest('PUT', url);
        if (!xhr)
        {
          $scope.editor.progress.style   = "error";
          setProgress(100, 'CORS not supported');
        }
        else
        {
          xhr.onload = function()
          {
            if(xhr.status == 200)
            {
              setProgress(101, 'Upload completed.');
              if(successCallback && typeof successCallback === "function")
                    successCallback();
            }
            else
            {
              $scope.editor.progress.style   = "error";
              setProgress(100, 'Upload error: ' + xhr.status);
            }
          };

          xhr.onerror = function()
          {
            setProgress(100, 'XHR error.');
          };

          xhr.upload.onprogress = function(e)
          {
            if (e.lengthComputable)
            {
            //  console.log(e);
              var percentLoaded = Math.round((e.loaded / e.total) * 100);
              setProgress(percentLoaded, percentLoaded == 100 ? 'Finalizing.' : 'Uploading.');
            }
            else
              console.log(e, "length not computable")
          };

           xhr.setRequestHeader('Content-Type', file.type);///file.type
          // xhr.setRequestHeader('x-amz-acl', 'public-read');

          xhr.send(file);
        }
      }

      function setProgress(percent, statusLabel)
      {
        $scope.safeApply(function(){
        if(!$scope.editor.progress)
          return;
        if(percent<=100){
          $scope.editor.progress.style='active'
        }

        $scope.editor.progress.position  = percent;
        $scope.editor.progress.percent  = percent;
        //$scope.editor.progress.position = position;
        console.log(percent,percent==100,  statusLabel);
         if(percent>100)
           $scope.editor.progress.style='completed'

      });

      }

      //==============================
      //
      //==============================
      $scope.editor.onUploadError = function(link, message)
      {
        if($scope.editor.link!=link)
          return;

        console.log('xhr.upload error: ' + message)

        $scope.editor.error = message;

        if($scope.editor.progress)
          $scope.editor.progress.style   = "error";
      }

      //====================
      //
      //====================
      $scope.safeApply = function(fn)
      {
        var phase = this.$root.$$phase;

        if (phase == '$apply' || phase == '$digest') {
          if (fn && (typeof (fn) === 'function')) {
            fn();
          }
        } else {
          this.$apply(fn);
        }
      };

      //====================
      //
      //====================
      function clone(obj) {
        if (obj === undefined) return undefined;
        if (obj === null) return null;

        return _.clone(obj);
      }

    }]
  }
})

});


// $angularHttp.put(result.data.URL, file, {headers : {"Content-Type" : "image/jpeg"}}).then(
//   function(result) { //success
//     console.log(result)
//     if(!$scope.binding || $scope.binding.length==undefined)
//       $scope.binding = [];
//
//     $scope.binding.push({guid: result.data.guid, name : file.name})
//     $scope.editor.progress = null;
//   },
//   function(result) { //error
//     link.url = result.data.url;
//     $scope.editor.onUploadError(link, result.data);
//   },
//   function(progress) { //progress
//     $scope.editor.onUploadProgress(link, progress);
//   });
