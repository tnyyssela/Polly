var arDrone = require('ar-drone');
var http    = require('http');
var fs      = require('fs');
var cv = require('opencv');
//"1280:720", "960:540" <- error using 960, default is 640
var options = { imageSize:"1280:720", //sets resolution of camera image
                frameRate:5 //sets framerate to get more shots
              }; 
//Usage example ->  var client = arDrone.createClient(options);
var client = arDrone.createClient();
console.log("Hello, Polly! Pretty bird...");

var png = null;

console.log('Connecting png stream ...');
var pngStream = client.getPngStream();
var serverResponse;
//Create server for browser view
var server = http.createServer(function(req, res) {

  res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=--daboundary' });
  serverResponse = res;
  start();

});

//Start local server to serve up png stream to browser
server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});

var start = function(){

// Utility. Saves unprocessed pictures directly from drone camera
var savePictureDirect = function() {

    // First we disable the control to have the drone in stable hover mode
    //mission.control().disable();

    // Wait for a new image
    setTimeout(function() {
        client.getPngStream().once('data', function(data) {
            var fileName = 'snap_' + Date.now() + '.png';
            // Save the file
            fs.writeFile(fileName, data, function(err){
                if (err) console.log(err);
                console.log(fileName + ' Saved');

                // Renable the control
                //callback();
            });
        });
    }, 1000);
};

//Code below for tracking faces\
//Currently tracking "biggest face"
//TODO: Track AWS Recognized Face
var processingImage = false;
var lastPng;
var flying = true;
var startTime = new Date().getTime();
var log = function(s){
var time = ( ( new Date().getTime() - startTime ) / 1000 ).toFixed(2);

  console.log(time+" \t"+s);
}

pngStream
  .on('error', console.log)
  .on('data', function(pngBuffer) {
    //console.log("got image");
    lastPng = pngBuffer;
    detectFaces();
  });
     
  var detectFaces = function(callback){ 
      if( ! flying ) return;
      if( ( ! processingImage ) && lastPng )
      {
        processingImage = true;
        cv.readImage( lastPng, function(err, im) {
          var opts = {};
          im.detectObject(cv.FACE_CASCADE, opts, function(err, faces) {

            var face;
            var biggestFace; //this we can replace with our 'aws recognized' face

            for(var k = 0; k < faces.length; k++) {
              face = faces[k];

              if( !biggestFace || biggestFace.width < face.width ) biggestFace = face;

              //im.rectangle([face.x, face.y], [face.x + face.width, face.y + face.height], [0, 255, 0], 2);
            }

            if( biggestFace ){
              face = biggestFace;
              console.log( face.x, face.y, face.width, face.height, im.width(), im.height() );

              face.centerX = face.x + face.width * 0.5;
              face.centerY = face.y + face.height * 0.5;

              var centerX = im.width() * 0.5;
              var centerY = im.height() * 0.5;

              var heightAmount = -( face.centerY - centerY ) / centerY;
              var turnAmount = -( face.centerX - centerX ) / centerX;

              turnAmount = Math.min( 1, turnAmount );
              turnAmount = Math.max( -1, turnAmount );

              log( turnAmount + " " + heightAmount );

              heightAmount = Math.min( 1, heightAmount );
              heightAmount = Math.max( -1, heightAmount );
              //heightAmount = 0;

              if( Math.abs( turnAmount ) > Math.abs( heightAmount ) ){
                log( "turning "+turnAmount );
                if( turnAmount < 0 ) client.clockwise( Math.abs( turnAmount ) );
                else client.counterClockwise( turnAmount );
                setTimeout(function(){
                    log("stopping turn");
                    client.clockwise(0);
                    client.stop();
                },100);
              }
              else {
                log( "going vertical "+heightAmount );
                if(  heightAmount < 0 ) client.down( heightAmount );
                else client.up( heightAmount );
                setTimeout(function(){
                  log("stopping altitude change");
                  
                  client.up(0);
                  client.stop();

                },50);

              }

            }

          processingImage = false;
          var img = im.toBuffer();
          serverResponse.write('--daboundary\nContent-Type: image/png\nContent-length: ' + img.length + '\n\n');
          serverResponse.write(img); //Trying
          //callback(im.toBuffer());
        }, opts.scale, opts.neighbors
          , opts.min && opts.min[0], opts.min && opts.min[1]);

      });
    };
  };

var faceInterval = setInterval( detectFaces, 100);

//Just sample usage of savePictureDirect
client.after(1000, function(){
    console.log("CHEESE!!");
    savePictureDirect();  
});

// ************************
//  FLIGHT COMMANDS
// ************************
var flyme = function() {
client.takeoff();

client
.after(4, function(){
  //console.log('up');
    //savePictureDirect();
  //this.up(1);
})
.after(1000,function(){ 
  log("stopping");
  this.stop(); 
  flying = true;
})
  .after(4000, function(){
    console.log("saving picture");
    savePictureDirect();
    // this.clockwise(1);
  })
  .after(10000, function(){
    console.log("saving picture");
    savePictureDirect();
    // this.clockwise(1);
  })
  .after(10000, function(){
    console.log("saving picture");
    savePictureDirect();   
    // this.clockwise(1);
  })
  .after(10000, function(){
    console.log("saving picture");
    savePictureDirect();
    // this.clockwise(1);
  })
  .after(10000, function(){
    console.log("landing");
    savePictureDirect();
    flying = false;
    this.stop();
    this.land();
  });
};

};

//Call this to fly using above function
//flyme();