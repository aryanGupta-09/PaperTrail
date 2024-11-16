const axios = require('axios');

module.exports.search = async function (req, res) {
    console.log("At Arxiv search page");

    // Capture query parameters from the request or set default values
    const query = req.query.q || "Artificial Intelligence";  // default search query
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

        // Render the view with the parsed data
        return res.render('arxiv', {
            title: 'Arxiv Search',
            results: entries
        });
    } catch (error) {
        console.error('Error making API call to Arxiv:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
