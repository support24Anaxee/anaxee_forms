const { sendToAirtable, insertInAirtable } = require('./airtableFunction');
const { getFormFromDb, sendToDb, updateCaseNumber, getPlotIdCountFromDb } = require('./sqlFunction');
const {XMLParser} = require('fast-xml-parser');
const axios = require("axios");
const { updateCaseStatus, checkStatus } = require('../partnerAppSql');
const { uploadFileToBlob } = require('../azureBlob');
const { InsertRunnerData } = require('../commonFunctions');
const parser = new XMLParser();
const Url = "https://odk.anaxee.com/v1/projects/";
// const token = "k7DfgLEy!J6TrIhidxGxxrj$1r1mIwM8deM4S7fYIHCAUw94moPcKehbuAfMl2Z4";

const vnvGeoMappingFunction = async (formData) => {
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

            const finalParsedData = flattenObject(parsedData);
            console.log('finalParsedData', finalParsedData);

            const airtableData = {};
            for(const key in finalParsedData){
                if(formFields[key] === "selectMultiple"){
                    const values = finalParsedData[key] ? finalParsedData[key].split(" ") : [];
                    airtableData[key.replace(/_/g, ' ')] = values.map(value => keyLabel[key] ? keyLabel[key][value] : value)
                }
                else if(formFields[key.slice(2)] === "selectMultiple"){
                    const values = finalParsedData[key] ? finalParsedData[key].split(" ") : [];
                    airtableData[key.replace(/_/g, ' ')] = values.map(value => keyLabel[key.slice(2)] ? keyLabel[key.slice(2)][value] : value)
                }
                else if(formFields[key] === "binary" && finalParsedData[key] !== '' && finalParsedData !== null && finalParsedData !== undefined && finalParsedData[key]){
                    const url = await uploadFileToBlob(attachmentUrl + finalParsedData[key], finalParsedData[key]);
                    airtableData[key.replace(/_/g, ' ')] = [{ url : url }]
                    airtableData[`link ${key.replace(/_/g, ' ')}`] = url;
                }
                else if(formFields[key.slice(2)] === "binary" && finalParsedData[key] !== '' && finalParsedData !== null && finalParsedData !== undefined && finalParsedData[key]){
                    const url = await uploadFileToBlob(attachmentUrl + finalParsedData[key], finalParsedData[key]);
                    airtableData[key.replace(/_/g, ' ')] = [{ url : url }]
                    airtableData[`link ${key.replace(/_/g, ' ')}`] = url;
                }
                else{
                    if(keyLabel[key.slice(2)]){
                        const value = keyLabel[key.slice(2)] ? keyLabel[key.slice(2)][finalParsedData[key]] : finalParsedData[key];
                        //add two conditions "N/A" and undefined
                        if(value === "N/A" || value === undefined){
                            airtableData[key.replace(/_/g, ' ')] = null;
                        }
                        else{
                            airtableData[key.replace(/_/g, ' ')] = value.toString();
                        }
                        
                    }
                    else {
                    const value = keyLabel[key] ? keyLabel[key][finalParsedData[key]] : finalParsedData[key];
                    //add two conditions "N/A" and undefined
                    if(value === "N/A" || value === undefined){
                        airtableData[key.replace(/_/g, ' ')] = null;
                    }
                    else{
                        airtableData[key.replace(/_/g, ' ')] = value.toString();
                    }
                }
                }       
            }
            //code for kml file
            if(airtableData["Polygon of farm"]){
                const data = {
                    formId : submissionId,
                    StateName: airtableData.state,
                    District: airtableData.district,
                    Tehsil: airtableData.tehsil,
                    Village : airtableData.village,
                    // Khasranum : airtableData['khasra-number'],
                    OwnerName : airtableData['farmer name'],
                    // recordArea: "0.555000000000000", //dummy value
                    farmId : airtableData['farmer id'],
                    PlotId : airtableData['plot id'],
                    KhasraNumber: airtableData.khasra,
                    Rakba: airtableData.rakba,
                    SurveyArea: airtableData['Area of the Farm in Acres'],
                    createdDate: createdAt,
                }
                const geoMap = await getKmlFile(airtableData["Polygon of farm"], airtableData["GPS Location"], data);
                airtableData["KML File URL"] = geoMap;
            }
            if(airtableData["GPS Location"]){
                airtableData["GPS Location"] = airtableData["GPS Location"].replace(/ /g, ', ');
                airtableData["GPS Location"] = `${airtableData["GPS Location"].split(", ")[0]},${airtableData["GPS Location"].split(", ")[1]}`;
            }
            if(airtableData["Do you see any polygon in the field where you are standing"]){
                const value = airtableData["Do you see any polygon in the field where you are standing"].split(">")[1].split("<")[0];
                airtableData["Do you see any polygon in the field where you are standing"] = value;
            }
            //data which will insert in airtable and db in new row
            const newData = {
                "Farmer ID": airtableData["farmer id"],
                "Plot Id": airtableData["plot id"],
                "Farmer / Father Name": airtableData["farmer name"],
                "Mobile No.": airtableData["farmer number"],
                "State Name": airtableData.state,
                "District Name": airtableData.district,
                "Tehsil Name": airtableData.tehsil,
                "Village Name": airtableData.village,
                "Khasra Number": airtableData.khasra,
                "Rabka": airtableData.rakba,
            }
            const runnerData = {
                formId: submissionId,
                createdTime: createdAt,
                projectName: "vnv geomapping",
                runner: airtableData.username,
                number : airtableData.phone,
                districtName: airtableData.district,
                stateName: airtableData.state,
            }
            const Farmer_Id = airtableData['farmer id'];
            const Plot_Id = airtableData['plot id'];
            const plotId_count = await getPlotIdCountFromDb(Plot_Id);
            console.log('plotId_count', plotId_count);
            airtableData["fldWRezwHBgT076gZ"] = plotId_count[0].count + 1;
            //delete all this key from finalParsedData meta_data,state,district,tehsil,village,farmer_id,farmer_name,farmer_number,khasra,rakba,Planted_by_VNV
            delete airtableData.state;
            delete airtableData.district;
            delete airtableData.tehsil;
            delete airtableData.village;    
            delete airtableData["farmer id"];
            delete airtableData["farmer name"];
            delete airtableData["farmer number"];
            delete airtableData.khasra;
            delete airtableData.rakba;
            delete airtableData["Planted by VNV"];
            delete airtableData["planted tree data count"];
            delete airtableData["old tree data count"];
            delete airtableData["vistarak number"];
            delete airtableData?.["case number"];
            delete airtableData["plot id"];
            delete airtableData["vistarak name"];
            delete airtableData["Harvested tree data count"];
            delete airtableData["Prerak Name"]
            delete airtableData["Prerak Number"]

            // airtableData['ProjectId'] = ProjectId;
            airtableData['xmlFormId'] = xmlFormId;
            airtableData['FormId'] = submissionId;
            airtableData['createdAt'] = createdAt;
            airtableData['instanceId'] = instanceId;
            airtableData["KML Editor URL"] = `https://kmlviewer.anaxee.com?FormId=${submissionId}`;
            console.log('airtableData', airtableData);

            //add airtable data in newData
            Object.assign(newData, airtableData);
            console.log('newData', newData);
            //send data to database
            // const dbResponse = await sendToDb(airtableData, Farmer_Id, Plot_Id);
            if(parsedData.meta_data){
                const meta_data_parse = parser.parse(parsedData.meta_data);
                // console.log('meta_data_parse', meta_data_parse);
                const case_number = meta_data_parse.Case_Number;
                console.log('case_number', case_number);
                if(case_number){

                const checkCaseNumberStatus = await checkStatus(case_number);
                if(checkCaseNumberStatus[0].status === 'Submitted'){
                    //insert data in duplicate table
                    const insertDatainDuplicate = await sendToDb(airtableData, Farmer_Id, Plot_Id, true);
                    const updateCaseNumberInDb = await updateCaseNumber(case_number, submissionId, true);
                    return `${submissionId} data inserted successfully in duplicate table`;
                } else{
                    if(meta_data_parse?.Re_Assign === "yes" || meta_data_parse?.Re_Assign === "Yes"){
                        airtableData.username_1 = airtableData.username;
                        airtableData.phone_1 = airtableData.phone;
                        airtableData["Reassigned Visit Date"] = airtableData["Date and Time of Visit"];
                        airtableData["Polygon of farm_1"] = airtableData["Polygon of farm"];
                        airtableData["Polygon of the farm New"] = airtableData["Polygon of farm"];
                        airtableData["Area of the Farm in Acres_1"] = airtableData["Area of the Farm in Acres"];
                        airtableData["Area of the Farm in Acres New"] = airtableData["Area of the Farm in Acres"];
                        airtableData["Perimeter of Farm_1"] = airtableData["Perimeter of Farm"];
                        airtableData["Perimeter of Farm New"] = airtableData["Perimeter of Farm"];
                        airtableData["Photo of Farm_1"] = airtableData["Photo of Farm"];
                        airtableData["Any Remark_1"] = airtableData["Any Remark"] ? airtableData["Any Remark"] : null;

                        //delete key from airtableData
                        delete airtableData.username;
                        delete airtableData.phone;
                        delete airtableData["Date and Time of Visit"];
                        delete airtableData["Polygon of farm"];
                        delete airtableData["Area of the Farm in Acres"];
                        delete airtableData["Perimeter of Farm"];
                        delete airtableData["Photo of Farm"];
                        delete airtableData["Any Remark"];

                        // console.log('airtableData when Re Assign is Yes', airtableData);
                    }
                    //insert data in main table
                    const insertDatainDb = await sendToDb(airtableData, Farmer_Id, Plot_Id, false);
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
                    const updateInAirtable = await sendToAirtable(airtableData, Plot_Id);
                    return `${submissionId} data inserted successfully`;
                }
                } else{
                    //insert data in main table
                    const insertDatainDb = await sendToDb(newData, Farmer_Id, Plot_Id, false);
                    InsertRunnerData(runnerData)
                    .then((res) => {
                        console.log("INSERTED IN RUNNER DATA", res);
                    })
                    .catch((err) => {
                      console.log("RUNNER DATA INSERTION", err);
                    });
                    const insertDataInAirtable = await insertInAirtable(newData);
                    return `${submissionId} data inserted successfully`;
                }
            } else{
                console.log('in else condition');
                //insert data in main table
                const insertDatainDb = await sendToDb(newData, Farmer_Id, Plot_Id, false);
                InsertRunnerData(runnerData)
                .then((res) => {
                    console.log("INSERTED IN RUNNER DATA", res);
                })
                .catch((err) => {
                  console.log("RUNNER DATA INSERTION", err);
                });
                const insertDataInAirtable = await insertInAirtable(newData);
                return `${submissionId} data inserted successfully`;
            }
            // const response = await sendToAirtable(airtableData, Plot_Id);

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
        if(key !== 'meta' && key !== 'meta_data'){
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


module.exports = { vnvGeoMappingFunction };