const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const audioFolder = "C:/Users/Aditya/Music/Daft Punk - TRON Legacy - The Complete Edition (2020)";

app.get("/api/playlist", (req, res) => {
  fs.readdir(audioFolder, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Error reading audio folder" });
      return;
    }

    const audioFiles = files
      .filter((file) => path.extname(file) === ".mp3")
      .map((file) => ({
        title: path.basename(file, ".mp3"), 
        file: path.join(audioFolder, file),
      }));

    res.json(audioFiles);
  });
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
