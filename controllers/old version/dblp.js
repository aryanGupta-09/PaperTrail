const axios = require('axios');

module.exports.search = async function (req, res) {
    console.log("At DBLP search page");

    try {
        const response = await axios.get('https://dblp.org/search/publ/api', {
            params: {
                format: 'json',
                h: 30, // number of results to display
                f: 0,  // start from the fth result
                q: 'sugar'  // replace with your query parameter
            }
        });

        // Render the view with the API response data
        return res.render('dblp', {
            title: 'DBLP Search',
            results: response.data.result.hits.hit
        });
    } catch (error) {
        console.error('Error making API call to DBLP:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};