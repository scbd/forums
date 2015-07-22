var app = angular.module('cbd-forums', [])
app.factory('forumUtil', ['$rootScope', '$browser', function($rootScope, $browser) {

    return new function() {

        this.safeApply = function(fn) {
            var phase = $rootScope.$root.$$phase;

            if (phase == '$apply' || phase == '$digest') {
                if (fn && (typeof(fn) === 'function')) {
                    fn();
                }
            } else {
                $scope.$apply(fn);
            }
        };

        this.isUserAuthenticated = function() {
            console.log($rootScope.user.isAuthenticated);
            return $rootScope.user && $rootScope.user.isAuthenticated;
        }

        this.loadForum = function(forumId) {
            var forum = $http.get('/api/v2014/discussions/forums/' + forumId);
            return $q.when(forum).then(function(result) {
                return result.data;
            });
        }

    }

}])
app.directive('kmUpload', function($q) {
    return {
        restrict: 'EAC',
        templateUrl: '/cbd-forums/directives/file-upload-directive.html',
        replace: true,
        transclude: false,
        scope: {
            binding: '=ngModel'
        },
        link: function($scope, $element, $attr, ngModelController) {
            // init
            // $scope.cleanModel = $scope.binding;
            $scope.links = [];
            $.extend($scope.editor, {
                link: null,
                url: null,
                name: null,
                progress: null,
                error: null,
                type: null,
                uploadPlaceholder: $element.find("#uploadPlaceholder"),
                mimeTypes: [ //	"application/octet-stream",
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
        controller: ["$scope", "$http", "$filter", function($scope, $http, $filter) {
            $scope.editor = {};

            //==============================
            //
            //==============================
            $scope.remove = function(attachment) {
                if (confirm('Are you sure you want to delete this attachment?')) {
                    attachment.deletedOn = new Date();
                    attachment.deletedBy = 1;
                    ///$scope.$emit("postUpdated", {action:'delete', post:attachment});
                }
            }
            $scope.isDeleted = function(post) {

                return post && !post.deletedOn;
            }

            $scope.openAttachment = function(attachment) {

                if (!attachment)
                    return;

                $http.get('/api/v2014/discussions/attachments/' + attachment.guid || attachment.attachmentId).then(function(result) {
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
            $scope.addFile = function() {
                $scope.editor.startUploadProcess()
            }

            //==============================
            //
            //==============================
            $scope.editor.startUploadProcess = function(onStartCallback) {
                console.log($scope.binding);
                //Clear old <input[file] />;
                $scope.editor.progress = null;
                $scope.editor.uploadPlaceholder.children('input[type=file]').remove();
                $scope.editor.uploadPlaceholder.prepend("<input type='file' style='display:none' />");

                var qHtmlInputFile = $scope.editor.uploadPlaceholder.children("input[type=file]:first");

                qHtmlInputFile.change(function() {
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
                            percent: 0,
                            size: file.size
                        }

                        $http.get('/api/v2014/discussions/attachments/new/' + file.name).then(function(result) {

                            uploadToS3(file, result.data.URL, function() {
                                $scope.safeApply(function() {
                                    if (!$scope.binding || $scope.binding.length == undefined)
                                        $scope.binding = [];

                                    $scope.binding.push({
                                        name: file.name,
                                        guid: result.data.guid,
                                        size: file.size
                                    });
                                });
                            });

                        });
                    });
                });

                qHtmlInputFile.click();
            }

            function createCORSRequest(method, url) {
                var xhr = new XMLHttpRequest();
                if ("withCredentials" in xhr) {
                    xhr.open(method, url, true);
                } else if (typeof XDomainRequest != "undefined") {
                    xhr = new XDomainRequest();
                    xhr.open(method, url);
                } else {
                    xhr = null;
                }
                return xhr;
            }


            /**
             * Use a CORS call to upload the given file to S3. Assumes the url
             * parameter has been signed and is accessable for upload.
             */
            function uploadToS3(file, url, successCallback) {
                setProgress(0, 'Upload started...');
                var xhr = createCORSRequest('PUT', url);
                if (!xhr) {
                    $scope.editor.progress.style = "error";
                    setProgress(100, 'CORS not supported');
                } else {
                    xhr.onload = function() {
                        if (xhr.status == 200) {
                            setProgress(101, 'Upload completed.');
                            if (successCallback && typeof successCallback === "function")
                                successCallback();
                        } else {
                            $scope.editor.progress.style = "error";
                            setProgress(100, 'Upload error: ' + xhr.status);
                        }
                    };

                    xhr.onerror = function() {
                        setProgress(100, 'XHR error.');
                    };

                    xhr.upload.onprogress = function(e) {
                        if (e.lengthComputable) {
                            //  console.log(e);
                            var percentLoaded = Math.round((e.loaded / e.total) * 100);
                            setProgress(percentLoaded, percentLoaded == 100 ? 'Finalizing.' : 'Uploading.');
                        } else
                            console.log(e, "length not computable")
                    };

                    xhr.setRequestHeader('Content-Type', file.type); ///file.type
                    // xhr.setRequestHeader('x-amz-acl', 'public-read');

                    xhr.send(file);
                }
            }

            function setProgress(percent, statusLabel) {
                $scope.safeApply(function() {
                    if (!$scope.editor.progress)
                        return;
                    if (percent <= 100) {
                        $scope.editor.progress.style = 'active'
                    }

                    $scope.editor.progress.position = percent;
                    $scope.editor.progress.percent = percent;
                    //$scope.editor.progress.position = position;
                    console.log(percent, percent == 100, statusLabel);
                    if (percent > 100)
                        $scope.editor.progress.style = 'completed'

                });

            }

            //==============================
            //
            //==============================
            $scope.editor.onUploadError = function(link, message) {
                if ($scope.editor.link != link)
                    return;

                console.log('xhr.upload error: ' + message)

                $scope.editor.error = message;

                if ($scope.editor.progress)
                    $scope.editor.progress.style = "error";
            }

            //====================
            //
            //====================
            $scope.safeApply = function(fn) {
                var phase = this.$root.$$phase;

                if (phase == '$apply' || phase == '$digest') {
                    if (fn && (typeof(fn) === 'function')) {
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
app.directive("forumDetails", [function() {

    return {
        restrict: "EA",
        templateUrl: '/cbd-forums/directives/forum-details-directive.html',
        replace: true,
        transclude: false,
        scope: {
            forumId: "=forumId",
            threadId: "=threadId",
            showDetails: "@showDetails",
            type: "@type",
            forumListUrl: "=forumListUrl",
            showForumProperties: '&'
        },
        link: function($scope, $element, $attrs) {

        },
        controller: ["$scope", "$http", "underscore", "$q", '$element','forumUtil',
            function($scope, $http, _, $q, $element, forumUtil) {

                function loadForum() {

                    $scope.clearMessage();
                    if (forumUtil.isUserAuthenticated() && $scope.showDetails && (!$scope.forum || $scope.forum.forumId != $scope.forumId)) {
                        $scope.isLoading = true;
                        $scope.forumWatch = null;
                        var forum = $http.get('/api/v2014/discussions/forums/' + $scope.forumId);

                        var forumWatchQuery = $http.get('/api/v2014/discussions/forums/' + $scope.forumId + '/watch');

                        $q.all([forum, forumWatchQuery]).then(function(result) {

                            $scope.forum = result[0].data;
                            //if user is not watching forum check if watching thread.
                            if (result[1].data.watching || $scope.type == 'forum') {
                                if ($scope.type != 'thread')
                                    $scope.forumWatch = result[1].data;
                            } else {
                                if ($scope.threadId)
                                    var threadWatchQuery = $http.get('/api/v2014/discussions/threads/' + $scope.threadId + '/watch');
                                    $q.when(threadWatchQuery).then(function(result) {
                                        $scope.threadWatch = result.data;
                                    });
                            }

                        }).catch(function(e) {
                            showError(e);
                        }).finally(function() {
                            $scope.isLoading = null;
                        });
                    }

                }


                $scope.$watch('forumId', function(newValue, oldValue) {
                    if (newValue)
                        loadForum();
                })

                // $scope.$on("showSuccessMessage", function(evt, data) {
                //   // if (data && data.action == 'new') {
                //   //   $scope.forumPosts.push(data.post);
                //   // }
                //   $element.find('#msg').show('slow');
                //
                // });
                //
                // $scope.$on("showErrorMessage", function(evt, data) {
                //   console.log(data);
                //   // if (data && data.action == 'new') {
                //   //   $scope.threads.push(data.post);
                //   // }
                //   $scope.success = true;
                //   $element.find('#msg').show('slow');
                // });

                $scope.startWatching = function() {
                    var watchDetails;
                    $scope.clearMessage();
                    if ($scope.forumWatch && !$scope.forumWatch.watching)
                        watchDetails = $http.post('/api/v2014/discussions/forums/' + $scope.forumId + '/watch');
                    else if ($scope.threadWatch && !$scope.threadWatch.watching)
                        watchDetails = $http.post('/api/v2014/discussions/threads/' + $scope.threadId + '/watch');
                    $scope.isLoading = true;
                    if (watchDetails) {
                        $q.when(watchDetails).then(function(result) {
                            $scope.forumWatch = null;
                            $scope.threadWatch = null;
                            if ($scope.type == 'forum')
                                $scope.forumWatch = result.data
                            else
                                $scope.threadWatch = result.data;

                        }).catch(function(e) {
                            showError(e);
                        }).finally(function() {
                            $scope.isLoading = null;
                        });
                    }
                }

                $scope.stopWatching = function() {
                    var watchDetails;
                    $scope.isLoading = true;
                    $scope.clearMessage();
                    if ($scope.forumWatch && $scope.forumWatch.watching)
                        watchDetails = $http.delete('/api/v2014/discussions/forums/' + $scope.forumId + '/watch');
                    else if ($scope.threadWatch && $scope.threadWatch.watching)
                        watchDetails = $http.delete('/api/v2014/discussions/threads/' + $scope.threadId + '/watch');

                    if (watchDetails) {
                        $q.when(watchDetails).then(function(result) {
                            $scope.forumWatch = null;
                            $scope.threadWatch = null;
                            if ($scope.type == 'forum')
                                $scope.forumWatch = result.data
                            else
                                $scope.threadWatch = result.data;

                        }).catch(function(e) {
                            showError(e);
                        }).finally(function() {
                            $scope.isLoading = null;
                        });
                    }
                }

                function showError(error) {
                    if (error.status == 403 || error.status == 401 || error.status == 400 || error.data.message || error.data.Message)
                        $scope.error = (error.data.code ? (error.data.code + ': ') : '') + (error.data.message || error.data.Message);
                    else
                        $scope.error = "There was a error, please try again.";
                    $element.find('#msg').show('slow');
                }

                $scope.clearMessage = function() {
                    $scope.error = null;
                    $scope.success = null;
                }

                $scope.showProperties = function() {
                    if ($scope.showForumProperties && typeof $scope.showForumProperties === 'function') {
                        return $scope.showForumProperties();
                    }
                    return false;
                }
            }
        ]
    }

}])
app.directive("forumPost", [function() {

    return {
        restrict: "EA",
        templateUrl: '/cbd-forums/directives/forum-post-directive.html',
        replace: true,
        transclude: false,
        scope: {
            title: "@title",
            post: "=post",
            threadId: "=threadId",
            postId: "=postId",
            forumId: "=forumId",
            forum: "=forum",
            type: "@"
        },
        link: function($scope, $element, $attrs) {

        },
        controller: ["$scope", "$http", "$window", "$filter", "underscore", "$q", '$element', '$location', "$timeout", "$element", "$browser", '$rootScope',
            function($scope, $http, $window, $filter, _, $q, $element, $location, $timeout, $element, $browser, $rootScope) {


                $scope.unsafePost = {};
                $scope.editPost = function() {}
                var modalEdit = $element.find("#editForm");
                var modalApprove = $element.find("#approveDialog");

                $scope.newThread = function() {
                    $scope.unsafePost = {};
                    $scope.errorMsg = '';
                    $scope.operation = 'new'

                    modalEdit.modal("show");
                }

                function createThread() {


                    $scope.unsafePost.forumId = $scope.forumId;

                    $scope.loading = true;
                    $http.post('/api/v2014/discussions/forums/' + $scope.forumId + '/threads', $scope.unsafePost)
                        .then(function(data) {

                            $rootScope.$broadcast("threadCreated", {
                                action: 'new',
                                post: data.data
                            });

                            modalEdit.modal("hide");
                            $scope.unsafePost = {};

                        }).catch(function(error) {
                            showError(error, 'create');
                        }).finally(function() {
                            $scope.loading = false;
                        });

                }

                $scope.newPost = function() {
                    $scope.unsafePost = {};
                    $scope.errorMsg = '';
                    $scope.operation = 'new'
                    $scope.unsafePost.subject = $scope.post.subject;

                    modalEdit.modal("show");
                }

                $scope.createPost = function() {

                    if ($scope.type.toLowerCase() == 'thread') {
                        createThread();
                    } else {
                        $scope.errorMsg = '';
                        if ($scope.unsafePost.subject == '')
                            return;

                        if ($scope.unsafePost.message == '')
                            return;

                        $scope.unsafePost.parentID = $scope.postId;
                        $scope.unsafePost.threadID = $scope.threadId;

                        $scope.loading = true;
                        $http.post('/api/v2014/discussions/threads/' + $scope.postId + '/posts', $scope.unsafePost)
                            .then(function(data) {

                                $rootScope.$broadcast("postUpdated", {
                                    action: 'new',
                                    post: data.data
                                });
                                //$scope.post = data.data;
                                modalEdit.modal("hide");

                            }).catch(function(error) {

                                showError(error, 'create');
                                console.log(error);
                            }).finally(function() {
                                $scope.loading = false;
                            });
                    }
                }

                $scope.editPost = function() {
                    $scope.errorMsg = '';
                    $scope.operation = 'edit'
                    $scope.unsafePost = _.clone($scope.post);
                    $scope.unsafePost.message = $scope.post.message.replace(/<br\s*\/?>/mg, "\n");

                    modalEdit.modal("show");
                }
                $scope.updatePost = function() {
                    $scope.errorMsg = '';

                    if ($scope.unsafePost.subject == '')
                        return;

                    if ($scope.unsafePost.message == '')
                        return;

                    $scope.loading = true;
                    $http.put('/api/v2014/discussions/posts/' + $scope.postId, $scope.unsafePost)
                        .then(function(data) {

                            $timeout(function() {
                                modalEdit.modal("hide");
                            }, 1);
                            $rootScope.$broadcast("postUpdated", {
                                action: 'edit',
                                post: data.data
                            });
                            $scope.post = data.data;

                        }).catch(function(error) {
                            showError(error, 'update');
                            console.log(error);
                        }).finally(function() {
                            $scope.loading = false;
                        });

                }
                $scope.askApprove = function() {
                    $scope.errorMsg = '';
                    modalApprove.modal("show");
                }

                $scope.approvePost = function() {

                    $scope.loading = true;
                    $scope.errorMsg = '';
                    $http.put('/api/v2014/discussions/posts/' + $scope.postId + '/actions/approval')
                        .then(function(data) {

                            $rootScope.$broadcast("postUpdated", {
                                action: 'edit',
                                post: data.data
                            });
                            $scope.post = data.data;
                            modalApprove.modal("hide");

                        }).catch(function(error) {
                            showError(error, 'approve');
                            console.log(error);
                        }).finally(function() {
                            $scope.loading = false;
                        })
                }

                $scope.deletePost = function() {

                    $scope.loading = true;
                    $scope.errorMsg = '';
                    $http.delete('/api/v2014/discussions/posts/' + $scope.postId)
                        .then(function(data) {

                            $rootScope.$broadcast("postUpdated", {
                                action: 'delete',
                                post: $scope.post
                            });

                            modalApprove.modal("hide");

                        }).catch(function(error) {
                            showError(error, 'delete');
                            console.log(error);
                        }).finally(function() {
                            $scope.loading = false;
                        })
                }

                function showError(error, type) {
                    if (error.status == 403 || error.status == 401 || error.status == 400 || error.data){
                        if((error.data.message || error.data.Message))
                            $scope.errorMsg = 'Cannot ' + type + ', ' + (error.data.code ? (error.data.code + ': ') : '') + (error.data.message || error.data.Message);
                        else{
                            var errorMessage='';
                            angular.forEach(error.data, function(error){
                                errorMessage += ',' + error.message;
                            });
                            $scope.errorMsg = errorMessage;
                        }
                    }
                    else
                        $scope.errorMsg = "There was a error, please try again.";
                }

                // $scope.isDeleted = function(post) {
                //
                //   return post && !post.deletedOn;
                // }

                $scope.scrollToPost = function(postId) {
                    // if($location.$$hash)
                    //   $location.$$hash = postId
                    var postTop = $('#post_' + postId).offset().top - 50;
                    $("body, html").animate({
                        scrollTop: postTop
                    }, "slow");
                }

                $scope.$on("scrollPost", function(evt, data) {
                    console.log('eben', data);
                    if (data.postId)
                        $scope.scrollToPost(data.postId);
                });
            }
        ]
    };
}])
app.directive("posts", [function() {

    return {
        restrict: "EAC",
        templateUrl: '/cbd-forums/directives/post-list-directive.html',
        replace: true,
        transclude: false,
        scope: {
            forumId: "=forumId",
            threadId: "=threadId",
            hideThread: "@",
            hideSubject: "@",
            onPostsLoad: "&"
        },
        link: function($scope, $element, $attrs) {

        },
        controller: ["$scope", "$http", "underscore", "$q", "$filter", "$timeout", "$location", "$routeParams", "$timeout", "forumUtil", "$element", "$rootScope",
            function($scope, $http, _, $q, $filter, $timeout, $location, $routeParams, $timeout, forumUtil, $element, $rootScope) {


                if ($routeParams.threadId) {
                    $scope.threadId = $routeParams.threadId;
                }

                $scope.openAttachment = function(attachment) {
                    // var date = new Date();
                    // date.setTime(date.getTime() + (30 * 1000));
                    // var expires = "; expires=" + date.toGMTString();

                    //document.cookie = "authenticationToken" + "=" + $browser.cookies().authenticationToken + expires + "; path=/";
                    // console.log(attachment,  document.cookie)
                    if (!attachment || $scope.isLoadingDocument == attachment.attachmentId)
                        return;
                    $scope.isLoadingDocument = attachment.attachmentId;
                    //console.log(attachment,  $scope.isLoadingDocument)
                    $http.get('/api/v2014/discussions/attachments/' + attachment.attachmentId).then(function(result) {

                        window.open(result.data.URL, '_blank');

                    }).catch(function(e) {
                        console.log(e);
                    }).finally(function() {
                        $scope.isLoadingDocument = null;
                    });

                }
                $scope.loadPosts = function(threadId) {
                    if(!forumUtil.isUserAuthenticated())
                        return;
                    var thread = $http.get('/api/v2014/discussions/posts/' + threadId);
                    var threadPosts = $http.get('/api/v2014/discussions/threads/' + threadId + '/posts');

                    $q.all([thread, threadPosts]).then(function(response) {

                            $scope.forumPosts = response[1].data;
                            if ($scope.hideThread == undefined || $scope.hideThread == 'false') {
                                $scope.forumPosts.push(response[0].data);
                            }
                            $scope.forumPosts = $filter("orderBy")($scope.forumPosts, "['postId']");
                            $scope.onPostsLoad({
                                posts: $scope.forumPosts
                            });
                            if ($location.$$hash) {
                                $timeout(function() {
                                    var postTop = $('#post_' + $location.$$hash).offset().top - 50;
                                    $("body, html").animate({
                                        scrollTop: postTop
                                    }, "slow");
                                }, 300);
                            }
                        })
                        .catch(function(error) {
                            if (error.status == 403 || error.status == 401 || error.status == 400 || error.data.message || error.data.Message)
                                $scope.error = (error.data.code ? (error.data.code + ': ') : '') + (error.data.message || error.data.Message);
                            else
                                $scope.error = "There was a error, please try again."
                            $element.find('#msg').show('slow');
                        });

                };

                $scope.$on("postUpdated", function(evt, data) {
                    if (data && data.action == 'new') {
                        $scope.forumPosts.push(data.post);
                    } else if (data && data.action == 'delete') {
                        $timeout(function() {
                            $scope.forumPosts.splice($scope.forumPosts.indexOf(data.post), 1);
                        }, 500)
                    }
                    $scope.success = true;
                    $element.find('#msg').show('slow');

                });

                $scope.isDeleted = function(post) {

                    return post && !post.deletedOn;
                }

                $scope.closeMessage = function() {
                    $element.find('#msg').hide('slow');
                    $scope.error = '';
                    $scope.success = null;
                }

                if ($scope.threadId)
                    $scope.loadPosts($scope.threadId);

                $scope.$watch('threadId', function(newValue) {
                    if (newValue)
                        $scope.loadPosts($scope.threadId);
                })

                function loadForum() {
                     if(!forumUtil.isUserAuthenticated())
                        return;
                    if ($scope.forumId) {
                        var forum = $http.get('/api/v2014/discussions/forums/' + $scope.forumId);
                        $q.when(forum).then(function(result) {
                            console.log(result);
                            $scope.forum = result.data;
                        });
                    }
                }

                loadForum();

                $scope.$on("sortPosts", function(evt, data) {
                    $scope.forumPosts = $filter("orderBy")($scope.forumPosts, data.field, data.reverse);
                });

            }
        ]
    };
}])
app.directive("forumThreads", [function() {

    return {
        restrict: "EAC",
        templateUrl: '/cbd-forums/directives/thread-list-directive.html',
        replace: true,
        transclude: false,
        scope: {
            forumId: "=forumId",
            postUrl: "=postUrl"
        },
        link: function($scope, $element, $attrs) {

        },
        controller: ["$scope", "$http", "$q", '$element', '$location', "$element",'forumUtil',
            function($scope, $http, $q, $element, $location, $element, forumUtil) {

                var modalDelete = $element.find("#deleteDialog");
//                   if ($location.search().forumid) {
//                       $scope.forumId = $location.search().forumid;
//                       $scope.threadId = $location.search().threadid;
//                   }

                if (!$scope.forumId) {
                    $scope.error = "Forum id not specified.";
                    return;
                }
//                if ($scope.forumId && $scope.threadId) {
//                    $location.path($scope.postUrl + '/' + $scope.threadId);
//                    return;
//                }

                 if(forumUtil.isUserAuthenticated()){
                    var forumThreads = $http.get('/api/v2014/discussions/forums/' + $scope.forumId + '/threads');

                    $q.when(forumThreads).then(function(response) {

                        $scope.threads = response.data;

                    }).catch(function(error) {
                        handleError(error, 'list');
                    });
                 }

                $scope.$on("threadCreated", function(evt, data) {
                    console.log(data);
                    if (data && data.action == 'new') {
                        $scope.threads.push(data.post);
                    }
                    $scope.success = 'created';
                    $element.find('#msg').show('slow');
                });


                $scope.clearMessage = function() {
                    $element.find('#msg').hide('slow');
                    $scope.success = null;
                    $scope.error = null;
                }
                $scope.askDelete = function(thread) {
                    $scope.threadtodelete = thread;
                    modalDelete.modal("show");
                }
                $scope.deleteThread = function() {

                    $scope.loading = true;
                    $scope.errorMsg = '';
                    $http.delete('/api/v2014/discussions/threads/' + $scope.threadtodelete.threadId)
                        .then(function(data) {
                            $scope.success = 'deleted';
                            $element.find('#msg').show('slow');

                            $scope.threads.splice($scope.threads.indexOf($scope.threadtodelete), 1);
                            modalDelete.modal("hide");
                            $scope.threadtodelete = null;


                        }).catch(function(error) {
                            handleError(error, 'delete');
                            console.log(error);
                        }).finally(function() {
                            $scope.loading = false;
                        })
                }

                function handleError(error, type) {
                    if (error.status == 403 || error.status == 401 || error.status == 400 || error.data.message || error.data.Message)
                        $scope.error = 'Cannot ' + type + ', ' + (error.data.code ? (error.data.code + ': ') : '') + (error.data.message || error.data.Message);
                    else
                        $scope.error = "There was a error, please try again.";
                    $element.find('#msg').show('slow');
                }
            }
        ]
    };
}]);
