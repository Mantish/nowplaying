if (Meteor.isClient) {
  // codo to run only on the client
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
