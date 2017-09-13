Kafka Readme:

- kfk_consumer.js & kfk_producer.js
-- https://blog.mimacom.com/blog/2017/04/07/apache-kafka-with-node-js/
-- I did my best to interpret what I could from the above walk-through for our application, 
   this doc assumes you are running the kafka server locally (which we could do with this app, 
   or we could setup http or something to get the kafka data)

- azure_cv.js
-- The azure service has already been setup in the slalom azure sandbox. 
-- https://dev.projectoxford.ai/docs/services/56f91f2d778daf23d8ec6739/operations/56f91f2e778daf14a499e1fa
-- https://github.com/joshbalfour/node-cognitive-services#computer-vision---analyze-image
-- Used the above to setup the class to call azure image analysis, we should figure out what kind of params and 
   input methods (raw image binary or image URL) we would like to use.

TODO:
- The mentioned above kafka configurations and azure param & input method audit
- Bring all of this together into a single app that runs either along side or networked to the kafka client
- Anything else anyone can think of!