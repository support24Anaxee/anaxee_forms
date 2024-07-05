const { insertInAirtable } = require('./airtableFunction');
const { getFormFromDb, sendToDb, updateCaseNumber, updateAirtableIdInDb } = require('./sqlFunction');
const {XMLParser} = require('fast-xml-parser');
const axios = require("axios");
const { updateCaseStatus, checkStatus } = require('../partnerAppSql');
const { uploadFileToBlob } = require('../azureBlob');
const { InsertRunnerData } = require('../commonFunctions');
const parser = new XMLParser();
const Url = "https://odk.anaxee.com/v1/projects/";

const SabseKhasSarpanchFunction = async (formData) => {
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
            const airtableFields = JSON.parse(form[0].airtable_key_mapping);
            const jsonData = parser.parse(data);
            // console.log('jsonData------------------', jsonData)
            const parsedData = jsonData.data;
            // console.log('parsedData', parsedData);

            const finalParsedData = flattenObject(parsedData);
            console.log('finalParsedData', finalParsedData);
            
            const airtableData = {};
            for(const key in finalParsedData){
                if(formFields[key] === "selectMultiple"){
                    const values = finalParsedData[key] ? finalParsedData[key].split(" ") : [];
                    // airtableData[key.replace(/_/g, ' ')] = values.map(value => keyLabel[key] ? keyLabel[key][value] : value)
                    airtableData[airtableFields[key]] = values.map(value => keyLabel[key] ? keyLabel[key][value] : value)
                }
                else if(formFields[key.slice(2)] === "selectMultiple"){
                    const values = finalParsedData[key] ? finalParsedData[key].split(" ") : [];
                    // airtableData[key.replace(/_/g, ' ')] = values.map(value => keyLabel[key.slice(2)] ? keyLabel[key.slice(2)][value] : value)
                    airtableData[airtableFields[key]] = values.map(value => keyLabel[key.slice(2)] ? keyLabel[key.slice(2)][value] : value)
                }
                else if(formFields[key] === "binary"){
                    const url = await uploadFileToBlob(attachmentUrl + finalParsedData[key], finalParsedData[key]);
                    // airtableData[key.replace(/_/g, ' ')] = [{ url : url }]
                    airtableData[airtableFields[key]] = [{ url : url }]

                    // airtableData[`link ${key.replace(/_/g, ' ')}`] = url;
                    airtableData[`link ${airtableFields[key]}`] = url;
                }
                else if(formFields[key.slice(2)] === "binary"){
                    const url = await uploadFileToBlob(attachmentUrl + finalParsedData[key], finalParsedData[key]);
                     // airtableData[key.replace(/_/g, ' ')] = [{ url : url }]
                     airtableData[airtableFields[key]] = [{ url : url }]

                     // airtableData[`link ${key.replace(/_/g, ' ')}`] = url;
                     airtableData[`link ${airtableFields[key]}`] = url;
                }
                else{
                    if(keyLabel[key.slice(2)]){
                        const value = keyLabel[key.slice(2)] ? keyLabel[key.slice(2)][finalParsedData[key]] : finalParsedData[key];
                        //add two conditions "N/A" and undefined
                        if(value === "N/A" || value === undefined){
                            // airtableData[key.replace(/_/g, ' ')] = null;
                            airtableData[airtableFields[key]] = null;
                        }
                        else{
                            // airtableData[key.replace(/_/g, ' ')] = value.toString();
                            airtableData[airtableFields[key]] = value.toString();
                        }
                        
                    }
                    else {
                    const value = keyLabel[key] ? keyLabel[key][finalParsedData[key]] : finalParsedData[key];
                    //add two conditions "N/A" and undefined
                    if(value === "N/A" || value === undefined){
                        // airtableData[key.replace(/_/g, ' ')] = null;
                        airtableData[airtableFields[key]] = null;
                    }
                    else{
                        // airtableData[key.replace(/_/g, ' ')] = value.toString();
                        airtableData[airtableFields[key]] = value.toString();
                    }
                }
                }       
            }
            if(airtableData["GPS Location"]){
                airtableData["GPS Location"] = airtableData["GPS Location"].replace(/ /g, ', ');
            }
            const runnerData = {
                formId: submissionId,
                createdTime: createdAt,
                projectName: "Sabse Khas Sarpanch",
                runner: airtableData.username,
                number : airtableData.phone,
                districtName: airtableData.District,
                stateName: "Madhya Pradesh",
            }
            
            airtableData['xmlFormId'] = xmlFormId;
            airtableData['FormId'] = submissionId;
            airtableData['createdAt'] = createdAt;
            airtableData['instanceId'] = instanceId;

            
            console.log('airtableData', airtableData);

            if(parsedData.meta_data){
                const meta_data_parse = parser.parse(parsedData.meta_data);
                // console.log('meta_data_parse', meta_data_parse);
                const case_number = meta_data_parse.Case_Number;
                console.log('case_number', case_number);
                if(case_number){
                    airtableData["Case Number"] = case_number;

                const checkCaseNumberStatus = await checkStatus(case_number);
                if(checkCaseNumberStatus[0].status === 'Submitted'){
                    //insert data in duplicate table
                    const insertDatainDuplicate = await sendToDb(airtableData, true);
                    const updateCaseNumberInDb = await updateCaseNumber(case_number, submissionId, true);
                    return `${submissionId} data inserted successfully in duplicate table`;
                } else{
                    //insert data in main table
                    const insertDatainDb = await sendToDb(airtableData, false);
                    const updateStatus  = await updateCaseStatus(case_number);
                    console.log('updateStatus', updateStatus);
                    InsertRunnerData(runnerData)
                    .then((res) => {
                        console.log("INSERTED IN RUNNER DATA", res);
                    })
                    .catch((err) => {
                      console.log("RUNNER DATA INSERTION", err);
                    });
                    const updateCaseNumberInDb = await updateCaseNumber(case_number, submissionId, false);
                    console.log('updateCaseNumberInDb', updateCaseNumberInDb);
                    const insertDatainAirtable = await insertInAirtable(airtableData);
                    //update airtable id in db
                    const updateAirtableId = await updateAirtableIdInDb(insertDatainAirtable[0].id, submissionId);
                    return `${submissionId} data inserted successfully`;
                }
                } else{
                    //insert data in main table
                    const insertDatainDb = await sendToDb(airtableData, false);
                    InsertRunnerData(runnerData)
                    .then((res) => {
                        console.log("INSERTED IN RUNNER DATA", res);
                    })
                    .catch((err) => {
                      console.log("RUNNER DATA INSERTION", err);
                    });
                    const insertDataInAirtable = await insertInAirtable(airtableData);
                    const updateAirtableId = await updateAirtableIdInDb(insertDataInAirtable[0].id, submissionId);
                    return `${submissionId} data inserted successfully`;
                }
            } else{
                console.log('in else condition');
                //insert data in main table
                const insertDatainDb = await sendToDb(airtableData, false);
                InsertRunnerData(runnerData)
                .then((res) => {
                    console.log("INSERTED IN RUNNER DATA", res);
                })
                .catch((err) => {
                  console.log("RUNNER DATA INSERTION", err);
                });
                const insertDataInAirtable = await insertInAirtable(airtableData);
                const updateAirtableId = await updateAirtableIdInDb(insertDataInAirtable[0].id, submissionId);
                return `${submissionId} data inserted successfully`;
            }
        }
        else{
            throw "Form not found in database or not integrated with airtable";
        }
        
    } catch (error) {
        throw error;
    }
};


const flattenObject = (obj, parentKey = '') => {
    const result = {};
  
    for (const key in obj) {
        if(key !== 'meta' && key !== 'meta_data' && obj[key] !== null && obj[key] !== undefined && obj[key] !== ''){
      const newKey = parentKey ? `${parentKey}${key}` : key;
  
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(result, flattenObject(obj[key]));
      } else if (Array.isArray(obj[key])) {
        obj[key].forEach((item, index) => {
          Object.assign(result, flattenObject(item, index === 0 ? '' : `${index + 1}_`));
        });
      } else {
        result[newKey] = obj[key];
      }
    }
    }
  
    return result;
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


module.exports = { SabseKhasSarpanchFunction };