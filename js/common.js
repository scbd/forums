define(['app'], function(app){


  app.factory('commonJS', ['$rootScope', '$browser', function($scope, $browser){

    return new function(){

      this.safeApply = function(fn)
      {
        var phase = $scope.$root.$$phase;

        if (phase == '$apply' || phase == '$digest') {
          if (fn && (typeof (fn) === 'function')) {
            fn();
          }
        } else {
          $scope.$apply(fn);
        }
      };

      this.isUserAuthenticated = function(){

        if($browser.cookies().authenticationToken)
          return true;
        else
          return false;
      }

    }

  }])

});
