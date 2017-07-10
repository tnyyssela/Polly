var rekog = require('./rekog-service.js');
var fs = require('fs');
var cv = require('opencv');

var responseActionForDetectLabels = function(responseData) {

    console.log("Returned: ")
    console.log(responseData);
    
    //Inspect JSON data and act
   
    /*  { Labels:
   [ { Name: 'People', Confidence: 99.21022033691406 },
     { Name: 'Person', Confidence: 99.21022033691406 },
     { Name: 'Human', Confidence: 99.19815826416016 },
     { Name: 'Clothing', Confidence: 99.06378936767578 },
     { Name: 'Overcoat', Confidence: 99.06378936767578 },
     { Name: 'Suit', Confidence: 99.06378936767578 },
     { Name: 'Couch', Confidence: 91.99417114257812 },
     { Name: 'Furniture', Confidence: 91.99417114257812 },
     { Name: 'Art', Confidence: 87.60358428955078 },
     { Name: 'Painting', Confidence: 87.60358428955078 } ] }  */
};

var test_detectLabels = function() {
    fs.readFile("./content/images/beachrunner.jpg",function(err,data){
    
    if(err) console.log(err,err.stack);
    else {
        rekog.detectLabels(data,responseActionForDetectLabels,'Person');
        rekog.detectLabels(data,responseActionForDetectLabels);
    }
    
    });
};


var test_compareFaces = function() {

    var params ={};
    fs.readFile("./content/images/target4.jpg",function(err,data){
    
    if(err) console.log(err,err.stack);
    else {
        params.SourceImage = data; //{Bytes:data};
        readNextFile(data);
    }
    
    });

    var readNextFile = function (buffer){
        fs.readFile("./content/images/group.jpg", function(err,data){
        if(err) console.log(err,err.stack);
        else {
            params.TargetImage = data; //{Bytes:data};
            compare(params);
        }
        });
    }

    var compare = function(params) {
        rekog.compareFaces(params.SourceImage, params.TargetImage, function(err,data) {
                console.log("Face bounding box on target image: ");
                console.log(data);
                console.log(rekog.translateAWSRatioToPixels(data, {width:1024, height: 576}));
        });
    };

};


var test_detectFaces = function() {

        fs.readFile("./content/images/group.jpg", function(err,data){
        if(err) console.log(err,err.stack);
        else {
            rekog.detectFaces(data, function(data) {
                console.log("Faces found in image: " + data.length);
                //console.log(data);
            });
        }
    });

};


var test_compareFacesToOpenCV = function() {

    var params ={};
    fs.readFile("./content/images/target4.jpg",function(err,data){
    
    if(err) console.log(err,err.stack);
    else {
        params.SourceImage = data;
        readNextFile(data);
    }
    
    });

    var readNextFile = function (buffer){
        fs.readFile("./content/images/group.jpg", function(err,data){
        if(err) console.log(err,err.stack);
        else {
            params.TargetImage = data;
            compare(params);
        }
        });
    }

    var compare = function(params) {
        rekog.compareFaces(params.SourceImage, params.TargetImage, function(data) {
                var rekFace = rekog.translateAWSRatioToPixels(data, {width:1024, height: 576});
                detectFaces(params.TargetImage, rekFace);
        });
    };

  var detectFaces = function(image, awsfaceBox){ 
        cv.readImage( image, function(err, im) {
          var opts = {};
          im.detectObject(cv.FACE_CASCADE, opts, function(err, faces) {
            var face;
            var biggestFace; //this we can replace with our 'aws recognized' face

            for(var k = 0; k < faces.length; k++) {
              face = faces[k];

              if( compareFaceBoxes(face, awsfaceBox, face.width/2) ) {
                console.log("FACE FOUND!!");
                biggestFace = face;
              }
            }

        }, opts.scale, opts.neighbors
          , opts.min && opts.min[0], opts.min && opts.min[1]);

      });
    };
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

//Run tests
//test_detectLabels();
test_compareFaces();
//test_detectFaces();
//test_compareFacesToOpenCV();