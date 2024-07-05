const airtable = require("airtable");

airtable.configure({
  endpointUrl: "https://api.airtable.com",
  apiKey: "patuQCqUKgLjY5OH8.9a0a1a649d40fd3a4a237f68d5b071dc7512f17a1b18d0d91a72c41856c0db0f",
});


const airtableBase = {
    "Id_Creation_and_Mapping" : airtable.base("appNxPq7tuQ6qp2U4"),
    "demoform" : airtable.base("apptVyKCsHUanQ6im"),
    "feedback" : airtable.base("apptVyKCsHUanQ6im"),
    "Geo-Mapping": airtable.base("apptVyKCsHUanQ6im"),
    "Geo_Mapping": airtable.base("apptVyKCsHUanQ6im"),
    "Biofuel": airtable.base("appkz41ByE74LsQ3N"),
}

const airtableTable = {
    "Id_Creation_and_Mapping" : "tblFmQ0eb0grtiqXA",
    "demoform" : "tblASY0eCIoWXvTeE",
    "feedback" : "tblatHJHymmXLwrub",
    "Geo-Mapping": "tbl5UtQLdVbWjh1zH",
    "Geo_Mapping": "tbl5UtQLdVbWjh1zH",
    "Biofuel": "tbl4HkPmuk8v06mfi",
}
const odkBase = airtable.base("apptVyKCsHUanQ6im");

const odkTable = odkBase("tblASY0eCIoWXvTeE");

const sendToAirtable = async (data) => {
    try{
        const base = airtableBase[data.xmlFormId];
        const result = await base(airtableTable[data.xmlFormId]).create(
            [
                {
                    fields: data,
                },
            ],
            { typecast: true }
        );
        // console.log(result);
        return result;
    }
    catch(err){
        console.log(err);
        throw err;
    }
};

module.exports = { sendToAirtable };