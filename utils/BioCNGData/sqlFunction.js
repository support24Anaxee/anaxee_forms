const cloudSql = require("../cloudSql");
const axios = require("axios");


const getFormFromDb = (projectId, xmlFormId) => {
    return new Promise((resp, rej) => {
        try {
            cloudSql.query(
            `SELECT * FROM anaxee_forms_mapping WHERE projectId = ? AND xmlFormId = ?`,
            [projectId, xmlFormId],
            (err, result) => {
                if (err) {
                    console.log("DB_SQL_SELECT_FAILED", new Error(err));
                    rej(err);
                }
                // console.log("DB_SQL_SELECT_SUCCESS", result);
                resp(result);
            });
        } catch (err) {
            console.log("DB_SQL_SELECT_FAILED", new Error(err));
            rej(err);
        }
})
};

const sendToDb = (data, contact_number) => {
    return new Promise((resp, rej) => {
        cloudSql.query(
            `INSERT INTO bio_cng_data (FormId, data, contact_number) VALUES (?, ?, ?);`,
            [data.FormId, JSON.stringify(data), contact_number],
            (err, result) => {
                if (err) {
                    if (err && err.code === "ER_DUP_ENTRY") {
                        console.log("DUPLICATE_ENTRY", contact_number);
                        //insert in duplicate table
                        cloudSql.query(
                            `INSERT INTO bio_cng_duplicate_data (FormId, data, contact_number) VALUES (?, ?, ?);`,
                            [data.FormId, JSON.stringify(data), contact_number],
                            (err, result) => {
                                if (err) {
                                    console.log("FAILED_INSERT in duplicate table", JSON.stringify(err));
                                    rej(err);
                                }
                                else {
                                    let fenumber = data["Filled by number"];
                                    console.log("DUPLICATE Data", contact_number, fenumber);
                                    let msgBody = {
                                        sender: "ANAXEE",
                                        route: "4",
                                        country: "91",
                                        DLT_TE_ID: "1307164172742982413",
                                        sms: [{
                                            message: `Mob-No.  ${contact_number} | Duplicate Number Found (GS) | Register new farmer | Ask Farmer before Registration | Duplicate data will be rejected. Thank you. Anaxee`,
                                            to: [fenumber],
                                        }],
                                    };
                                    axios.post("https://api.msg91.com/api/v2/sendsms?country=91", msgBody,
                                        {
                                            headers: {
                                                "Content-Type": "application/json",
                                                authkey: "103801ASIjpSVep5dadb6b2",
                                            },
                                        })
                                        .then(() => {
                                            resp([true, true]);
                                            console.log("dup-num-msg-send", data.FormId, fenumber);
                                        })
                                        .catch((err) => {
                                            resp([true, false]);
                                            console.log(
                                                "dup-num-msg-err",
                                                data, data.FormId,
                                                err.response.data
                                            );
                                        });
                                }
                            }
                        );
                    }
                    else {
                        console.log("FAILED_INSERT", JSON.stringify(err));
                        rej(err);
                    }
                }
                else resp([false, false]);
            }
        );
    });
};

const updateAirtableIdInDb = (airtableId, submissionId, is_duplicate) => {
    return new Promise((resp, rej) => {
        if(is_duplicate){
            cloudSql.query(
                `UPDATE bio_cng_duplicate_data SET airtableId = ? WHERE FormId = ?;`,
                [airtableId, submissionId],
                (err, result) => {
                    if (err) {
                        console.log("DB_SQL_UPDATE_FAILED", new Error(err));
                        rej(err);
                    }
                    console.log("DB_SQL_UPDATE_SUCCESS", result);
                    resp(result);
                });
        }
        else{
            cloudSql.query(
                `UPDATE bio_cng_data SET airtableId = ? WHERE FormId = ?;`,
                [airtableId, submissionId],
                (err, result) => {
                    if (err) {
                        console.log("DB_SQL_UPDATE_FAILED", new Error(err));
                        rej(err);
                    }
                    console.log("DB_SQL_UPDATE_SUCCESS", result);
                    resp(result);
                });
        }
    });
};


module.exports = { getFormFromDb, sendToDb, updateAirtableIdInDb };