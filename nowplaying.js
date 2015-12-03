if (Meteor.isClient) {
  // code to run only on the client
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
      function(err, data, response) {
        console.log(data)
      }
    );
  });
}
