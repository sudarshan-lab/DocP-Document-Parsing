const fs = require('fs');
const express = require('express');
const cors = require("cors");
const dotenv = require('dotenv');
const app = express();
app.use(express.json());
dotenv.config();
app.use(cors());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads/') // specify the directory where uploaded files will be stored
  },
  filename: function (req, file, cb) {
      cb(null, file.originalname) // use the original file name for storing
  }
});

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