
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

//Create server for browser view
var server = http.createServer(function(req, res) {

  if (!png) {
    png = client.getPngStream();
    png.on('error', function (err) {
        console.error('png stream ERROR: ' + err);
    });
  }

  res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=--daboundary' });

  png.on('data', sendPng);

  function sendPng(buffer) {
    var img = detectFaces(buffer);
    console.log(img.length);
    res.write('--daboundary\nContent-Type: image/png\nContent-length: ' + img.length + '\n\n');
    
    res.write(img); //Trying to get image with ellipse around face to show in browser. No luck yet
  }
});

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

var detectFaces = function(image) {
  var resultImage = image;
  console.log("detectFaces");
  cv.readImage(image, function(err, im){
    console.log("detectFaces - reading image");
    im.detectObject(cv.FACE_CASCADE, {}, function(err, faces){
      for (var i=0;i<faces.length; i++){
        var x = faces[i]
        im.ellipse(x.x + x.width/2, x.y + x.height/2, x.width/2, x.height/2);
      }

      if(faces.length > 0) {
        console.log("detectFaces found a face");
        resultImage = im;
        im.save('./face_' + Date.now() +'.jpg');
      }
    });
  });

  return resultImage;
};

//Start local server to serve up png stream to browser
server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});

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
.after(4000, function(){
  console.log('up');
    savePictureDirect();
  this.up(1);
})
  .after(4000, function(){
    console.log("clockwise");
    savePictureDirect();
    this.clockwise(1);
  })
  .after(1000, function(){
    console.log("clockwise");
    savePictureDirect();
    this.clockwise(1);
  })
  .after(1000, function(){
    console.log("clockwise");
    savePictureDirect();
    this.clockwise(1);
  })
  .after(1000, function(){
    console.log("clockwise");
    savePictureDirect();
    this.clockwise(1);
  })
  .after(1000, function(){
    console.log("land");
    savePictureDirect();
    this.land();
  });
};



//Call this to fly using above function
//flyme();