const express = require("express");
const app = express();
const port = 3000;
const expressLayouts = require("express-ejs-layouts");
const dbs = require("./config/sequelize");

app.use(express.static("./assets"));

// set up the view engine
app.set("view engine", "ejs");
app.set("views", "./views");

// use express-ejs-layouts middleware
app.use(expressLayouts);
app.set('layout extractStyles', true);
app.set('layout extractScripts', true);

app.use("/", require("./routes"));

app.listen(port, function (err) {
    if (err) {
        console.log(`Error in running the server: ${err}`);
    } else {
        console.log(`Server is running on port: ${port}`);
    }
});