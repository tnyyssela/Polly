var KafkaRest = require('kafka-rest');
var kafka = new KafkaRest({ 'url': 'http://localhost:9092' });
var fs = require('fs');
var request = require('request');
var util = require('util');


//*****************************************************/
//Kafka Consumer
//*****************************************************/

//Subscribe and log from 'test' topic
kafka.consumer("my-consumer").join({
    "format": "binary",
    "auto.offset.reset": "smallest"
  }, function(err, consumer_instance) {
    var stream = consumer_instance.subscribe('test'); //need to update to vid stream topic
    stream.on('read', function(msgs) {
        for(var i = 0; i < msgs.length; i++)
            console.log("Got a message: key=" + msgs[i].key + " value=" +
                        msgs[i].value + " partition=" + msgs[i].partition);

            az_tag(msgs[i].value);
    });
});

//*****************************************************/
//Azure CV Analysis
//*****************************************************/

var az_tag = function (img){

    //Set the headers
    var headers = {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': '0116ca2ab45f4660b129abcd050534dd'
    };

    // Configure the request
    var options = {
        url: "https://westus.api.cognitive.microsoft.com/vision/v1.0/tag",
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
            kfk_prod(body);

        } else {
            console.log("error from service : " + response.body);
        }
    });
};

//*****************************************************/
//Kafka Producer
//*****************************************************/

var kfk_prod = function(azure_tags_json){ 

    //Push to 'test' topic
    kafka.topic('drone1_successfullAIResults')
        .produce({"azure_tags_json": azure_tags_json},
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
// var imgBinary = fs.readFileSync('test.jpeg');

// az_tag(imgBinary);
