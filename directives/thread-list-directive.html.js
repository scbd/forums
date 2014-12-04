define(['app', '../js/forum-http-factory.js'], function(app) {


  app.directive("forumThreads", [function() {

    return {
      restrict: "EAC",
      templateUrl: '/directives/thread-list-directive.html',
      replace: true,
      transclude: false,
      scope: {
        forumId: "@forumId"
      },
      link: function($scope, $element, $attrs) {

      },
      controller: ["$scope", "forumHttp", "$q", '$element', '$location', "$element",
        function($scope, $http, $q, $element, $location, $element) {

          var modalDelete = $element.find("#deleteDialog");
          if ($location.search().forumid) {
            $scope.forumId = $location.search().forumid;
            $scope.threadId = $location.search().threadid;
          }

          if (!$scope.forumId) {
            $scope.error = "Forum id not specified.";
            return;
          }
          if ($scope.forumId && $scope.threadId)
            $location.path('/forums/iac/' + $scope.threadId)

          var forumThreads = $http.get('/api/v2014/discussions/forums/' + $scope.forumId + '/threads');

          $q.when(forumThreads).then(function(response) {

            $scope.threads = response.data;

          }).catch(function(error) {

            if (error.status == 403 || error.status == 401 || error.status == 400 || error.data.message || error.data.Message)
              $scope.error = (error.data.code ? (error.data.code + ': ') : '') + (error.data.message || error.data.Message);
            else
              $scope.error = "There was a error, please try again.";

            $element.find('#msg').show('slow');
          });

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
            $http.delete('/api/v2014/discussions/threads/' + $scope.threadtodelete.threadID)
              .then(function(data) {
                $scope.success = 'deleted';
                $element.find('#msg').show('slow');

                $scope.threads.splice($scope.threads.indexOf($scope.threadtodelete),1);
                modalDelete.modal("hide");
                $scope.threadtodelete = null;


              }).catch(function(error) {
                if (error.status == 403 || error.status == 401 || error.status == 400 || error.data.message || error.data.Message)
                  $scope.errorMsg = 'Cannot delete, ' + (error.data.code ? (error.data.code + ': ') : '') + (error.data.message || error.data.Message);
                else
                  $scope.errorMsg = "There was a error, please try again.";
                console.log(error);
              }).finally(function() {
                $scope.loading = false;
              })
          }
        }
      ]
    };
  }]);

});
