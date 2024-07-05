const axios = require("axios");

function InsertRunnerData(data) {
    return new Promise((resp, rej) => {
      console.log("data", data);
      axios
        .post(
          "https://anaxeefunctions.azurewebsites.net/api/InsertRunnerData?",
          data
        )
        .then((res) => {
          // console.log("res",res.data);
          resp(res.data);
        })
        .catch((err) => {
          // console.log("err",err.response.data);
          rej(err.response.data);
        });
    });
};

function sendSlackAlert(data) {
    return new Promise((resp, rej) => {
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
          resp("Slack response send successfully");
        })
        .catch((error) => {
          console.log("Error in slack api", error);
          rej(error);
        });
    });
};

module.exports = {
    InsertRunnerData,
    sendSlackAlert
};