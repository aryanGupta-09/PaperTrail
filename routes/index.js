const express = require("express");
const router = express.Router();

const homeController = require("../controllers/home");
const queryController = require("../controllers/query");

console.log("Router loaded");

router.get("/", homeController.home);
router.post("/search", queryController.handleQuery);
// router.use("/fetch-data", require("./fetch-data"));
// router.use("/authors", require("./authors"));

module.exports = router;