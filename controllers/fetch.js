const axios = require("axios");
const { SERP_API_KEY } = require("../api_keys");
const { parseStringPromise } = require("xml2js");

module.exports.fetch = async function (req, res) {
    console.log("At fetch page");
    console.log("Query parameters received:", req.query);

    let serpapi_results = [];
    let dblp_results = [];
    let arXiv_results = [];
    let combined_results = []; // Array to hold the normalized data

    if (req.query.q) {
        const query = req.query.q;

        try {
            // SerpAPI Call
            const serpResponse = await axios.get('https://serpapi.com/search', {
                params: {
                    q: query,
                    engine: 'google_scholar',
                    api_key: SERP_API_KEY
                }
            });
            serpapi_results = serpResponse.data.organic_results || [];
            console.log("SerpAPI results fetched successfully");

            // DBLP Call
            const dblpResponse = await axios.get('https://dblp.org/search/publ/api', {
                params: { format: 'json', h: 30, f: 0, q: query }
            });
            dblp_results = dblpResponse.data.result?.hits?.hit || [];
            console.log("DBLP results fetched successfully");

            // ArXiv Call
            const arxivResponse = await axios.get('http://export.arxiv.org/api/query', {
                params: {
                    search_query: `all:${query}`,
                    start: req.query.start || 0,
                    max_results: req.query.max_results || 10,
                    sortBy: req.query.sortBy || "relevance",
                    sortOrder: req.query.sortOrder || "descending"
                }
            });
            const parsedData = await parseStringPromise(arxivResponse.data, { explicitArray: false });
            arXiv_results = parsedData.feed?.entry || [];
            if (!Array.isArray(arXiv_results)) {
                arXiv_results = [arXiv_results]; // Ensure consistency for single result
            }
            console.log("ArXiv results fetched successfully");

            // Combine results into a unified format
            combined_results = [
                ...serpapi_results.map(result => ({
                    title: result.title || "Unknown",
                    authors: result.publication_info?.authors?.map(author => author.name).join(", ") || "Unknown",
                    year: (result.publication_info?.summary?.match(/\b(19|20)\d{2}\b/) || [])[0] || "Unknown",
                    snippet: result.snippet || "No snippet available",
                    link: result.link || "#"
                })),
                ...dblp_results.map(result => ({
                    title: result.info.title || "Unknown",
                    authors: result.info.authors?.author?.map(author => author.text).join(", ") || "Unknown",
                    year: result.info.year || "Unknown",
                    snippet: "No snippet available", // DBLP does not provide a snippet
                    link: result.info.url || "#"
                })),
                ...arXiv_results.map(result => ({
                    title: result.title || "Unknown",
                    authors: Array.isArray(result.author)
                        ? result.author.map(author => author.name).join(", ")
                        : result.author?.name || "Unknown",
                    year: result.published?.slice(0, 4) || "Unknown",
                    snippet: result.summary || "No snippet available",
                    link: result.id || "#"
                }))
            ];

        } catch (error) {
            console.error('Error during API fetch:', error.message);
            return res.status(500).json({ error: "Error fetching data from external sources." });
        }
    } else {
        console.log("No query provided.");
    }

    // Determine whether to render HTML or return JSON
    if (req.query.render) {
        return res.render("fetch", {
            title: "PaperTrail | Fetch",
            serpapi_results,
            dblp_results,
            arXiv_results,
            combined_results // Pass combined results to the EJS template
        });
    } else {
        return res.json({
            serpapi_results,
            dblp_results,
            arXiv_results,
            combined_results // Include combined results in the JSON response
        });
    }
};
