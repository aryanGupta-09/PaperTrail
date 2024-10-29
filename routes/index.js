const express = require("express");
const router = express.Router();

const homeController = require("../controllers/home");

console.log("Router loaded");

router.get("/", homeController.home);
router.use("/serpapi", require("./serpapi"));
router.use("/dblp", require("./dblp"));  // to include the DBLP route

module.exports = router;