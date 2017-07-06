var cv = require('opencv');
var http    = require('http');
var fs      = require('fs');

// camera properties
var camWidth = 320;
var camHeight = 240;
var camFps = 10;
var camInterval = 1000 / camFps;

// face detection properties
var rectColor = [0, 255, 0];
var rectThickness = 2;

// initialize camera
var camera = new cv.VideoCapture(0);
camera.setWidth(camWidth);
camera.setHeight(camHeight);

//Create server for browser view
var server = http.createServer(function(req, res) {

  res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=--daboundary' });

  setInterval(function() {
    camera.read(function(err, im) {
      if (err) throw err;

      im.detectObject('/Users/josh.ruoff/Documents/src/Hackathons/Polly/node_modules/opencv/data/haarcascade_frontalface_alt2.xml', {}, function(err, faces) {
        if (err) throw err;

        for (var i = 0; i < faces.length; i++) {
          face = faces[i];
          im.rectangle([face.x, face.y], [face.width, face.height], rectColor, rectThickness);
        }
    
        res.write('--daboundary\nContent-Type: image/png\nContent-length: ' + im.length + '\n\n');
        res.write(im.toBuffer()); 
        //socket.emit('frame', { buffer: im.toBuffer() });
      });
    });
  }, camInterval);
});

//Start local server to serve up png stream to browser
server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});

