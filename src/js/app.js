var utils           = require('./common/utils');
var trivett         = require('./common/trivett');
var homepage        = require('./common/homepage');
var showroom        = require('./common/showroom');
var searchResults   = require('./common/search-results');

trivett.ready = function() {
  trivett.touchEventType = trivett.Utils.isMobile() ? 'touchstart' : 'click';

  $('*[data-trigger="overlay"]').on('click', function() {
    $('.page-overlay').toggleClass('is-visible');
    $('body').toggleClass('has-overlay');

    var clickAnyElementWithinBodyHandler = function(e) {
      // Checking if we are interacting with the overlay content
      if (!trivett.Utils.hasParentClass(e.target, 'page-overlay-content')) {
        $('.page-overlay').removeClass('is-visible');
        $('body').removeClass('has-overlay');
        document.removeEventListener(trivett.touchEventType, clickAnyElementWithinBodyHandler);
      }
    }

    setTimeout(function() {
      document.addEventListener(trivett.touchEventType, clickAnyElementWithinBodyHandler);
    }, 100)
  });


};

document.addEventListener('DOMContentLoaded', function() {
  trivett.Homepage      = homepage;
  trivett.Showroom      = showroom;
  trivett.SearchResults = searchResults;
  trivett.Utils         = utils;

  var searchBox = require("./components/SearchBox.tag");
  riot.mount(searchBox, bootstrapData);

  return trivett.ready();
});
