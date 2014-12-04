define(['app', '../directives/forum-post-directive.html.js',
  '../directives/forum-details-directive.html.js','../directives/thread-list-directive.html.js'
], function(app, _) {
  app.controller("forumController", ["$scope", "forumHttp", "$q", "$filter", "$timeout", "$location",
    function($scope, $http, $q, $filter, $timeout, $location) {

      //$scope.forumId = 17384;

    if ($location.search().forumid) {
      $scope.forumId = $location.search().forumid;
    }
    }
  ]);
});
