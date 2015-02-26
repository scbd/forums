define(['app', '../directives/forum-post-directive.html.js',
  '../directives/forum-details-directive.html.js','../directives/thread-list-directive.html.js'
], function(app, _) {
  app.controller("forumController", ["$scope", "$http", "$q", "$filter", "$timeout", "$location","$route",
    function($scope, $http, $q, $filter, $timeout, $location,  $route) {

      //$scope.forumId = 17384;

      if(!$route.current.$$route.postUrl){
        throw 'Post URL not specified in route, please postUrl attribute in routes'
      }
      else
        $scope.postUrl = $route.current.$$route.postUrl;


      if ($location.search().forumid) {
        $scope.forumId = $location.search().forumid;
      }
      else{
        $scope.forumId = $route.current.$$route.forumId
      }

      if(!$scope.forumId)
        $scope.forumId = 17384;
      console.log($route.current.$$route)
    }
  ]);
});
