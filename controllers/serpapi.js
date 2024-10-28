const axios = require('axios');
const { SERP_API_KEY } = require('../api_keys');

module.exports.search = async function (req, res) {
    console.log("At search page");

    try {
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                q: 'artificial intelligence', // Replace with your query parameter
                engine: 'google_scholar',
                api_key: SERP_API_KEY
            }
        });

        // Render the view with the API response data
        return res.render('serpapi', {
            title: 'SerpAPI Search',
            results: response.data
        });
    } catch (error) {
        console.error('Error making API call:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};