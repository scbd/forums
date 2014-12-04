define(['app', '../js/forum-http-factory.js',
  './file-upload-directive.html.js'
], function(app, commonjs) {


  app.directive("forumPost", [function() {

    return {
      restrict: "EA",
      templateUrl: '/app/views/forums/directives/forum-post-directive.html',
      replace: true,
      transclude: false,
      scope: {
        title: "@title",
        post: "=post",
        threadId: "=threadId",
        postId: "=postId",
        forumId: "=forumId",
        type: "@"
      },
      link: function($scope, $element, $attrs) {

      },
      controller: ["$scope", "forumHttp", "$window", "$filter", "underscore", "$q", '$element', '$location', "$timeout", "$element", "$browser", '$rootScope',
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

          $scope.openAttachment = function(attachment) {
            var date = new Date();
            date.setTime(date.getTime() + (30 * 1000));
            var expires = "; expires=" + date.toGMTString();

            document.cookie = "File-AUTH" + "=" + $browser.cookies().authenticationToken + expires + "; path=/";

            // if(!attachment || $scope.isLoadingDocument == attachment.forumAttachmentID)
            //   return;
            // $scope.isLoadingDocument = attachment.forumAttachmentID;
            // $http.get('/api/v2014/discussions/attachments/' + attachment.forumAttachmentID).then(function(result){
            //
            //   window.open(result.data.URL, '_blank');
            //
            // }).catch(function(e){
            //   console.log(e);
            // }).finally(function(){
            //   $scope.isLoadingDocument = null;
            // });

          }

          function createThread() {


            $scope.unsafePost.forumId = $scope.forumId;

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
              })

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

              $http.post('/api/v2014/discussions/threads/' + $scope.postId + '/posts', $scope.unsafePost)
                .then(function(data) {

                  $rootScope.$broadcast("postUpdated", {
                    action: 'new',
                    post: data.data
                  });
                  $scope.post = data.data;
                  modalEdit.modal("hide");

                }).catch(function(error) {

                  showError(error, 'create');
                  console.log(error);
                })
            }
          }

          $scope.editPost = function() {
            $scope.errorMsg = '';
            $scope.operation = 'edit'
            $scope.unsafePost = _.clone($scope.post);
            $scope.unsafePost.message.en = $scope.post.message.en.replace(/<br\s*\/?>/mg, "\n");

            modalEdit.modal("show");
          }
          $scope.updatePost = function() {
            $scope.errorMsg = '';

            if ($scope.unsafePost.subject == '')
              return;

            if ($scope.unsafePost.message == '')
              return;


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
              })

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
            if (error.status == 403 || error.status == 401 || error.status == 400 || error.data.message || error.data.Message)
              $scope.errorMsg = 'Cannot ' + type + ', ' + (error.data.code ? (error.data.code + ': ') : '') + (error.data.message || error.data.Message);
            else
              $scope.errorMsg = "There was a error, please try again.";
          }

          $scope.isDeleted = function(post) {

            return post && !post.deletedOn;
          }

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
  }]);

});
