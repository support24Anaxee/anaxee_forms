const { BlobServiceClient } = require("@azure/storage-blob");
const axios = require("axios");

const AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=anaxeeforms;AccountKey=an5Y1iuKc5CcVLp+9a1MdyCOtXKkqztFVVD/ZgjXXJ+CT8Blb/TqtFvc9Pa5sK84zlRWbgFyCHw5+AStjAq4Mw==;EndpointSuffix=core.windows.net";
const containerName = "media";

const username = 'ayush@forms.com';
const password = 'anaxee@1234';


const uploadFileToBlob = async (url, fileName, retryCount = 3) => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    try {
        //get image from url and convert to blob with basic auth
        const basicAuthHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        const response = await axios.get(url, {responseType: 'arraybuffer',
            headers: {
                "Authorization": basicAuthHeader
            }
        });
        // console.log("response", response);
        const arrayBuffer = response.data;
        // const blob = Buffer.from(arrayBuffer, 'binary');
        const uploadBlobResponse = await blockBlobClient.upload(arrayBuffer, arrayBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: response.headers['content-type'],
            }
        });
        //url of uploaded image
        const urlResponse = blockBlobClient.url;
        console.log("urlResponse", urlResponse)
        return urlResponse;
    } catch (err) {
        console.log("uploadFileToBlob", err);
        //if error is 404 then wait for 10 seconds and try again and return url
        if (err.response && err.response.status === 404 && retryCount > 0) {
            // Retry after 10 seconds
            await new Promise(resolve => setTimeout(resolve, 10000));
            // Retry with reduced retry count
            return await uploadFileToBlob(url, fileName, retryCount - 1);
        }
        throw err;
    }
};

module.exports = {
    uploadFileToBlob
};