const fs = require('fs');
const AWS = require('aws-sdk');
const OpenAI = require("openai");
const dotenv = require('dotenv');
const axios = require('axios');
const cors = require("cors");
const express = require('express');
const multer = require('multer');
const db = require('./connection');

const Contract = require('./contractModel');
const ExtractedContract = require('./ExtractedContractModel')
const userModel = require('./userModel');

const app = express();
app.use(express.json());
dotenv.config();
app.use(cors());

const tableCsv = "someval";
let lines = "someval";

// Display information about a block
function displayBlockInfo(block) {
    console.log("Block Id: " + block.Id);
    console.log("Type: " + block.BlockType);
    if ('EntityTypes' in block) {
        console.log('EntityTypes: ' + JSON.stringify(block.EntityTypes));
    }

    if ('Text' in block) {
        console.log("Text: " + block.Text);
    }

    if (block.BlockType !== 'PAGE') {
        console.log("Confidence: " + (block.Confidence ? block.Confidence.toFixed(2) + "%" : "N/A"));
    }

    console.log();
}

// Generate CSV representation of tables detected in the document
function getTableCsvResults(blocks) {
  console.log(blocks);

  const blocksMap = {};
  const tableBlocks = [];
  for (const block of blocks) {
      blocksMap[block.Id] = block;
      if (block.BlockType === "TABLE") {
          tableBlocks.push(block);
      }
  }

  if (tableBlocks.length <= 0) {
      return "<b> NO Table FOUND </b>";
  }

  let csv = '';
  for (let index = 0; index < tableBlocks.length; index++) {
      const tableResult = tableBlocks[index];
      csv += generateTableCsv(tableResult, blocksMap, index + 1);
      csv += '\n\n';
  }

  return csv;
}

// Generate CSV representation for a table
function generateTableCsv(tableResult, blocksMap, tableIndex) {
  const rows = getRowsColumnsMap(tableResult, blocksMap);

  const tableId = 'Table_' + tableIndex;

  let csv = 'Table: ' + tableId + '\n\n';

  for (const [rowIndex, cols] of Object.entries(rows)) {
      for (const [colIndex, text] of Object.entries(cols)) {
          csv += text + ",";
      }
      csv += '\n';
  }

  csv += '\n\n\n';
  return csv;
}

// Map rows and columns of a table
function getRowsColumnsMap(tableResult, blocksMap) {
  const rows = {};
  for (const relationship of tableResult.Relationships) {
      if (relationship.Type === 'CHILD') {
          for (const childId of relationship.Ids) {
              try {
                  const cell = blocksMap[childId];
                  if (cell.BlockType === 'CELL') {
                      const rowIndex = cell.RowIndex;
                      const colIndex = cell.ColumnIndex;
                      if (!rows[rowIndex]) {
                          rows[rowIndex] = {};
                      }
                      rows[rowIndex][colIndex] = getText(cell, blocksMap);
                  }
              } catch (error) {
                  console.error("Error extracting Table data:", error);
              }
          }
      }
  }
  return rows;
}

// Get text from a block
function getText(result, blocksMap) {
  let text = '';
  if ('Relationships' in result) {
      for (const relationship of result.Relationships) {
          if (relationship.Type === 'CHILD') {
              for (const childId of relationship.Ids) {
                  try {
                      const word = blocksMap[childId];
                      if (word.BlockType === 'WORD') {
                          text += word.Text + ' ';
                      }
                      if (word.BlockType === 'SELECTION_ELEMENT' && word.SelectionStatus === 'SELECTED') {
                          text += 'X ';
                      }
                  } catch (error) {
                      console.error("Error extracting Table data:", error);
                  }
              }
          }
      }
  }
  return text;
}

// Start document analysis job
function startJob(client, s3BucketName, objectName) {
    return new Promise((resolve, reject) => {
        client.startDocumentAnalysis({
            DocumentLocation: { S3Object: { Bucket: s3BucketName, Name: objectName } },
            FeatureTypes: ["TABLES"]
        }, (err, data) => {
            if (err) reject(err);
            else resolve(data.JobId);
        });
    });
}

// Check if document analysis job is complete
function isJobComplete(client, jobId) {
    return new Promise((resolve, reject) => {
        function checkJobStatus() {
            client.getDocumentAnalysis({ JobId: jobId }, (err, data) => {
                if (err) reject(err);
                else {
                    console.log("Job status: " + data.JobStatus);
                    if (data.JobStatus === "IN_PROGRESS") {
                        setTimeout(checkJobStatus, 1000);
                    } else {
                        resolve(data);
                    }
                }
            });
        }
        checkJobStatus();
    });
}

// Get document analysis job results
function getJobResults(client, jobId) {
    return new Promise((resolve, reject) => {
        const pages = [];
        function getResults(nextToken) {
            client.getDocumentAnalysis({ JobId: jobId, NextToken: nextToken }, (err, data) => {
                if (err) reject(err);
                else {
                    pages.push(data);
                    console.log("Resultset page received: " + pages.length);
                    if (data.NextToken) {
                        setTimeout(() => getResults(data.NextToken), 1000);
                    } else {
                        resolve(pages);
                    }
                }
            });
        }
        getResults(null);
    });
}

async function extract_text_from_pdf(pdfFile) {
    const s3BucketName = "textextractbucket17";
    const s3Client = new AWS.S3({
        accessKeyId: "AKIA4MTWLND6TG4GPBYZ",
        secretAccessKey: "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"
    });
    try {
        await s3Client.upload({ Bucket: s3BucketName, Key: pdfFile, Body: fs.createReadStream(pdfFile) }).promise();
    } catch (error) {
        console.error("Error uploading file to S3:", error);
        return;
    }

    const textractClient = new AWS.Textract({
        region: "eu-west-1",
        accessKeyId: "AKIA4MTWLND6TG4GPBYZ",
        secretAccessKey: "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"
    });

    const jobId = await startJob(textractClient, s3BucketName, pdfFile);
    console.log("Started job with id: " + jobId);
    const jobResult = await isJobComplete(textractClient, jobId);
    const response = await getJobResults(textractClient, jobId);

    if (fs.existsSync('tables.csv')) fs.unlinkSync('tables.csv');
    if (fs.existsSync('temp.txt')) fs.unlinkSync('temp.txt');

    for (const resultPage of response) {
        const blocks = resultPage.Blocks;
        const tableCsv = getTableCsvResults(blocks);
        const outputFileName = "tables.csv";
        fs.appendFileSync(outputFileName, tableCsv);
        //console.log('Detected Document Text');
        //console.log('Pages: ' + resultPage.DocumentMetadata.Pages);
        //console.log('OUTPUT TO CSV FILE: ' + outputFileName);
        for (const block of blocks) {
            displayBlockInfo(block);
            //console.log();
        }
    }

    lines = [];
    for (const resultPage of response) {
        for (const item of resultPage.Blocks) {
            if (item.BlockType === "LINE") {
                //console.log(item.Text);
                lines.push(item.Text);
            }
        }
    }
    lines = lines.join('\n');
    fs.writeFileSync('temp.txt', lines);
}
//const promp = "Please analyze the following high school transcript text and the associated table data to extract the student's name, date of birth, GPA, and course grades with credits. Format the extracted information as JSON key-value pairs. Ensure that the extracted data is accurate and neatly organized for each course listed";


const openai = new OpenAI({
  apiKey:"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"
});
// Function to make a request to OpenAI API
async function extract_results(prompt) {

  const lines = fs.readFileSync('temp.txt', 'utf8');
  const tableCsv = fs.readFileSync('tables.csv', 'utf8');

  // Format the prompt
  const formattedPrompt = `
Extract the following information from the provided sources and format the output in JSON:

This is what you need to extract from the transcript:
${prompt}

The sources available for extraction are a raw text file containing the extracted text from the transcript and a CSV file containing all tables from the transcript. 
The CSV file is having more accurate information, so compare the extractions from both raw text data and CSV Table data, CSV table data must be present.

Raw Text data: ${lines}

Extract the information from the raw text file. Search for patterns or keywords that indicate the relevant details such as name, branch, course code, and GPA. If necessary, use regular expressions or specific keywords to identify the required information.

CSV Table data: ${tableCsv}

Extract the information from the CSV file. Look for columns or fields that correspond to the requested information, such as student names, course codes, GPAs, etc. Match the values with the user-provided inputs to ensure accuracy.

Output Format:

Format the extracted information into a JSON object as below:

${prompt}

If any information cannot be found or extracted from either source, indicate it as null in the JSON output.
`;


  console.log(formattedPrompt)
  try {
    const response = await openai.chat.completions.create({
      messages:[
                
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": formattedPrompt},
    
],
      model: "gpt-3.5-turbo-0125",
      max_tokens: 2048,
      temperature: 0,
      response_format:{"type": "json_object"},
    });
  
    const res = response.choices[0].message.content;
    return res;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads/') // specify the directory where uploaded files will be stored
  },
  filename: function (req, file, cb) {
      cb(null, file.originalname) // use the original file name for storing
  }
});

const upload = multer({ storage: storage });


const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_ACCESS_SECRETKEY,
  region: process.env.AWS_REGION,
});

const S3Upload = async (file,fileContent) => {
  const params = {
    Key: `${file.originalname}`,
    Bucket: process.env.AWS_BUCKET_NAME,
    ContentType: file.mimetype,
    Body: fileContent,
    ACL: "public-read",
  };
  return await s3.upload(params).promise();
};

  app.post('/upload', upload.single('file'), async (req, res) => {
    try {
      const filePath = req.file.path;
      const fileContent = fs.readFileSync(filePath);
      const {contractId,userId} = req.body;
      const contr = await Contract.findById(contractId);
      const fC = await S3Upload(req.file,fileContent);
      const fileS3Url = fC.Location;
      console.log(contr.prompt);
      const result = await extract_text_from_pdf(filePath); // Call function to extract text from PDF
      const extractedData = await extract_results(contr.prompt);
      const extractedContractData = new ExtractedContract({
        data:extractedData,
        contractId:contractId,
        UserId:userId,
        fileS3Url:fileS3Url,
        fileName:req.file.originalname,
      });
      await extractedContractData.save();
      res.status(201).json({message:"uploaded sucessfulluy",extractedData:extractedContractData}); 
    }
    catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  const PORT = process.env.PORT || 9000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });