define(['app'], function(app){
  app.factory('forumHttp', ['$http',"$browser",'$rootScope', function($http,$browser,$rootScope){

      function addAuthentication(config) {

        if(!config)         config         = {};
        if(!config.headers) config.headers = {};

        if($browser.cookies().authenticationToken) config.headers.Authorization = "Ticket "+$browser.cookies().authenticationToken;
        else                                       config.headers.Authorization = undefined;

        return config;
      }

      function forumHttp(config) {
        return $http(addAuthentication(config));
      }

      forumHttp["get"   ] = function(url,       config) { return forumHttp(angular.extend(config||{}, { 'method' : "GET"   , 'url' : url })); };
      forumHttp["head"  ] = function(url,       config) { return forumHttp(angular.extend(config||{}, { 'method' : "HEAD"  , 'url' : url })); };
      forumHttp["delete"] = function(url,       config) { return forumHttp(angular.extend(config||{}, { 'method' : "DELETE", 'url' : url })); };
      forumHttp["jsonp" ] = function(url,       config) { return forumHttp(angular.extend(config||{}, { 'method' : "JSONP" , 'url' : url })); };
      forumHttp["post"  ] = function(url, data, config) { return forumHttp(angular.extend(config||{}, { 'method' : "POST"  , 'url' : url, 'data' : data })); };
      forumHttp["put"   ] = function(url, data, config) { return forumHttp(angular.extend(config||{}, { 'method' : "PUT"   , 'url' : url, 'data' : data })); };

      return forumHttp;

  }]);
});
