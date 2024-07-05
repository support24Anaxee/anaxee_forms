const cloudSql = require("../cloudSql");


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

const sendToDb = (data, is_dulicate) => {
    return new Promise((resp, rej) => {
        //if dulicate then insert in duplicate table
        if(is_dulicate){
            cloudSql.query(
                `INSERT INTO vnv_phase2_duplicate_data (FormId, data) VALUES (?, ?);`,
                [data.FormId, JSON.stringify(data)],
                (err, result) => {
                    if (err) {
                        console.log("DB_SQL_INSERT_FAILED", new Error(err));
                        rej(err);
                    }
                    console.log("DB_SQL_INSERT_SUCCESS", result);
                    resp(result);
                });
            return;
        }
        else{
        cloudSql.query(
            `INSERT INTO vnv_phase2_data (FormId, data) VALUES (?, ?);`,
            [data.FormId, JSON.stringify(data)],
            (err, result) => {
                if (err) {
                    console.log("DB_SQL_INSERT_FAILED", new Error(err));
                    rej(err);
                }
                console.log("DB_SQL_INSERT_SUCCESS", result);
                resp(result);
            });
        }
    });
};

const updateCaseNumber = (case_number, submissionId, is_dulicate) => {
    return new Promise((resp, rej) => {
        if(is_dulicate){
            cloudSql.query(
                `UPDATE vnv_phase2_duplicate_data SET case_number = ? WHERE FormId = ?;`,
                [case_number, submissionId],
                (err, result) => {
                    if (err) {
                        console.log("DB_SQL_UPDATE_FAILED", new Error(err));
                        rej(err);
                    }
                    console.log("DB_SQL_UPDATE_SUCCESS", result);
                    resp(result);
                });
            return;
        }
        else{
        cloudSql.query(
            `UPDATE vnv_phase2_data SET case_number = ? WHERE FormId = ?;`,
            [case_number, submissionId],
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

const updateAirtableIdInDb = (airtableId, submissionId) => {
    return new Promise((resp, rej) => {
        cloudSql.query(
            `UPDATE vnv_phase2_data SET airtableId = ? WHERE FormId = ?;`,
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


module.exports = { getFormFromDb, sendToDb, updateCaseNumber, updateAirtableIdInDb };