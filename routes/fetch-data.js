const express = require("express");
const router = express.Router();

const fetchController = require("../controllers/fetch");

// API Endpoint: Returns JSON response
router.get("/json", fetchController.fetch);

// Render Endpoint: Renders EJS template
router.get("/render", (req, res, next) => {
    req.query.render = true; // Add `render` flag for controller logic
    next();
}, fetchController.fetch);

module.exports = router;
