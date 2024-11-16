const express = require("express");
const router = express.Router();

const dblpController = require("../controllers/dblp");

console.log("At DBLP router");

router.get("/", dblpController.search);

module.exports = router;
