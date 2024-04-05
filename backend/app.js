const fs = require('fs');
const express = require('express');
const app = express();
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