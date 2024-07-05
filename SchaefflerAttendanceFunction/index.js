const { SchaefflerAttendanceFunction } = require("../utils/SchaefflerAttendanceData");
const axios = require("axios");

module.exports = async function (context, req) {
  const formData = req.body;
  try {
    const response = await SchaefflerAttendanceFunction(formData);
    context.res = {
      status: 200,
      body: response,
    };
  } catch (error) {
    context.log("Erorrrrrr", error);

    const data = {
      text: `Error in Schaeffler(स्वास्थ्यज्योति: उन्नत चूल्हे, सशक्त महिलाएं) Attendance Form submissionId ${formData.submissionId}, form ${formData.xmlFormId} instance Id - "${formData.instanceId}", created at - "${formData.createdAt}"  \n Error: ${error} `,
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
