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

const sendToDb = (data) => {
    return new Promise((resp, rej) => {
        cloudSql.query(
            `INSERT INTO schaeffler_village_committee_data (FormId, data) VALUES (?, ?);`,
            [data.FormId, JSON.stringify(data)],
            (err, result) => {
                if (err) {
                    console.log("DB_SQL_INSERT_FAILED", new Error(err));
                    rej(err);
                }
                console.log("DB_SQL_INSERT_SUCCESS", result);
                resp(result);
            });
    });
};

const updateAirtableIdInDb = (airtableId, submissionId) => {
    return new Promise((resp, rej) => {
        cloudSql.query(
            `UPDATE schaeffler_village_committee_data SET airtableId = ? WHERE FormId = ?;`,
            [airtableId, submissionId],
            (err, result) => {
                if (err) {
                    console.log("DB_SQL_UPDATE_FAILED", new Error(err));
                    rej(err);
                }
                console.log("DB_SQL_UPDATE_SUCCESS", result);
                resp(result);
            });
    });
};


module.exports = { getFormFromDb, sendToDb, updateAirtableIdInDb };