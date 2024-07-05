const { insertInAirtable } = require('./airtableFunction');
const { getFormFromDb } = require('./sqlFunction');
const {XMLParser} = require('fast-xml-parser');
const axios = require("axios");
const { uploadFileToBlob } = require('../azureBlob');
const parser = new XMLParser();
const Url = "https://odk.anaxee.com/v1/projects/";

const DemoFormFunction = async (formData) => {
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
                    airtableData[`${airtableFields['link_'+key]}`] = url;
                }
                else if(formFields[key.slice(2)] === "binary"){
                    const url = await uploadFileToBlob(attachmentUrl + finalParsedData[key], finalParsedData[key]);
                     // airtableData[key.replace(/_/g, ' ')] = [{ url : url }]
                     airtableData[airtableFields[key]] = [{ url : url }]

                     // airtableData[`link ${key.replace(/_/g, ' ')}`] = url;
                     airtableData[`${airtableFields['link_'+key]}`] = url;
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

            if(finalParsedData["Mapping_Of_Farm"]){
                const data = {
                    formId : submissionId,
                    StateName: finalParsedData.State,
                    District: finalParsedData.District,
                    Tehsil: finalParsedData.Tehsil,
                    Village : "",
                    OwnerName : finalParsedData['Farmer_Name'],
                    farmId : "",
                    PlotId : "",
                    KhasraNumber: "",
                    Rakba: "",
                    SurveyArea: finalParsedData['Farm_Area'],
                    createdDate: createdAt,
                }
                const geoMap = await getKmlFile(finalParsedData["Mapping_Of_Farm"], "00.00, 00.00, 00.00, 00.00", data);
                airtableData["fldX7CI5HzHzq5Jg2"] = geoMap;
            }


            airtableData["fldjN4dihMMJZZxMo"] = await countCoordinates(finalParsedData["Mapping_Of_Farm"]);
            airtableData["fldvi7ryz6VXuM0hu"] = `https://kmlviewer.anaxee.com/demo?FormId=${submissionId}`;
            
            airtableData['fldFsgwrQBDAwQFvi'] = submissionId;
            airtableData['fldGKZlJhJgLvy2uX'] = createdAt;
            airtableData['fldsQh8qB561B47nb'] = instanceId;

            
            console.log('airtableData', airtableData);
            const insertDataInAirtable = await insertInAirtable(airtableData);
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
        // const fieldSurveyArea = response.data.fieldSurveyArea.Area;
        // const attachmentArray = [{ url : url }]
        return url;
    }
    catch(err){
        console.log('err', err)
        return  ""; //changed it from throw err to return "" because it was throwing error in case of kml file
    }
};

async function countCoordinates(str) {
    // Split the string by semicolon to get individual coordinate sets
    var coordinateSets = str.split(';');

    // Return the count of coordinate sets
    return coordinateSets.length;
};


module.exports = { DemoFormFunction };