define(['app', './forum-post-directive.html.js', '../js/common.js', '../js/forum-http-factory.js', ], function(app) {


  app.directive("posts", [function() {

    return {
      restrict: "EAC",
      templateUrl: '/cbd-forums/directives/post-list-directive.html',
      replace: true,
      transclude: false,
      scope: {
        forumId: "=forumId",
        threadId: "=threadId"
      },
      link: function($scope, $element, $attrs) {

      },
      controller: ["$scope", "forumHttp", "underscore", "$q", "$filter", "$timeout", "$location", "$routeParams", "$timeout", "commonJS", "$element", "$rootScope",
        function($scope, $http, _, $q, $filter, $timeout, $location, $routeParams, $timeout, commonJS, $element, $rootScope) {


          if ($routeParams.threadId) {
            $scope.threadId = $routeParams.threadId;
          }

          $scope.openAttachment = function(attachment) {
            // var date = new Date();
            // date.setTime(date.getTime() + (30 * 1000));
            // var expires = "; expires=" + date.toGMTString();

            //document.cookie = "authenticationToken" + "=" + $browser.cookies().authenticationToken + expires + "; path=/";
// console.log(attachment,  document.cookie)
            if(!attachment || $scope.isLoadingDocument == attachment.attachmentId)
              return;
            $scope.isLoadingDocument = attachment.attachmentId;
               //console.log(attachment,  $scope.isLoadingDocument)
            $http.get('/api/v2014/discussions/attachments/' + attachment.attachmentId).then(function(result){

              window.open(result.data.URL, '_blank');

            }).catch(function(e){
              console.log(e);
            }).finally(function(){
              $scope.isLoadingDocument = null;
            });

          }
          $scope.loadPosts = function(threadId){

            var thread = $http.get('/api/v2014/discussions/posts/' + threadId);
            var threadPosts = $http.get('/api/v2014/discussions/threads/' + threadId + '/posts');

            $q.all([thread, threadPosts]).then(function(response) {

                $scope.forumPosts = response[1].data;

                $scope.forumPosts.push(response[0].data);
                $scope.forumPosts = $filter("orderBy")($scope.forumPosts, "['postId']");

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

          }

          $scope.$on("postUpdated", function(evt, data) {
            if (data && data.action == 'new') {
              $scope.forumPosts.push(data.post);
            } else if (data && data.action == 'delete') {
              $timeout(function() {$scope.forumPosts.splice($scope.forumPosts.indexOf(data.post), 1);}, 500)
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

          if($scope.threadId)
            $scope.loadPosts($scope.threadId);

          $scope.$watch('threadId', function(newValue){
            if(newValue)
              $scope.loadPosts($scope.threadId);
          })
        }
      ]
    };
  }]);

});
