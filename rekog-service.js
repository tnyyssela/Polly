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
            callback(null);
        }
        else {
            // successful response return json
            if(data) {
                if(optLabelNameToFind) {
                    var foundItem = data.Labels.find(findLabelName, optLabelNameToFind);
                    callback(foundItem);
                } else {
                    callback(data)
                }
            } else {
                    callback(data)
            }
        }
    });
    
};

//can't get this to work, not sure if it's because of image is being from fs opposed to drone cam, or what.
//imagesize returns false, which means it doesn't recognize the image fomrat!
// var translateAWSRatioToPixels = function(targetImg, face, callback) {
    
//             //var base64Image = targetImg.toString('base64');
//             console.log("getting size");
//             imagesize(targetImg, function(err, result) {
//                     if (!err) {
//                         console.log(result); // {type, width, height}
//                         console.log("Image size: w=" + result.width + " and h=" + result.height);
                        
//             //console.log(imageDim);
//             //console.log("Image size: w=" + imageDim.width + " and h=" +imageDim.height);
//            // console.log(imageDim.width);

//                         callback( {left: faceMatch.BoundingBox.Left * imageDim.width,
//                                 top: faceMatch.BoundingBox.Top * imageDim.height,
//                                 width: faceMatch.BoundingBox.Width * imageDim.width,
//                                 height: faceMatch.BoundingBox.Height * imageDim.height});
//                     }
//                     });
        
// }

//source image - image of a face to find
//target image - image to search within
//returns an bounding box object
var compareFaces = function(sourceImg, targetImg, callback) {
       
    var params = {
        SourceImage : sourceImg,
        TargetImage : targetImg,
        SimilarityThreshold : 90
     };

    rekognition.compareFaces(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(null);
        }
        else {
            // successful response
            var faceMatches = data.FaceMatches;
            if(faceMatches) {
                if(faceMatches.length > 0) {
                    //sort descending by similarity score
                    faceMatches.sort(function(a, b){return b.Similarity - a.Similarity});
                    var face = faceMatches[0].Face;
                    callback(face.BoundingBox);
                } else callback(null);
            } else callback(null);
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
            callback(null);
        }
        else {
            // successful response
            callback(data.FaceDetails);
        }
    });
};

module.exports.detectLabels = detectLabels;
module.exports.compareFaces = compareFaces;
module.exports.detectFaces = detectFaces;