const airtable = require("airtable");

airtable.configure({
  endpointUrl: "https://api.airtable.com",
  apiKey: "patuQCqUKgLjY5OH8.9a0a1a649d40fd3a4a237f68d5b071dc7512f17a1b18d0d91a72c41856c0db0f",
});


const schaeffler_base = airtable.base("appe8xi05IidvPEDT");
const table = schaeffler_base("tblJ5RAkr32iZoahg");

// const sendToAirtable = async (data, Plot_Id) => {
//     try{
//         //check if farmer id already exists then update else insert
//         const response = await table.select({
//             fields: ["Farmer ID"],
//             filterByFormula: `({Plot Id} = '${Plot_Id}')`,
//         }).firstPage();
//         // console.log("response", response);
//         if(response.length > 0){
//             //update
//             const recordId = response[0].id;
//             console.log("recordId", recordId);
//             const updateResponse = await table.update(
//                 [
//                     {
//                         id: recordId,
//                         fields: data,
//                     },
//                 ], { typecast: true }
//             );
//             // console.log("updateResponse", updateResponse);
//             return updateResponse;
//         }
//         else{
//             throw "Plot Id not found";
//             //insert
//             const insertResponse = await table.create(data);
//             console.log("insertResponse", insertResponse);
//             return insertResponse;
//         }
//     }
//     catch(err){
//         console.log(err);
//         throw err;
//     }
// };

const insertInAirtable = async (data) => {
    try{
        const insertResponse = await table.create(
            [
                {
                    fields: data,
                },
            ], { typecast: true }
        );
        // console.log("insertResponse", insertResponse);
        return insertResponse
    }
    catch(err){
        console.log(err);
        throw err;
    }
};

module.exports = { insertInAirtable };