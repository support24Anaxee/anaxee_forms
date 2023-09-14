const { formSubmissionFunction } = require("../utils/formSubmissionFunction");
const axios = require("axios");

module.exports = async function (context, req) {
  const formData = req.body;
  try {
    const response = await formSubmissionFunction(formData);
    context.res = {
      status: 200,
      body: response,
    };
  } catch (error) {
    context.log("Erorrrrrr", error);

    const data = {
      text: `Error in Anaxee Forms submissionId ${formData.submissionId}, form ${formData.xmlFormId} instance Id - "${formData.instanceId}", ${FormData.createdAt ? "created at" + FormData.createdAt : ""}  \n Error: ${error} `,
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
