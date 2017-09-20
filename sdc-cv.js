var KafkaRest = require('kafka-rest');
var kafka = new KafkaRest({ 'url': 'http://10.0.0.176:8082' });
var fs = require('fs');
var request = require('request');
var util = require('util');
var cv = require('opencv');
var kfkObj = [];

/*
*
* README:
* - consume img and loc data from kafka
* - pass img to azure for CV img desc
* - pass img to OpenCV for bounding box
* - publish location, azure desc, bounding box to kafka via producer
*
* RUN PROJ:
* - update KafkaRest endpoint at top of file ^^^
* - npm install
* - npm run sdc
*
* - TODO: Fix kafka consumer to interact with actual data stream
* - TODO: Verify producer is delivering data as UWP/Hololens expects
*/

//*****************************************************/
//Kafka Consumer
//*****************************************************/

//Subscribe and log from 'test' topic 
//TODO: GET THIS WORKING WITH REAL KAFKA STUFFS!
kafka.consumer("my-consumer").join({
    "format": "binary",
    "auto.offset.reset": "smallest"
  }, function(err, consumer_instance) {
    var stream = consumer_instance.subscribe('drone1_successfullAIResults'); //TODO: need to update to vid stream

    stream.on('read', function(msgs) {
        for(var i = 0; i < msgs.length; i++)
            console.log("Got a message: " + msgs[i]);

            //Send to azure to describe img
            // az_describe(msgs[i].value); //TODO: update to whatever this msgs img data val actually is

            //Add location to kfkObj
            //kfkObj.push({"location": msgs[i].value.location}); //TODO: whatever this loc obj actually is

    });
});

//*****************************************************/
//Azure CV Analysis
//*****************************************************/

var az_describe = function (img){
    
    //Set the headers
    var headers = {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': '0116ca2ab45f4660b129abcd050534dd'
    };

    // Configure the request
    var options = {
        url: "https://westus.api.cognitive.microsoft.com/vision/v1.0/describe",
        method: 'POST',
        headers: headers,
        body: img
    };

    // Start the request
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // Print out the response body
            console.log(body);

            //publish azure tags json to kafka
            kfkObj.push({"az_desc": body});

            //Send to OpenCV for bounding boxes
            cvDetect(img);

        } else {
            console.log("error from service : " + response.body);
        }
    });
};


// var az_tag = function (img){

//     //Set the headers
//     var headers = {
//         'Content-Type': 'application/octet-stream',
//         'Ocp-Apim-Subscription-Key': '0116ca2ab45f4660b129abcd050534dd'
//     };

//     // Configure the request
//     var options = {
//         url: "https://westus.api.cognitive.microsoft.com/vision/v1.0/tag",
//         method: 'POST',
//         headers: headers,
//         body: img
//     };

//     // Start the request
//     request(options, function (error, response, body) {
//         if (!error && response.statusCode == 200) {
//             // Print out the response body
//             console.log(body);

//             //publish azure tags json to kafka
//             kfkObj.push({"az_tags": body});
//         } else {
//             console.log("error from service : " + response.body);
//         }
//     });
// };

//*****************************************************/
//OpenCV Bounding Boxes
//*****************************************************/

var cvDetect = function(img) {

    cv.readImage(img, function(err, im){  
    if (err) throw err;
    if (im.width() < 1 || im.height() < 1) throw new Error('Image has no size');
  
        im.detectObject('./node_modules/opencv/data/haarcascade_fullbody.xml', {}, function(err, persons){
        if (err) throw err;
    
        for (var i = 0; i < persons.length; i++){
            var person = persons[i];
            im.ellipse(person.x + person.width / 2, person.y + person.height / 2, person.width / 2, person.height / 2, [255, 255, 0], 3);
        }

        var buff = im.toBuffer();

        //Add image binary to kfkObj
        kfkObj.push({"personImg" : buff});

        console.log(kfkObj.length);
        
        //publish kfkObj to kafka
        kfkProd(kfkObj);

        });
    });
};


//*****************************************************/
//Kafka Producer
//*****************************************************/

var kfkProd = function(kfkObj){ 

    //Push to 'test' topic
    kafka.topic('drone1_successfullAIResults')
        .produce(kfkObj,
        function(err, response) {
            if(err){
                console.log(err);
            } else {
                console.log(response);
            }
        }
    );
};

//Test Image
// var imgBinary = fs.readFileSync('30.jpg');

// az_describe(imgBinary);
// cvDetect(imgBinary);