var clientPosition = {};
var Tweets = new Mongo.Collection('tweets');

onYouTubeIframeAPIReady = function() {
  var video_divs = document.getElementsByClassName('youtube-video');

  var video_dimensions = getVideoDimensions();

  for (var i = 0; i < video_divs.length; i++) {
    new YT.Player(video_divs[i], {
      videoId: video_divs[i].dataset.videoId,
      height: video_dimensions.height,
      width: video_dimensions.width
    });
  }
}

var getYoutubeId = function(tweet_urls) {
  var reg_exp = /.*(youtu\.be\/|youtube(-nocookie)?\.com\/(vi?\/|.*u\/\w\/|embed\/|.*vi?=))([\w-]{11}).*/;

  for (var i = 0; i < tweet_urls.length; i++) {
    tweet_urls[i]
    var match = tweet_urls[i].expanded_url.match(reg_exp);
    if (match) {
      return match[4];
    }
  };
}

var getVideoDimensions = function() {
  var first_li = document.querySelector('.video-list .video-item');
  var styles = window.getComputedStyle(first_li);
  var li_width = first_li.clientWidth - parseInt(styles.paddingLeft) - parseInt(styles.paddingRight);
  var body_width = document.body.clientWidth;

  if (body_width < 600) {
    w = li_width;
  } else {
    w = Math.round(li_width*.49);
  }

  h = Math.round(w * 0.61);

  return {width: w, height:h};
}

var setPosition = function(position) {
  clientPosition = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    mock: false
  }

  Meteor.call('getCity', clientPosition, function(err, response) {
    var city_object = response.result.places[0];
    console.log(city_object);

    Session.set('clientCity', city_object.name);
    Session.set('clientCityId', city_object.id);

    Meteor.call('getGeoTweets', city_object.id, function(err, response) {
      Session.set('cityTweets', response.statuses);
    });
  });
}

var noPosition = function(err) {
  //if for any readon, we cannot get the position, we'll use San Francisco coordinates
  clientPosition = {
    latitude: 37.75776,
    longitude: -122.47262,
    mock: true
  };

  Session.set('clientCity', 'San Francisco');
  Session.set('clientCityId', '5a110d312052166f');

  Meteor.call('getGeoTweets', '5a110d312052166f', function(err, response) {
    Session.set('cityTweets', response.statuses);
  });
}

var upsertTweets = function(statuses) {
  statuses.forEach(function(el) {
    Tweets.upsert({id: el.id}, el, {}, function(error, updated) {
      console.log(updated);
    });
  });
}

if (Meteor.isClient) {
  Meteor.subscribe('recent-tweets');

  //get user position, up to 5 minutes old
  navigator.geolocation.getCurrentPosition(setPosition, noPosition, {maximumAge: 300000});

  Template.body.helpers({
    tweets: function() {
      var tweets = Session.get('cityTweets');
      tweets.forEach(function(el, index) {
        tweets[ index ].youtube_id = getYoutubeId(el.entities.urls);
      });

      return tweets;
    },

    city: function () {
      return Session.get('clientCity');
    }
  });

  Template.body.events({
    'submit .new-tweet': function(event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get values from form element
      var video_url = event.target.videourl.value;
      var comment = event.target.comment.value;
      var tweet_content = {status: comment + ' ' + video_url + ' #nowplaying'};

      if (typeof clientPosition.latitude != 'undefined' && ! clientPosition.mock) {
        tweet_content.lat = clientPosition.latitude;
        tweet_content.long = clientPosition.longitude;
      }

      Meteor.call('postTweet', tweet_content, function(err, response) {
        if(response) {
          window.alert('Twitter update posted to #nowplaying !');
        } else {
          window.alert('There was an error posting your tweet. Please try again later');
        }
      });

      // Clear form
      event.target.videourl.value = '';
      event.target.comment.value = '';
    }
  });

  Template.tweet.onRendered(function () {
    //if twitter js is loaded before the templates are rendered, then we have to call it manually
    if (typeof twttr.widgets != 'undefined') {
      twttr.widgets.load(this.firstNode);
    }

    if (typeof YT != 'undefined' && YT.loaded) {
      var video_dimensions = getVideoDimensions();

      new YT.Player(this.firstNode.children[0], {
        videoId: this.data.youtube_id,
        height: video_dimensions.height,
        width: video_dimensions.width
      });
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function() {
    // code to run on server at startup
    var Twit = new TwitMaker({
      consumer_key: Meteor.settings.twitterKey,
      consumer_secret: Meteor.settings.twitterSecret,
      access_token: Meteor.settings.twitterToken,
      access_token_secret: Meteor.settings.twitterTokenSecret
    });

    Meteor.methods({
      getTweets: function() {
        Twit.get(
          'search/tweets',
          {q: 'youtu #nowplaying filter:links', count: 5, result_type: 'recent'},
          Meteor.bindEnvironment(function(err, data, response) {
            console.log(JSON.stringify(data, null, 2));
            upsertTweets(data.statuses);
          })
        );
      },

      postTweet: function(tweet_content) {
        //wrapAsync help us get the callback result from the Twit.post function and return it to the client
        var syncPostTweet = Meteor.wrapAsync(Twit.post, Twit);

        var result = syncPostTweet('statuses/update', tweet_content);
        return result;
      },

      getGeoTweets: function(place_id) {
        //wrapAsync help us get the callback result from the Twit.get function and return it to the client
        var syncGetTweets = Meteor.wrapAsync(Twit.get, Twit);

        var result = syncGetTweets('search/tweets', {q: '#nowplaying place:'+place_id, count: 5, result_type: 'recent'});
        return result;
      },

      getCity: function(location) {
        //wrapAsync help us get the callback result from the Twit.get function and return it to the client
        var syncGetTweets = Meteor.wrapAsync(Twit.get, Twit);

        var result = syncGetTweets('geo/reverse_geocode', {lat: location.latitude, long: location.longitude, granularity: 'city'});
        return result;
      }
    });

    Meteor.call('getTweets');
  });

  Meteor.publish('recent-tweets', function () {
    return Tweets.find({}, {sort: {id: -1}, limit: 5});
  });
}
