Tweets = new Mongo.Collection('tweets');

if (Meteor.isClient) {
  Meteor.subscribe('recent-tweets');

  Template.body.helpers({
    tweets: function () {
      return Tweets.find();
    }
  });

  Template.tweet.onRendered(function () {
    //if twitter js is loaded before the templates are rendered, then we have to call it manually
    if (twttr) {
      twttr.widgets.load(this.firstNode);
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
