const express = require("express");
const router = express.Router();

const fetchData = require("../controllers/fetchData");

console.log("Fetching data");

router.get("/", fetchData.fetch);

module.exports = router;