const axios = require("axios");
const { SERP_API_KEY } = require("../api_keys");
const { parseStringPromise } = require("xml2js");

module.exports.fetchAuthors = async function (req, res) {
    console.log("At authors page");
    console.log("Query parameters received:", req.query);

    let serpapi_results = [];
    let dblp_results = [];
    let arXiv_results = [];

    if (req.query.q) {
        const query = req.query.q;

        try {
            // SerpAPI Call
            const serpResponse = await axios.get('https://serpapi.com/search', {
                params: {
                    q: "author:"+query,
                    engine: 'google_scholar',
                    api_key: SERP_API_KEY
                }
            });
            serpapi_results = serpResponse.data.organic_results || [];
            console.log("SerpAPI results fetched successfully");

            // DBLP Call
            const dblpResponse = await axios.get('https://dblp.org/search/publ/api', {
                params: { format: 'json', h: 30, f: 0, q: query+'$' }
            });
            dblp_results = dblpResponse.data.result?.hits?.hit || [];
            console.log("DBLP results fetched successfully");

            // ArXiv Call
            const arxivResponse = await axios.get('http://export.arxiv.org/api/query', {
                params: {
                    search_query: `au:${query}`,
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
            //console.log("ArXiv results fetched successfully",arXiv_results);
            //console.log("authors",arXiv_results[0].author);  // To see the structure of each author object


        } catch (error) {
            console.error('Error during API fetch:', error.message);
            return res.status(500).json({ error: "Error fetching data from external sources." });
        }
    } else {
        console.log("No query provided.");
    }

    // Determine whether to render HTML or return JSON
    if (req.query.render) {
        console.log("author rendering")
        return res.render("authors", {
            title: "PaperTrail | FetchAuthors",
            serpapi_results,
            dblp_results,
            arXiv_results
        });
    } else {
        console.log("author json");
        return res.json({
            serpapi_results,
            dblp_results,
            arXiv_results
        });
    }
};
