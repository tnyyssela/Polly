var arDrone = require('ar-drone');
var http    = require('http');
var fs      = require('fs');
var cv = require('opencv');
var rekog = require('./rekog-service');
var knownFaces = [];
var targetFace; //our 'aws recognized' face

//"1280:720", "960:540" <- error using 960, default is 640
var options = { imageSize:"1280:720", //sets resolution of camera image
                frameRate:5 //sets framerate to get more shots
              }; 
//Usage example ->  var client = arDrone.createClient(options);
var client = arDrone.createClient();
console.log("Hello, Polly! Pretty bird...");

var png = null;
var sourceImg = null;

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

  console.log('STARTING ROBOT REVOLUTION!!!');
  client.takeoff();

  //After 1 min, land
  client.after(60000, function() {
    console.log('TERMINATING ROBOT REVOLUTION!!!');
    this.stop();
    this.land();
  })

  var sourceImg = fs.readFileSync('./faceImg.jpg');

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

//set sourceImage
fs.readFile('./content/images/test.png',function(err,data){
      if(err) console.log(err.message,err.stack);
      if(data){
        console.log(sourceImg);
        sourceImg = data;
      }
});

pngStream
  .on('error', console.log)
  .on('data', function(pngBuffer) {
    //console.log("got image");
    lastPng = pngBuffer;
    //if our source Image is defined
    if(sourceImg){
      detectFaces();
    }
  });
     
  
  var drawFaceBoxes = function(image, facesArray, targetFace) {
    if(facesArray) {
      //draw boxes
      for(var k = 0; k < facesArray.length; k++) {
        face = facesArray[k];
        
        if( targetFace && targetFace.x == face.x ) {
          //green box around biggest face/aws recognized face
          image.rectangle([face.x, face.y], [face.width, face.height], [0, 255, 0], 2);
        } else {
          //red box around non-target faces
          image.rectangle([face.x, face.y], [face.width, face.height], [0, 0, 255], 2);
        }
      }
    }
  }

  var detectFaces = function(){ 
      if( ! flying ) return;
      if( ( ! processingImage ) && lastPng )
      {
        processingImage = true;
        cv.readImage( lastPng, function(err, im) {
          var opts = {};
          im.detectObject(cv.FACE_CASCADE, opts, function(err, faces) {

            var face;

            //If number of faces grows check aws
            if (knownFaces < faces ) {
              rekog.compareFaces({Bytes:sourceImg}, {Bytes:lastPng}, function(data) {
                var rekFace = rekog.translateAWSRatioToPixels(data, {width:1280, height: 720});
                if(rekFace) { //null if no face found from aws
                  for(var k = 0; k < faces.length; k++) {
                    face = faces[k];
                    //try to match aws face box to opencv face box
                    if( compareFaceBoxes(face, rekFace, face.width/2) ) {
                      console.log("FACE FOUND!!");
                      targetFace = face;
                    }
                  }
                }
              });           
            }
          
          //refresh list of known faces
          knownFaces = faces;

          //draw boxes for output to browser
          drawFaceBoxes(im, faces, targetFace);

          processingImage = false;
          var img = im.toBuffer();
          serverResponse.write('--daboundary\nContent-Type: image/png\nContent-length: ' + img.length + '\n\n');
          serverResponse.write(img); 

          //if we found a face from aws then track it
            if (targetFace) {
              trackCurrentFace(im, face, targetFace);
            }

        }, opts.scale, opts.neighbors
          , opts.min && opts.min[0], opts.min && opts.min[1]);

      });
    };
  };

var trackCurrentFace = function(im,face,targetFace){
  face = targetFace;
  console.log(face.x, face.y, face.width, face.height, im.width(), im.height());

  face.centerX = face.x + face.width * 0.5;
  face.centerY = face.y + face.height * 0.5;

  var centerX = im.width() * 0.5;
  var centerY = im.height() * 0.5;

  var heightAmount = -(face.centerY - centerY) / centerY;
  var turnAmount = -(face.centerX - centerX) / centerX;

  turnAmount = Math.min(1, turnAmount);
  turnAmount = Math.max(-1, turnAmount);

  log(turnAmount + " " + heightAmount);

  heightAmount = Math.min(1, heightAmount);
  heightAmount = Math.max(-1, heightAmount);
  //heightAmount = 0;

    if (turnAmount < 0) {
      client.clockwise(Math.abs(turnAmount));
      log("turning " + turnAmount);
    }
    else client.counterClockwise(turnAmount);
    setTimeout(function () {
      log("stopping turn");
      client.clockwise(0);
      client.stop();
    }, 100);
    if (heightAmount < 0) {
      client.down(heightAmount);
      log("going vertical " + heightAmount);
    }
    else client.up(heightAmount);
    setTimeout(function () {
      log("stopping altitude change");

      client.up(0);
      client.stop();

    }, 50);
};


  var compareFaceBoxes = function(oCVBox, targetBox, threshold) {
      var centerCVX = oCVBox.x + oCVBox.width * 0.5;
      var centerCVY = oCVBox.y + oCVBox.height * 0.5;
      var centerTBX = targetBox.x + targetBox.width * 0.5;
      var centerTBY = targetBox.y + targetBox.height * 0.5;
      var x_pos_OK = centerTBX <= centerCVX + threshold && centerTBX >= centerCVX - threshold;
      var y_pos_OK = centerTBY <= centerCVY + threshold && centerTBY >= centerCVY - threshold;

      return x_pos_OK && y_pos_OK;
  }

var faceInterval = setInterval( detectFaces, 100);

};