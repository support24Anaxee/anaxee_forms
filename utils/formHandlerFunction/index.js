const { checkFormExists, updateFormInDb, insertFormInDb, insertKeyLabelInDb, updateKeyLabelInDb } = require("./sqlFunction");

const formHandlerFunction = async (form) => {
    try{
        if(!form){
            return "Form is empty!";
        }
        //check if form has contain a key which name is keyLabel
        if(form.keyLabel){
            const { projectId, xmlFormId, keyLabel } = form;
            const formExists = await checkFormExists(projectId, xmlFormId);
            if(formExists.length > 0){
                //update form in database
                const response = await updateKeyLabelInDb(projectId, xmlFormId, keyLabel);
                // console.log("response",response);
                return "Form updated successfully!";
            }
            else{
                //send form to database
                const response = await insertKeyLabelInDb(projectId, xmlFormId, keyLabel);
                // console.log("response",response);
                return "Form added successfully!";
            }
        }
        else {
        const { projectId, xmlFormId, fields } = form;
        const mappedFields = await mapFields(fields);
        console.log('mappedFields', mappedFields)
        //check if form already exists by projectId and xmlFormId
        const formExists = await checkFormExists(projectId, xmlFormId);
        // console.log('formExists', formExists)
        if(formExists.length > 0){
            //update form in database
            const response = await updateFormInDb(projectId, xmlFormId, mappedFields);
            // console.log("response",response);
            return "Form updated successfully!";
        }
        else{
            console.log('inserting form')
            //send form to database
            const response = await insertFormInDb(projectId, xmlFormId, mappedFields);
            // console.log("response",response);
            return "Form added successfully!";
        }
    }
    }
    catch(err){
        throw err;
    }
};


const mapFields = async(fields) => {
    const fieldMap = {};
    await fields.forEach((field) => {
        if (field.type !== 'structure') {
            const fieldName = field.name.replace('/', '_');
            fieldMap[fieldName] = field.selectMultiple && field.type === 'string' ? 'selectMultiple' : field.type;
          }
        });
    return fieldMap;
};

module.exports = { formHandlerFunction };