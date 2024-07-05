const { insertInAirtable } = require('./airtableFunction');
const { getFormFromDb, sendToDb, updateAirtableIdInDb } = require('./sqlFunction');
const {XMLParser} = require('fast-xml-parser');
const axios = require("axios");
const { uploadFileToBlob } = require('../azureBlob');
const { InsertRunnerData } = require('../commonFunctions');
const parser = new XMLParser();
const Url = "https://odk.anaxee.com/v1/projects/";


const IMPCAPlantationMonitoringFunction = async (formData) => {
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
            // console.log('jsonData------------------', jsonData)
            const parsedData = jsonData.data;
            // console.log('parsedData', parsedData);
            if(parsedData.Field_Bund_Images_count === 1){
                const Field_Bund_Images = parsedData.Field_Bund_Images;
                for(const key in Field_Bund_Images){
                    parsedData.Field_Bund_Images[`1_${key}`] = Field_Bund_Images[key];
                    delete parsedData.Field_Bund_Images[key];
                }
            }
            if(parsedData.Plantation_Site_Images_count === 1){
                const Plantation_Site_Images = parsedData.Plantation_Site_Images;
                for(const key in Plantation_Site_Images){
                    parsedData.Plantation_Site_Images[`1_${key}`] = Plantation_Site_Images[key];
                    delete parsedData.Plantation_Site_Images[key];
                }
            }      
            if(parsedData.Field_Detail_and_Images_count === 1){
                const Field_Detail_and_Images = parsedData.Field_Detail_and_Images;
                for(const key in Field_Detail_and_Images){
                    parsedData.Field_Detail_and_Images[`1_${key}`] = Field_Detail_and_Images[key];
                    delete parsedData.Field_Detail_and_Images[key];
                }
            }      

            const finalParsedData = flattenObject(parsedData);
            delete finalParsedData.Field_Bund_Images_count;
            delete finalParsedData.Plantation_Site_Images_count;
            delete finalParsedData.Field_Detail_and_Images_count;
            

            // finalParsedData["Which_Brands_of_Seeds_Pesticides_etc_you_purchase_for_mentioned_crops"] = finalParsedData["Which_Brands_of_Seeds_Pesticides_etc_you_purchase_for_mentioned_crops"].toString();
            console.log('finalParsedData', finalParsedData);
            
            const keyPrefixRegex = /^\d+_/;
            const airtableData = {};
            for(const key in finalParsedData){
                
                const baseKey = key.replace(keyPrefixRegex, ''); // Remove the numeric prefix followed by an underscore
                const formattedKey = key.replace(/_/g, ' '); // Replace underscores with spaces

                if(formFields[baseKey] === "selectMultiple"){
                    const values = finalParsedData[key] ? finalParsedData[key].split(" ") : [];
                    airtableData[formattedKey] = values.map(value => keyLabel[baseKey] ? keyLabel[baseKey][value] : value)
                }
                else if(formFields[baseKey] === "binary"){
                    const url = await uploadFileToBlob(attachmentUrl + finalParsedData[key], finalParsedData[key]);
                    airtableData[formattedKey] = [{ url : url }]
                    airtableData[`link ${formattedKey}`] = url;
                }
                else{
                    const value = keyLabel[baseKey] ? keyLabel[baseKey][finalParsedData[key]] : finalParsedData[key];
                    //add two conditions "N/A" and undefined
                    if(value === "N/A" || value === undefined){
                        airtableData[formattedKey] = null;
                    }
                    else{
                        airtableData[formattedKey] = value.toString();
                    }
                }       
            }
            if(airtableData["Gps Location"]){
                airtableData["Gps Location"] = airtableData["Gps Location"].replace(/ /g, ', ');
                airtableData["Gps Location"] = `${airtableData["Gps Location"].split(", ")[0]},${airtableData["Gps Location"].split(", ")[1]}`;
            }
            if(finalParsedData.Filled_by_Email){
                airtableData["Filled by Email"] = airtableData["Filled by Email"].replace(/&#64;/g, '@');
            }
            if(airtableData["Labour start to work"]){
                airtableData["Labour start to work"] = airtableData["Labour start to work"].split(':00')[0];
            }
            const runnerData = {
                formId: submissionId,
                createdTime: createdAt,
                projectName: "IMPCA Plantation Monitoring in Real Time",
                runner: airtableData["Filled by name"],
                number : airtableData["Filled by number"],
                districtName: airtableData["District"],
                stateName: airtableData["State"],
                //extract lat long from GPS Location 22.7535275, 75.8654391, 520.4000244140625, 14.962
                GPS_Location: airtableData["Gps Location"],
                Form_Filled_time: airtableData["Filled Time"],
                odkProjectId: ProjectId,
                table_name: "impca_plantation_monitoring_real_time_data"
            }
            
            airtableData['FormId'] = submissionId;
            airtableData['createdAt'] = createdAt;
            airtableData['instanceId'] = instanceId;

            
            console.log('airtableData', airtableData);


            //insert data in main table
            const insertDatainDb = await sendToDb(airtableData);
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
          Object.assign(result, flattenObject(item, `${index + 1}_`));
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


module.exports = { IMPCAPlantationMonitoringFunction };