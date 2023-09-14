const { formHandlerFunction } = require("../utils/formHandlerFunction");
const axios = require("axios");

module.exports = async function (context, req) {
    // context.log('JavaScript HTTP trigger function processed a request.');
    const form  = req.body;
    try{   
        console.log('form', form)
        const responseMessage = await formHandlerFunction(form);
        console.log('responseMessage', responseMessage)
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: {fields : responseMessage}
        };
      } catch (error) {
        context.log("Erorrrrrr", error);
    
        const data = {
          text: `Error in Anaxee Forms handler ${form.projectId}, form ${form.xmlFormId}  \n Error: ${error} `,
        };
    
        const options = {
          headers: {
            "Content-Type": "application/json",
          },
        };
    
        axios
          .post(
            "https://hooks.slack.com/services/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",
            data,
            options
          )
          .then((res) => {
            console.log("Slack response send successfully");
          })
          .catch((error) => {
            console.log("Error in slack api", error);
          });
    
        context.res = {
          status: 500,
          body: error,
        };
      }
    };