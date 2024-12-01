const axios = require('axios');
const mysql = require('mysql');

// Build dynamic query based on filters
const buildDynamicQuery = (filters) => {
    let query = 'SELECT p.patent_id, p.patent_title, p.patent_date, p.patent_year, a.author_name, p.patent_abstract ';

    // Base from the patents table
    query += 'FROM patents AS p ';

    // Define the joins based on filters
    const joins = [];
    joins.push('LEFT JOIN authors AS a ON p.author_id = a.author_id');

    // Append the joins to the query
    query += joins.join(' ');

    // Add WHERE conditions based on filters
    const conditions = [];
    if (filters.patent_id) conditions.push(`p.patent_id = ${mysql.escape(filters.patent_id)}`);
    if (filters.patent_title) conditions.push(`p.patent_title LIKE ${mysql.escape('%' + filters.patent_title + '%')}`)
    if (filters.patent_year) conditions.push(`p.patent_year = ${mysql.escape(filters.patent_year)}`);
    if (filters.author_name) {
        if (filters.author_name.trim().split(' ').length === 1) {
            // Single-word author name
            conditions.push(`
          SOUNDEX(${mysql.escape(filters.author_name)}) IN (
            SOUNDEX(SUBSTRING_INDEX(a.author_name, ' ', 1)),
            SOUNDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(a.author_name, ' ', 2), ' ', -1)),
            SOUNDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(a.author_name, ' ', 3), ' ', -1)),
            SOUNDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(a.author_name, ' ', 4), ' ', -1)),
            SOUNDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(a.author_name, ' ', 5), ' ', -1))
          )
        `);
        } else {
            // Multiple-word author name
            conditions.push(`SOUNDEX(a.author_name) = SOUNDEX(${mysql.escape(filters.author_name)})`);
        }
    }

    // Add conditions to the WHERE clause
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    return { sql: query };
};

// Function to handle the query execution
module.exports.handleQuery = async function (req, res) {
    const filters = req.body;

    try {
        // Build the dynamic query
        const { sql } = buildDynamicQuery(filters);

        // Send the API call to execute the query
        const response = await axios.get(`http://13.60.232.202:5000/query?sql=${encodeURIComponent(sql)}`);

        // Process the response data
        const remoteResults = response.data.data;

        // Render the results page
        return res.render("patent_results", {
            title: "Patent Search",
            patents: remoteResults, // Pass the results to the view for display
        });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'An error occurred while processing the query.' });
    }
};

