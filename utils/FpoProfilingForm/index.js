const { insertInAirtable } = require('./airtableFunction');
const { getFormFromDb, sendToDb, updateAirtableIdInDb } = require('./sqlFunction');
const {XMLParser} = require('fast-xml-parser');
const axios = require("axios");
const { uploadFileToBlob } = require('../azureBlob');
const { InsertRunnerData } = require('../commonFunctions');
const parser = new XMLParser();
const Url = "https://odk.anaxee.com/v1/projects/";

const FpoProfilingFormFunction = async (formData) => {
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
            
            const dbData = {};
            const airtableData = {};
            for(const key in finalParsedData){
                if(formFields[key] === "selectMultiple"){
                    const values = finalParsedData[key] ? finalParsedData[key].split(" ") : [];
                    dbData[key.replace(/_/g, ' ')] = values.map(value => keyLabel[key] ? keyLabel[key][value] : value)
                    airtableData[airtableFields[key]] = values.map(value => keyLabel[key] ? keyLabel[key][value] : value)
                }
                else if(formFields[key.slice(2)] === "selectMultiple"){
                    const values = finalParsedData[key] ? finalParsedData[key].split(" ") : [];
                    dbData[key.replace(/_/g, ' ')] = values.map(value => keyLabel[key.slice(2)] ? keyLabel[key.slice(2)][value] : value)
                    airtableData[airtableFields[key]] = values.map(value => keyLabel[key.slice(2)] ? keyLabel[key.slice(2)][value] : value)
                }
                else if(formFields[key] === "binary"){
                    const url = await uploadFileToBlob(attachmentUrl + finalParsedData[key], finalParsedData[key]);
                    dbData[key.replace(/_/g, ' ')] = [{ url : url }]
                    airtableData[airtableFields[key]] = [{ url : url }]

                    dbData[`link ${key.replace(/_/g, ' ')}`] = url;
                    airtableData[`${airtableFields['link_'+key]}`] = url;
                }
                else if(formFields[key.slice(2)] === "binary"){
                    const url = await uploadFileToBlob(attachmentUrl + finalParsedData[key], finalParsedData[key]);
                     dbData[key.replace(/_/g, ' ')] = [{ url : url }]
                     airtableData[airtableFields[key]] = [{ url : url }]

                     dbData[`link ${key.replace(/_/g, ' ')}`] = url;
                     airtableData[`${airtableFields['link_'+key]}`] = url;
                }
                else{
                    if(keyLabel[key.slice(2)]){
                        const value = keyLabel[key.slice(2)] ? keyLabel[key.slice(2)][finalParsedData[key]] : finalParsedData[key];
                        //add two conditions "N/A" and undefined
                        if(value === "N/A" || value === undefined){
                            dbData[key.replace(/_/g, ' ')] = null;
                            airtableData[airtableFields[key]] = null;
                        }
                        else{
                            dbData[key.replace(/_/g, ' ')] = value.toString();
                            airtableData[airtableFields[key]] = value.toString();
                        }
                        
                    }
                    else {
                    const value = keyLabel[key] ? keyLabel[key][finalParsedData[key]] : finalParsedData[key];
                    //add two conditions "N/A" and undefined
                    if(value === "N/A" || value === undefined){
                        dbData[key.replace(/_/g, ' ')] = null;
                        airtableData[airtableFields[key]] = null;
                    }
                    else{
                        dbData[key.replace(/_/g, ' ')] = value.toString();
                        airtableData[airtableFields[key]] = value.toString();
                    }
                }
                }       
            }
            if(airtableData["fldWIGRJgDe9VCzkO"]){
                airtableData["fldWIGRJgDe9VCzkO"] = airtableData["fldWIGRJgDe9VCzkO"].replace(/ /g, ', ');
                dbData["GPS Location"] = airtableData["fldWIGRJgDe9VCzkO"];
            }
            const runnerData = {
                formId: submissionId,
                createdTime: createdAt,
                projectName: "FPO Profiling Form",
                runner: airtableData["fldBaSvEujszEyUtr"],
                number : airtableData["fldZNhRzGTxaQJMBm"],
                districtName: airtableData["fld67AEiNEr7JCcqM"],
                stateName: airtableData["fld9OhK1jDfwr7YNi"],
                //extract lat long from GPS Location 22.7535275, 75.8654391, 520.4000244140625, 14.962
                GPS_Location: airtableData["fldWIGRJgDe9VCzkO"] ? `${airtableData["fldWIGRJgDe9VCzkO"].split(", ")[0]},${airtableData["fldWIGRJgDe9VCzkO"].split(", ")[1]}` : null,
                Form_Filled_time: airtableData["fldlJZ2PR1fPSXy7z"],
            }
            
            airtableData['fldJXCIxZHeQLnjn5'] = submissionId;
            airtableData['fldmQMs4Vjh8eFK2i'] = createdAt;
            airtableData['fldPbH1x38VT4qrKL'] = instanceId;

            dbData['FormId'] = submissionId;
            dbData['createdAt'] = createdAt;
            dbData['instanceId'] = instanceId;

            
            console.log('airtableData', airtableData);
            console.log('dbData', dbData);


            //insert data in main table
            const insertDatainDb = await sendToDb(dbData, false);
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


module.exports = { FpoProfilingFormFunction };