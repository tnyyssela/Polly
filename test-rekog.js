var rekog = require('./rekog-service.js');
var fs = require('fs');

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
    fs.readFile("./content/images/target.jpg",function(err,data){
    
    if(err) console.log(err,err.stack);
    else {
        params.SourceImage = {Bytes:data};
        readNextFile(data);
    }
    
    });

    var readNextFile = function (buffer){
        fs.readFile("./content/images/group.jpg", function(err,data){
        if(err) console.log(err,err.stack);
        else {
            params.TargetImage = {Bytes:data};
            compare(params);
        }
        });
    }

    var compare = function(params) {
        rekog.compareFaces(params.SourceImage, params.TargetImage, function(data) {
                console.log("Face bounding box on target image: ");
                console.log(data);
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


//Run tests
//test_detectLabels();
//test_compareFaces();
//test_detectFaces();