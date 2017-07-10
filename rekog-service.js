//creates a collection if it doesn't exist
var AWS = require('aws-sdk');
var imageinfo = require('imageinfo');
var imagesize = require('imagesize');
//required region for Rekognition
AWS.config.update({region:"us-west-2"});
var _collectionId = "polly-ref-images";
var rekognition = new AWS.Rekognition();

var findLabelName = function(label) {
    if(label.Name == this) {
        return label;
    }
}

//Call AWS detectLabels for image analysis. 
//Optional name to find parameter will filer results if provided
var detectLabels = function(img, callback, optLabelNameToFind) {
    var params = {
        Image : {Bytes:img},
        MaxLabels : 20,
        MinConfidence : 70 };

    rekognition.detectLabels(params, function(err, data) {
         if (err) {
            console.log(err, err.stack); // an error occurred
            callback(err,null);
        }
        else {
            // successful response return json
            if(data) {
                if(optLabelNameToFind) {
                    var foundItem = data.Labels.find(findLabelName, optLabelNameToFind);
                    callback(err,foundItem);
                } else {
                    callback(err,data)
                }
            } else {
                    callback(err,data)
            }
        }
    });
    
};

var translateAWSRatioToPixels = function(awsFaceBox, imageDimensions) {
    if (awsFaceBox){
    return {x: awsFaceBox.Left * imageDimensions.width,
            y: awsFaceBox.Top * imageDimensions.height,
            width: awsFaceBox.Width * imageDimensions.width,
            height: awsFaceBox.Height * imageDimensions.height};
    }
};

//source image - image of a face to find
//target image - image to search within
//returns an bounding box object
var compareFaces = function(sourceImg, targetImg, callback) {
       
    var params = {
        SourceImage : { Bytes: sourceImg },
        TargetImage : { Bytes: targetImg },
        SimilarityThreshold : 90
     };
console.log("calling aws");
    rekognition.compareFaces(params, function(err, data) {
console.log("AWS returned");
        if (err) {
            console.log(err); // an error occurred
            callback(err, null);
        }
        else {
console.log("AWS success:");
            // successful response
            var faceMatches = data.FaceMatches;
            if(faceMatches) {
                console.log("Face Match count = ", faceMatches.length);
                if(faceMatches.length > 0) {
                    //sort descending by similarity score, aws might already do this
                    //faceMatches.sort(function(a, b){return b.Similarity - a.Similarity});
                    var face = faceMatches[0].Face;
                    callback(err, face.BoundingBox);
                } else callback(err,null);
            } else callback(err,null);
        }
    });
};

//returns an array of detected faces
var detectFaces = function(img, callback) {
       
    var params = {
        Attributes: ["DEFAULT"],
        Image : {Bytes:img}
     };

    rekognition.detectFaces(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(err,null);
        }
        else {
            // successful response
            callback(err,data.FaceDetails);
        }
    });
};

module.exports.detectLabels = detectLabels;
module.exports.compareFaces = compareFaces;
module.exports.detectFaces = detectFaces;
module.exports.translateAWSRatioToPixels = translateAWSRatioToPixels;