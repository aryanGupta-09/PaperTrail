const express = require("express");
const router = express.Router();

const serpapiController = require("../controllers/serpapi");

console.log("at serpapi router");

router.get("/", serpapiController.search);

module.exports = router;