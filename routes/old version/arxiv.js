const express = require("express");
const router = express.Router();

const arxivController = require("../controllers/arxiv");

console.log("Arxiv router loaded");

router.get("/", arxivController.search);

module.exports = router;
