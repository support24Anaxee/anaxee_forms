const mysql = require("mysql");
const fs = require("fs");
const cloudsql = mysql.createPool({
  connectionLimit: 10,
  host: "mysql-123456.mysql.database.azure.com",
  port: 3306,
  user: "demodb",
  password: "GUp8VXUBbzwTx9xQzNPG",
  database: "partner_app",
  charset: "utf8mb4_unicode_ci",
  multipleStatements: true,
  ssl: require,
});


const updateCaseStatus = (case_number) => {
    return new Promise((resp, rej) => {
        cloudsql.query(
        `UPDATE case_assign_data SET status = 'Submitted' WHERE Case_Number = ?;`,
        [case_number],
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

const checkStatus = (case_number) => {
    return new Promise((resp, rej) => {
        cloudsql.query(
        `SELECT status FROM case_assign_data WHERE Case_Number = ?;`,
        [case_number],
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

module.exports = { updateCaseStatus, checkStatus };
