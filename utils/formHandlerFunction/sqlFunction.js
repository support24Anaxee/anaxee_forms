const cloudSql = require("../cloudSql");


const insertFormInDb = (projectId, xmlFormId, fields) => {
    return new Promise((resp, rej) => {
        try {
            cloudSql.query(
            `INSERT INTO anaxee_forms_mapping (projectId, xmlFormId, form_types) VALUES (?, ?, ?)`,
            [projectId, xmlFormId, JSON.stringify(fields)],
            (err, result) => {
                if (err) {
                    console.log("DB_SQL_INSERT_FAILED", new Error(err));
                    rej(err);
                }
                // console.log("DB_SQL_INSERT_SUCCESS", result);
                resp(result);
            });
        } catch (err) {
            console.log("DB_SQL_INSERT_FAILED", new Error(err));
            rej(err);
        }
})
};

const insertKeyLabelInDb = (projectId, xmlFormId, keyLabel) => {
    return new Promise((resp, rej) => {
        try {
            cloudSql.query(
            `INSERT INTO anaxee_forms_mapping (projectId, xmlFormId, draft_keyLabel) VALUES (?, ?, ?)`,
            [projectId, xmlFormId, JSON.stringify(keyLabel)],
            (err, result) => {
                if (err) {
                    console.log("DB_SQL_INSERT_FAILED", new Error(err));
                    rej(err);
                }
                // console.log("DB_SQL_INSERT_SUCCESS", result);
                resp(result);
            });
        } catch (err) {
            console.log("DB_SQL_INSERT_FAILED", new Error(err));
            rej(err);
        }
})
};

const updateFormInDb = (projectId, xmlFormId, fields) => {
    return new Promise((resp, rej) => {
        try {
            cloudSql.query(
            `UPDATE anaxee_forms_mapping SET form_types = ?, publish_keyLabel = draft_keyLabel WHERE projectId = ? AND xmlFormId = ?`,
            [JSON.stringify(fields), projectId, xmlFormId],
            (err, result) => {
                if (err) {
                    console.log("DB_SQL_UPDATE_FAILED", new Error(err));
                    rej(err);
                }
                // console.log("DB_SQL_UPDATE_SUCCESS", result);
                resp(result);
            });
        } catch (err) {
            console.log("DB_SQL_UPDATE_FAILED", new Error(err));
            rej(err);
        }
})
};

const updateKeyLabelInDb = (projectId, xmlFormId, keyLabel) => {
    return new Promise((resp, rej) => {
        try {
            cloudSql.query(
            `UPDATE anaxee_forms_mapping SET draft_keyLabel = ? WHERE projectId = ? AND xmlFormId = ?`,
            [JSON.stringify(keyLabel), projectId, xmlFormId],
            (err, result) => {
                if (err) {
                    console.log("DB_SQL_UPDATE_FAILED", new Error(err));
                    rej(err);
                }
                // console.log("DB_SQL_UPDATE_SUCCESS", result);
                resp(result);
            });
        } catch (err) {
            console.log("DB_SQL_UPDATE_FAILED", new Error(err));
            rej(err);
        }
})
};

const checkFormExists = (projectId, xmlFormId) => {
    return new Promise((resp, rej) => {
        try {
            console.log("projectId", projectId)
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

module.exports = {
    insertFormInDb,
    updateFormInDb,
    checkFormExists,
    insertKeyLabelInDb,
    updateKeyLabelInDb
}
