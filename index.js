const dotenv = require('dotenv');
dotenv.config();

const express = require("express");
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const expressLayouts = require("express-ejs-layouts");

app.use(express.static("./assets"));

// set up the view engine
app.set("view engine", "ejs");
app.set("views", "./views");

// use express-ejs-layouts middleware
app.use(expressLayouts);
app.set('layout extractStyles', true);
app.set('layout extractScripts', true);

app.use(bodyParser.urlencoded({extended: false}));

app.use("/", require("./routes"));

app.listen(port, function (err) {
    if (err) {
        console.log(`Error in running the server: ${err}`);
    } else {
        console.log(`Server is running on port: ${port}`);
    }
});