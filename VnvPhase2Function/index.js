const { VnvGeoMappingPhase2Function } = require("../utils/VnvGeoMappingPhase2");
const axios = require("axios");

module.exports = async function (context, req) {
  const formData = req.body;
  try {
    const response = await VnvGeoMappingPhase2Function(formData);
    context.res = {
      status: 200,
      body: response,
    };
  } catch (error) {
    context.log("Erorrrrrr", error);

    const data = {
      text: `Error in VNV Geomapping Phase 2 Form submissionId ${formData.submissionId}, form ${formData.xmlFormId} instance Id - "${formData.instanceId}", created at - "${formData.createdAt}"  \n Error: ${error} `,
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
