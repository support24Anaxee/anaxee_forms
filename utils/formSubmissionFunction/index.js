const { sendToAirtable } = require('./airtableFunction');
const { getFormFromDb } = require('./sqlFunction');
const {XMLParser} = require('fast-xml-parser');
const axios = require("axios");
const parser = new XMLParser();
const Url = "https://ayush@forms.com:anaxee@1234@odk.anaxee.com/v1/projects/";
const token = "k7DfgLEy!J6TrIhidxGxxrj$1r1mIwM8deM4S7fYIHCAUw94moPcKehbuAfMl2Z4";
// url : "https://ayush@forms.com:anaxee@1234@odk.anaxee.com/v1/projects/3/forms/demoform/submissions/uuid:07beb5be-3296-445a-bacf-7b67521ed03c/attachments/1688539555745.jpg"

const formSubmissionFunction = async (formData) => {
    try {
        if(!formData.data || formData.data === "" || formData.data === null || formData.data === undefined){
            console.log("in if condition");
            const xmlData = await getFormDataFromXML(formData);
            // console.log('xmlData', xmlData);
            formData.data = xmlData.data;
            formData.createdAt = xmlData.createdAt;
        }
        // console.log('formData', formData);
        const { ProjectId, xmlFormId, instanceId, submissionId, createdAt, data } = formData;
        const attachmentUrl = `${Url}${ProjectId}/forms/${xmlFormId}/submissions/${instanceId}/attachments/`;



        //get form from database by projectId and xmlFormId
        const form = await getFormFromDb(ProjectId, xmlFormId);

        
        if(form.length > 0){
            //get form fields types from form and map with data
            const formFields = JSON.parse(form[0].form_types);
            const keyLabel = JSON.parse(form[0].publish_keyLabel);
            const jsonData = parser.parse(data);
            // console.log('jsonData', jsonData)
            const parsedData = jsonData.data;
            const finalParsedData = {};
            for (const key in parsedData) {
                if (key !== 'meta') {
                    Object.assign(finalParsedData, parsedData[key]);
                }
            }
            const againFinalParsedData = {};
            //check if finalParsedData has contain object then extract key value from object and add to finalParsedData
            for(const key in finalParsedData){
                if(typeof finalParsedData[key] === 'object'){
                    Object.assign(againFinalParsedData, finalParsedData[key]);
                    delete finalParsedData[key];
            }
            }
            if(Object.keys(againFinalParsedData).length > 0){
                Object.assign(finalParsedData, againFinalParsedData);
            }
            // const finalData = await mapData(formFields, result, attachmentUrl);
            // console.log('finalParsedData', finalParsedData)
            //convert email in finalParsedData from gnspda&#64;gmail.com to gnspda@gmail
            if(finalParsedData.email){
                finalParsedData.email = finalParsedData.email.replace(/&#64;/g, '@');
            }
            if(finalParsedData.E_mail_ID){
                finalParsedData.E_mail_ID = finalParsedData.E_mail_ID.replace(/&#64;/g, '@');
            }
            const airtableData = {};
            for(const key in finalParsedData){
                if(formFields[key] === "selectMultiple"){
                    const values = finalParsedData[key] ? finalParsedData[key].split(" ") : [];
                    airtableData[key] = values.map(value => keyLabel[key] ? keyLabel[key][value] : value)
                }
                else if(formFields[key] === "binary"){
                    airtableData[key] = [{ url : attachmentUrl + finalParsedData[key] }]
                } 
                else{
                    const value = keyLabel[key] ? keyLabel[key][finalParsedData[key]] : finalParsedData[key];
                    //add two conditions "N/A" and undefined
                    if(value === "N/A" || value === undefined){
                        airtableData[key] = null;
                    }
                    else{
                        airtableData[key] = value.toString();
                    }
                }       
            }


            //code for kml file
            if(airtableData.map){
                const data = {
                    formId : submissionId,
                    District: airtableData.District_Name,
                    Tehsil: airtableData.Tehsil_Name,
                    GramPanchayat: airtableData.Gram_Panchayat_Name,
                    Village : airtableData.Village_Name,
                    // Khasranum : airtableData['khasra-number'],
                    OwnerName : airtableData['farmer-name'],
                    // recordArea: "0.555000000000000", //dummy value
                    farmId : airtableData['farm-id'],
                }
                const geoMap = await getKmlFile(airtableData.map, airtableData['current-location'], data);
                airtableData["Geo Map"] =  geoMap.attachmentArray
                airtableData["Kml File"] = geoMap.attachmentArray[0].url;
                airtableData["Field Survey Area"] = geoMap.fieldSurveyArea;
             }
            if(airtableData["current-location"]){
                airtableData["current-location"] = airtableData["current-location"].replace(/ /g, ', ');
            }
            // console.log('airtableData', airtableData)
            // console.log('final data to send airtable', finalData);
            // console.log('result@@@@', result)
            airtableData['ProjectId'] = ProjectId;
            airtableData['xmlFormId'] = xmlFormId;
            airtableData['submissionId'] = submissionId;
            airtableData['createdAt'] = createdAt;
            airtableData['instanceId'] = instanceId;
            console.log('airtableData', airtableData)
            //send data to airtable
            const response = await sendToAirtable(airtableData);
            // console.log("response",response);
            //send form submission to database
            // const response = await insertFormSubmissionInDb(projectId, xmlFormId, instanceId, submissionId, createdAt, mappedData);
            // console.log("response",response);
            return "Form submission added successfully!";
        }
        else{
            return "Form not found!";
        }
    }
    catch (err) {
        throw err;
    }
};

// const insertFormSubmissionInDb = (projectId, xmlFormId, instanceId, submissionId, createdAt, data) => {
//     return new Promise((resp, rej) => {
//         try {
//             cloudSql.query
//             `INSERT INTO anaxee_form_submissions (projectId, xmlFormId, instanceId, submissionId, createdAt, data) VALUES (?, ?, ?, ?, ?, ?)`,
//             [projectId, xmlFormId, instanceId, submissionId, createdAt, data],
//             (err, result) => {
//                 if (err) {
//                     console.log("DB_SQL_INSERT_FAILED", new Error(err));
//                     rej(err);
//                 }
//                 console.log("DB_SQL_INSERT_SUCCESS", result);
//                 resp(result);
//             }
//         } catch (err) {
//             console.log("DB_SQL_INSERT_FAILED", new Error(err));
//             rej(err);
//         }
// })
// };

const mapData = async(formFields, result, attachmentUrl) => {
    // const result = {};
    // for (const key in parsedData) {
    //     if (key !== 'meta') {
    //         Object.assign(result, parsedData[key]);
    //     }
    // }
    // const mappedData = {};
    // for(const key in result){
    //     if(formFields[key] === "selectMultiple"){
    //         mappedData[key] = jsonData[key].split(" ");
    //     }
    //     else if(formFields[key] === "binary"){
    //         mappedData[key] = [{ url : attachmentUrl + jsonData[key],
    //                             headers: {
    //                                 'Authorization': `Bearer ${token}`,
    //                                 'Content-Type': 'application/json'
    //                               }
    //                           }]
    //     } 
    //     else{
    //         mappedData[key] = jsonData[key];
    //     }       
    // }
    // console.log('mappedData', mappedData)
    // return mappedData;
};

const getKmlFile = async(map, currentLocation, data) => {
    try{
    // call post api with axios to get url of kml file
    const apiurl = "https://anaxeefunctions.azurewebsites.net/api/kml_File_Script";
    // const apiurl = "http://localhost:7071/api/kml_File_Script";
    const Data = {
        "inputCoordinates": map,
        "currentLocation": currentLocation,
        "data": data
    }
    const config = {
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    };
    const response = await axios.post(apiurl, Data, config);
        console.log('response', response.data)
        const url = response.data.url;
        const fieldSurveyArea = response.data.fieldSurveyArea.Area;
        const attachmentArray = [{ url : url }]
        return {attachmentArray, fieldSurveyArea};
    }
    catch(err){
        console.log('err', err)
        throw err;
    }
};

const getFormDataFromXML = async(formData) => {
    try{
        const { ProjectId, xmlFormId, instanceId } = formData;

        const username = 'ayush@forms.com';
        const password = 'anaxee@1234';
        const url = 'https://odk.anaxee.com/v1/projects/';

        const basicAuthHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        const dataUrl = url + `${ProjectId}/forms/${xmlFormId}/submissions/${instanceId}`;

        const config = {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/xml",
                "Accept": "application/json",

                "Authorization": basicAuthHeader
            }
        };
        const getCreatedDate = await axios.get(dataUrl, config);
        // console.log('getCreatedDate', getCreatedDate.data);
        const createdAt = getCreatedDate.data.createdAt;

        const getXMLData = await axios.get(`${dataUrl}.xml`, config);
        const xmlData = getXMLData.data;
        // console.log('xmlData', getXMLData.data);
        return {data : xmlData, createdAt};
    }
    catch(err){
        console.log('err', err)
        throw err;
    }
};



module.exports = { formSubmissionFunction };