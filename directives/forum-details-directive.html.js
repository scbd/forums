define(['app', '../js/forum-http-factory.js','./forum-post-directive.html.js',], function (app) {

app.directive("forumDetails", [ function () {

  return {
    restrict   : "EA",
    templateUrl: '/cbd-forums/directives/forum-details-directive.html',
    replace    : true,
    transclude : false,
    scope   : {
      forumId     : "=forumId",
      threadId    : "=threadId",
      showDetails : "@showDetails",
      type        : "@type",
      forumListUrl: "=forumListUrl"
    },
    link : function($scope, $element, $attrs) {

    },
    controller: ["$scope", "forumHttp", "underscore", "$q", '$element',
  function($scope, $http, _, $q, $element) {

    function loadForum() {

      $scope.clearMessage();
      if ($scope.showDetails && (!$scope.forum || $scope.forum.forumId != $scope.forumId)) {
        $scope.isLoading = true;
        $scope.forumWatch = null;
        var forum = $http.get('/api/v2014/discussions/forums/' + $scope.forumId);

        var forumWatchQuery = $http.get('/api/v2014/discussions/forums/' + $scope.forumId + '/watch');
        var threadWatchQuery = $http.get('/api/v2014/discussions/threads/' + $scope.threadId + '/watch');

        $q.all([forum, forumWatchQuery]).then(function(result) {

          $scope.forum = result[0].data;
          console.log(result[1]);
          //if user is not watching forum check if watching thread.
          if (result[1].data.watch || $scope.type == 'forum') {
            if ($scope.type != 'thread')
              $scope.forumWatch = result[1].data
          } else {
            console.log('thread query')
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
      console.log(newValue, oldValue);
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
      if ($scope.forumWatch && !$scope.forumWatch.watch)
        watchDetails = $http.post('/api/v2014/discussions/forums/' + $scope.forumId + '/watch');
      else if ($scope.threadWatch && !$scope.threadWatch.watch)
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
          $scope.isLoading  = null;
        });
      }
    }

    $scope.stopWatching = function() {
      var watchDetails;
      $scope.isLoading = true;
      $scope.clearMessage();
      if ($scope.forumWatch && $scope.forumWatch.watch)
        watchDetails = $http.delete('/api/v2014/discussions/forums/' + $scope.forumId + '/watch');
      else if ($scope.threadWatch && $scope.threadWatch.watch)
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

  }
]
}

}]);

});
