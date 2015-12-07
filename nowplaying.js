Tweets = new Mongo.Collection('tweets');

onYouTubeIframeAPIReady = function() {
  var video_divs = document.getElementsByClassName('youtube-video');

  for (var i = 0; i < video_divs.length; i++) {
    new YT.Player(video_divs[i], {
      videoId: video_divs[i].dataset.videoId
    });
  }
}

getYoutubeId = function(tweet_urls) {
  var reg_exp = /.*(youtu\.be\/|youtube(-nocookie)?\.com\/(vi?\/|.*u\/\w\/|embed\/|.*vi?=))([\w-]{11}).*/;

  for (var i = 0; i < tweet_urls.length; i++) {
    tweet_urls[i]
    var match = tweet_urls[i].expanded_url.match(reg_exp);
    if (match) {
      return match[4];
    }
  };
}

if (Meteor.isClient) {
  Meteor.subscribe('recent-tweets');

  Template.body.helpers({
    tweets: function () {
      var tweets = Tweets.find().fetch();
      tweets.forEach(function(el, index) {
        tweets[ index ].youtube_id = getYoutubeId(el.entities.urls);
      });

      return tweets;
    }
  });

  Template.tweet.onRendered(function () {
    //if twitter js is loaded before the templates are rendered, then we have to call it manually
    if (typeof twttr.widgets != 'undefined') {
      twttr.widgets.load(this.firstNode);
    }

    if (typeof YT != 'undefined' && YT.loaded) {
      new YT.Player(this.firstNode.children[0], {
        videoId: this.data.youtube_id
      });
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Twit = new TwitMaker({
      consumer_key: Meteor.settings.twitterKey,
      consumer_secret: Meteor.settings.twitterSecret,
      access_token: Meteor.settings.twitterToken,
      access_token_secret: Meteor.settings.twitterTokenSecret
    });

    Twit.get(
      'search/tweets',
      {q: 'youtu #nowplaying filter:links', count: 5},
      Meteor.bindEnvironment(function(err, data, response) {
        data.statuses.forEach(function(el) {
          Tweets.upsert({id: el.id}, el, {}, function(error, updated) {
            console.log(updated);
          });
        });
      })
    );
  });

  Meteor.publish('recent-tweets', function () {
    return Tweets.find({}, {sort: {id: -1}, limit: 5});
  });
}
