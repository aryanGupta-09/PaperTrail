const axios = require('axios');
const { SERP_API_KEY } = require('../api_keys');

module.exports.fetch = async function (req, res) {
    console.log("At fetch page");

    var serpapi_results = [];
    try {
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                q: 'artificial intelligence', // Replace with your query parameter
                engine: 'google_scholar',
                api_key: SERP_API_KEY
            }
        });
        serpapi_results = response.data;
    } catch (error) {
        console.error('Error making API call:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    var dblp_results = [];
    try {
        const response = await axios.get('https://dblp.org/search/publ/api', {
            params: {
                format: 'json',
                h: 30, // number of results to display
                f: 0,  // start from the fth result
                q: '2024'  // replace with your query parameter
            }
        });
        dblp_results = response.data.result.hits.hit;
    } catch (error) {
        console.error('Error making API call to DBLP:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    var arXiv_results = [];
    // Capture query parameters from the request or set default values
    const query = req.query.q || "electron";  // default search query
    const start = req.query.start || 0;       // starting index for results
    const maxResults = req.query.max_results || 10;  // max results per request
    const sortBy = req.query.sortBy || "relevance"; // sorting criterion
    const sortOrder = req.query.sortOrder || "descending"; // sorting order

    try {
        // Construct the Arxiv API URL with query parameters
        const response = await axios.get('http://export.arxiv.org/api/query', {
            params: {
                search_query: `all:${query}`,
                start: start,
                max_results: maxResults,
                sortBy: sortBy,
                sortOrder: sortOrder
            }
        });

        // Parse Atom XML response (for Atom format you may need a library like `xml2js`)
        const parser = require('xml2js').parseStringPromise;
        const parsedData = await parser(response.data);

        // Extract data needed for rendering (parsedData.entry might vary based on response)
        const entries = parsedData.feed.entry || []; // empty array if no entries

        arXiv_results = entries;
    } catch (error) {
        console.error('Error making API call to Arxiv:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    return res.render("fetch", {
        title: "PaperTrail | Fetch",
        serpapi_results,
        dblp_results,
        arXiv_results
    });
};