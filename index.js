const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

const port = process.env.PORT;
const publicDirectory = path.join(__dirname, "/public");
const scrapeRouter = require("./src/routers/scrapeRouter");

app.use(cors());
app.use(express.json());
app.use(express.static(publicDirectory));
app.use(scrapeRouter);

app.listen(port, ()=>{
    console.log("Server connected, port: ", port);
})