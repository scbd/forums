define(['app', 'underscore', '../cbd-forumns.js'], function(app, _) {

    return ["$scope", "$location", "$route", "$routeParams", function($scope, $location, $route, $routeParams) {

        if (!$route.current.$$route.forumListUrl) {
            throw 'Forum list URL not specified in route, please forumListUrl attribute in routes'
        } else
            $scope.forumListUrl = $route.current.$$route.forumListUrl;


        if ($location.search().forumid) {
            $scope.forumId = $location.search().forumid;
        } else {
            $scope.forumId = $route.current.$$route.forumId
        }
        $scope.threadId = $routeParams.threadId;

    }];
});
