define(['app', '../directives/forum-details-directive.html.js', '../directives/post-list-directive.html.js'], function(app) {

  app.controller("forumPostController", ["$scope", function($scope ) {

    function addPost(data, PostCollection) {
      PostCollection.push({
        nodes: [],
        forumPostID: data.forumPostID ? data.forumPostID : data.threadID,
        postedBy: data.createdBy,
        postedOn: data.createdOn,
        message: data.message ? data.message : data.description,
        subject: data.subject ? data.subject : data.title,
        userCanDelete: data.userCanDelete,
        userCanPost: data.userCanPost,
        userCanEdit: data.userCanEdit,
        threadID: data.threadID
      });
    }

    function findDeep(items, attrs) {
      function match(value) {
        for (var key in attrs) {
          if (!_.isUndefined(value)) {
            if (attrs[key] !== value[key]) {
              return false;
            }
          }
        }

        return true;
      }

      function traverse(value) {
        var result;

        _.forEach(value, function(val) {
          if (!result) {
            if (match(val)) {
              result = val;
              return false;
            }

            if ((_.isObject(val) || (_.isArray(val) && val.lenght > 0))) {
              // console.log(val, val.length);
              result = traverse(val);
            }

            if (result) {
              return false;
            }
          }
        });

        return result;

      }

      return traverse(items);

    }
  }]);
});
