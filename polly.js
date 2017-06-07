var Copterface = require('./lib/copterface');
var arDrone = require('ar-drone');
var client = arDrone.createClient(); 
var pngStream = client.getPngStream(); //<--- This is broken

client.takeoff();

var copterface = Copterface(pngStream,function(info){ //<--- Therefore this is broken
	console.log(info);
});

client
  .after(10000, function() {
    console.log("now tracking face");
    copterface.start(); //<--- Therefore this is broken
  })
  .after(100000, function() {
    console.log("landing");
    this.land();
  });

  //Everything else is working fine