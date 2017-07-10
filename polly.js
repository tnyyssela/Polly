var arDrone = require('ar-drone');
var http    = require('http');
var fs      = require('fs');
var cv = require('opencv');
var rekog = require('./rekog-service');

var targetFaceImagePath = "./content/images/target2.jpg";  //"./faceImg.jpg"
//var FACE_CASCADE_2 = './node_modules/opencv/data/haarcascade_frontalface_alt2.xml';
var currentFaces = [];
var targetFace; //our 'aws recognized' face

//"1280:720", "960:720"
//960×720  = 4:3
//1080×720 = 3:2
var options = { imageSize:"640:360", //sets resolution of camera image
                frameRate:5, //sets framerate to get more shots
                ip:"192.168.3.1"
              }; 
//Usage example ->  var client = arDrone.createClient(options);
var client = arDrone.createClient(options);
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
  
  fs.readFile(targetFaceImagePath, function(err,data){
    if(err) {
      console.log(err,err.stack);
      throw err;
    }
    else {
        sourceImg = data;
        start();
    }
  });
});

//Start local server to serve up png stream to browser
server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});

var start = function(){

try {
  console.log('STARTING ROBOT REVOLUTION!!!');
  client.takeoff();

  //After 1 min, land
  client.after(60000, function() {
    console.log('TERMINATING ROBOT REVOLUTION!!!');
    this.stop();
    this.land();
    process.exit(0);
  });


// Utility. Saves unprocessed pictures directly from drone camera
var savePictureDirect = function(img) {
        var fileName = './snaps/' + Date.now() + '.png';
        // Save the file
        fs.writeFile(fileName, img, function(err){
            if (err) console.log(err);
            console.log(fileName + ' Saved');
        });
};

var processingImage = false;
var waitingForAwsResponse = false;
var lastPng;
var flying = true;
var startTime = new Date().getTime();
var log = function(s){
var time = ( ( new Date().getTime() - startTime ) / 1000 ).toFixed(2);
  console.log(time+" \t"+s);
};

//Drone camera event handlers
pngStream
  .on('error', console.log)
  .on('data', function(pngBuffer) {
    lastPng = pngBuffer;
    //  lastPng = new Buffer(pngBuffer.length);
    //  pngBuffer.copy(lastPng);
      detectFaces(lastPng);
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
  };
  
  var deepCopy = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };

 var findTargetFaceNearKnownFaceBox = function(faces, knownFaceBox) {
   var found = false;
   for(var k = 0; k < faces.length; k++) {
      var face = faces[k];
      //try to match aws face box to opencv face box
      if( compareFaceBoxes(face, knownFaceBox, face.width * 0.4) ) {
        console.log("FACE FOUND!!");
        targetFace = face;
        found = true;
      }
    }

    if(!found) { 
      if(targetFace) console.log("**FACE LOST**"); //we had a face and lost it
      targetFace = null;
    }
 };

  var detectFaces = function(img){ 
      if( ! flying ) return;
      if( ( ! processingImage ) && img )
      {
        processingImage = true;
        cv.readImage( img, function(err, im) {
          var opts = {};
          im.detectObject(cv.FACE_CASCADE, opts, function(err, faces) {

            if(faces && faces.length != 0) { //only examine faces if opencv found some

              var faceCountChanged = currentFaces.length < faces.length;
              //refresh list of known faces
              currentFaces = deepCopy(faces);

              //if we have a target face, see if it needs updated or still exists
              if(targetFace) {
                //targetFace will be null if the face has moved too far in the image, or is gone
                //otherwise we've updated targetFace
                findTargetFaceNearKnownFaceBox(faces, targetFace); 
              }

              //If number of faces grows check aws
              if (faceCountChanged && faces.length && !waitingForAwsResponse) {
                waitingForAwsResponse = true;
                //Send images to aws
                rekog.compareFaces(sourceImg, img, function(err,data) {
                  //aws data contains a face box if the face in sourceImg was found in lastPng
                  var rekFace = rekog.translateAWSRatioToPixels(data, {width:640, height: 360});
                  console.log("rekFace   ", rekFace);
                  if(rekFace) { //null if no face found from aws
                    findTargetFaceNearKnownFaceBox(faces, rekFace);
                  } else {
                    console.log("**NO FACE FOUND!!");
                        targetFace = null;
                  }

                  waitingForAwsResponse = false;
                });           
              }
            } else {
              //no faces found
              //clear list of known faces
              currentFaces = [];
            } 

            //draw boxes for output to browser
            drawFaceBoxes(im, currentFaces, targetFace);

            var img = im.toBuffer();
            serverResponse.write('--daboundary\nContent-Type: image/png\nContent-length: ' + img.length + '\n\n');
            serverResponse.write(img); 

            //if we found a face from aws then track it
            if (targetFace) {
              savePictureDirect(img);
              trackCurrentFace(im, targetFace);
            }

            processingImage = false;

          }, opts.scale, opts.neighbors
            , opts.min && opts.min[0], opts.min && opts.min[1]);

        });
    };
  };

var trackCurrentFace = function(im,targetFace){
  var face = deepCopy(targetFace);
  //console.log(face.x, face.y, face.width, face.height, im.width(), im.height());

  face.centerX = face.x + face.width * 0.5;
  face.centerY = face.y + face.height * 0.5;

  var centerX = im.width() * 0.5;
  var centerY = im.height() * 0.5;

  var heightAmount = -(face.centerY - centerY) / centerY;
  var turnAmount = -(face.centerX - centerX) / centerX;
  
  turnAmount = Math.min(1, turnAmount);
  turnAmount = Math.max(-1, turnAmount);

  heightAmount = Math.min(1, heightAmount);
  heightAmount = Math.max(-1, heightAmount);

  client.stop(); //stop anything going on
  client
  .after(10, function(){
    log("turning " + turnAmount);
    turnAmount < 0 ? this.clockwise(Math.abs(turnAmount)) : this.counterClockwise(turnAmount);
  })
  .after(500,function(){ 
    log("vertical " + heightAmount);
    this.clockwise(0); //stop rotation
    heightAmount < 0 ? this.down(Math.abs(heightAmount)) : this.up(heightAmount);
  })
  .after(500,function(){ 
    log("stopping");
    this.up(0); //stop moving up
    this.stop(); 
  });

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
} catch(err) {
  console.log(err);
  client.land();
}
};