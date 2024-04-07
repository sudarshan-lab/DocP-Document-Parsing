const fs = require('fs');
const express = require('express');
const cors = require("cors");
const dotenv = require('dotenv');
const multer = require('multer');
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
      const fC = await S3Upload(req.file,fileContent);
      const fileS3Url = fC.Location;
      res.status(201).json({message:"uploaded sucessfulluy"}); 
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