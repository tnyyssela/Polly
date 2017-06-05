var Copterface = require('./lib/copterface');
var arDrone = require('ar-drone');
var client = arDrone.createClient();
var pngStream = client.getPngStream();

client.takeoff();

var copterface = Copterface(pngStream,function(info){
	console.log(info);
});

client
  .after(2000, function() {
    this.up(1);
  })
  .after(2000, function() {
    copterface.start();
  })
  .after(50000, function() {
    this.land();
  });