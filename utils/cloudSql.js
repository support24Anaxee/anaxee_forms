const mysql = require("mysql");
const fs = require("fs");
const cloudsql = mysql.createPool({
  connectionLimit: 10,
  host: "mysql-123456.mysql.database.azure.com",
  user: "demodb",
  password: "GUp8VXUBbzwTx9xQzNPG",
  database: "spoors_data",
  port: 3306,
  ssl: require,
  // ssl: {
  //   ca: fs.readFileSync(
  //     "/home/vishal/Downloads/DigiCertGlobalRootCA.crt.pem"
  //   ),
  // },
  // ssl: {
  //   ca: fs.readFileSync(
  //     "/Users/rahulbhadoriya/Documents/azureCertificate/DigiCertGlobalRootCA.crt.pem"
  //   ),
  // },
});

module.exports = cloudsql;
