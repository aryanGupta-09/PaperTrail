const express = require("express");
const router = express.Router();

const authorFetchController = require("../controllers/authors");

// API Endpoint: Returns JSON response
router.get("/json", authorFetchController.fetchAuthors);

// Render Endpoint: Renders EJS template
router.get("/render", (req, res, next) => {
    req.query.render = true; // Add `render` flag for controller logic
    next();
}, authorFetchController.fetchAuthors);

module.exports = router;

