
//creates a collection if it doesn't exist
var AWS = require('aws-sdk');
var fs = require('fs');
//required region for Rekognition
AWS.config.update({region:"us-west-2"});

var _collectionId = "polly-ref-images";

var rekognition = new AWS.Rekognition();
/*var params = {
  CollectionId: _collectionId
 };

 rekognition.listCollections({},function(err,data){
     if(err) console.log(err,err.stack);
     else {
       if(data.CollectionIds.length>0){
         if(data.CollectionIds[0]!== _collectionId){
            console.log("creating new collection");
            createNewCollection();
         }
         else{
           console.log("collection already exists "+_collectionId);
         }
       }
     }
 });

 var createNewCollection = function(){
  rekognition.createCollection(params, function(err, data) {
   if (err) console.log(err, err.stack); // an error occurred
   else {   
     console.log(data);// successful response
   }
 })};
 */
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

var compare = function(params){
  rekognition.compareFaces(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});
};

 