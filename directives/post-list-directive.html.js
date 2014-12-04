define(['app', './forum-post-directive.html.js', '../js/common.js', '../js/forum-http-factory.js', ], function(app) {


  app.directive("posts", [function() {

    return {
      restrict: "EAC",
      templateUrl: '/directives/post-list-directive.html',
      replace: true,
      transclude: false,
      scope: {
        forumId: "=forumId"
      },
      link: function($scope, $element, $attrs) {

      },
      controller: ["$scope", "forumHttp", "underscore", "$q", "$filter", "$timeout", "$location", "$routeParams", "$timeout", "commonJS", "$element",
        function($scope, $http, _, $q, $filter, $timeout, $location, $routeParams, $timeout, commonJS, $element) {

          if ($routeParams.forumPost) {

            $scope.threadId = $routeParams.forumPost;
            var thread = $http.get('/api/v2014/discussions/posts/' + $routeParams.forumPost);
            var threadPosts = $http.get('/api/v2014/discussions/threads/' + $routeParams.forumPost + '/posts');

            $q.all([thread, threadPosts]).then(function(response) {

              $scope.forumPosts = response[1].data; //$filter("orderBy")(response.data, "['ThreadID','ParentID','ForumPostID']");

              $scope.forumPosts.push(response[0].data);
              $scope.forumPosts = $filter("orderBy")($scope.forumPosts, "['forumPostID']");

              if ($location.$$hash) {
                $timeout(function() {
                  var postTop = $element.find('#post_' + $location.$$hash).offset().top - 50;
                  $("body, html").animate({
                    scrollTop: postTop
                  }, "slow");
                }, 300);
              }

              console.log($scope.forumPosts);

            })
            .catch(function(error){
              if (error.status == 403 || error.status == 401 || error.status == 400 || error.data.message || error.data.Message)
                $scope.error = (error.data.code ? (error.data.code + ': ') : '') + (error.data.message || error.data.Message);
              else
                $scope.error = "There was a error, please try again."
            });

          }

          $scope.$on("postUpdated", function(evt, data) {
            if (data && data.action == 'new') {
              $scope.forumPosts.push(data.post);
            }
            else if (data && data.action == 'delete') {
              $timeout(function(){
                $scope.forumPosts.splice($scope.forumPosts.indexOf(data.post),1);
              },500)
            }
            $scope.success = true;
            $element.find('#msg').show('slow');

          });

          $scope.isDeleted = function(post) {

            return post && !post.deletedOn;
          }

          $scope.closeMessage = function(){
            $element.find('#msg').hide('slow');
            $scope.error = '';
            $scope.success = null;
          }

        }
      ]
    };
  }]);

});
