//AZURE CV IMAGE ANALYSIS
const cognitiveServices = require('cognitive-services');

var computerVision = cognitiveServices.computerVision({
    API_KEY: "0116ca2ab45f4660b129abcd050534dd"
})

const parameters = {
    visualFeatures: "Categories"
};
/* Input passed within the POST body. Supported input methods: raw image binary or image URL. 

Input requirements: 

Supported image formats: JPEG, PNG, GIF, BMP. 
Image file size must be less than 4MB.
Image dimensions must be at least 50 x 50.
 */
const body = {};

computerVision.analyzeImage({
        parameters,
        body
    })
    .then((response) => {
        console.log('Got response', response);
    })
    .catch((err) => {
        console.error('Encountered error making request:', err);
    });