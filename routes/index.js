const express = require("express");
const router = express.Router();

const homeController = require("../controllers/home");
const paperQueryController = require("../controllers/paper_query");
const patentQueryController = require("../controllers/patent_query");

console.log("Router loaded");

router.get("/", homeController.home);

router.post("/search_papers", paperQueryController.handleQuery);

router.post("/search_patents", patentQueryController.handleQuery);

// router.use("/fetch-data", require("./fetch-data"));
// router.use("/authors", require("./authors"));

module.exports = router;