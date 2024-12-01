const db = require("../config/knex");
const axios = require('axios');
const mysql = require('mysql');
const Fuse = require('fuse.js');

const buildDynamicQueryPaperLocal = async (filters) => {
    const baseQuery = db('Authors as a');

    // Define joins dynamically
    const joins = {
        papers: () => {
            baseQuery.join('Paper_Authors as pa', 'a.id', 'pa.author_id')
                .join('Papers as p', 'pa.paper_id', 'p.id');
        },
        metadata: () => {
            baseQuery.leftJoin('Papers_Metadata as m', 'p.id', 'm.paper_id');
        }
    };

    // Apply joins based on filters
    joins.papers();
    joins.metadata();

    // Select the required columns
    baseQuery.select(
        'a.id as author_id',
        'a.name as author_name',
        db.raw('COUNT(p.id) as paper_count')
    );

    if (filters.min_papers) {
        baseQuery.groupBy('a.id')
            .having('paper_count', '>=', filters.min_papers);
    }

    const localResults = await baseQuery;
    return localResults;
};

const buildDynamicQueryPaperRemote = (filters) => {
    let query = 'SELECT a.id, a.name, COUNT(p.id) AS paper_count ';

    query += 'FROM authors AS a ';

    // Define the joins based on filters
    const joins = [];
    joins.push('JOIN paper_authors AS pa ON a.id = pa.author_id');
    joins.push('JOIN papers AS p ON pa.paper_id = p.id');

    // Append the joins to the query
    query += joins.join(' ');

    if (filters.min_papers) {
        query += ' GROUP BY a.id HAVING paper_count >= ' + filters.min_papers;
    }

    return query;
};

function fuzzyMatching(results) {
    const options = {
        keys: ['title'],
        threshold: 0.3,
        includeScore: true
    };

    const fuse = new Fuse(results, options);
    const seen = new Map(); // Change to Map to store ID with title
    const fuzzyResults = [];

    results.forEach(item => {
        if (!seen.has(item.title)) {
            const matches = fuse.search(item.title);
            seen.set(item.title, item.id);
            fuzzyResults.push(item);

            // Add similar titles to seen map with their IDs
            matches.forEach(match => {
                if (match.score < options.threshold) {
                    seen.set(match.item.title, match.item.id);
                }
            });
        } else {
            // Only merge if IDs match
            const existingItem = fuzzyResults.find(result =>
                result.title === item.title && result.id === item.id
            );

            if (existingItem) {
                Object.keys(item).forEach(key => {
                    if (item[key] && !existingItem[key]) {
                        existingItem[key] = item[key];
                    }
                });
            } else {
                // Different ID means it's a different paper, add as new item
                fuzzyResults.push(item);
            }
        }
    });

    return fuzzyResults;
}

// Build dynamic query based on filters
const buildDynamicQueryPatent = (filters) => {
    let query = 'SELECT a.author_id, a.author_name, COUNT(p.patent_id) AS patent_count ';

    query += 'FROM authors AS a ';

    // Define the joins based on filters
    const joins = [];
    joins.push('JOIN patents AS p ON a.author_id = p.author_id');

    // Append the joins to the query
    query += joins.join(' ');

    if (filters.min_patents) {
        query += ' GROUP BY a.author_id HAVING patent_count >= ' + filters.min_patents;
    }

    return query;
};

module.exports.handleQuery = async function (req, res) {
    const filters = req.body;

    try {
        // Build the dynamic query

        let paperResults = [];
        if (filters.min_papers) {
            const localPaperResults = await buildDynamicQueryPaperLocal(filters);

            // Map the query to remote database schema
            const remotePaperSQL = buildDynamicQueryPaperRemote(filters);
            const remotePaperResponse = await axios.get(`http://13.60.225.50:5000/execute_query?query=${encodeURIComponent(remotePaperSQL)}`);
            const remotePaperResults = remotePaperResponse.data.results;

            paperResults = [...(localPaperResults ?? []), ...(remotePaperResults ?? [])];
        }

        let patentResults = [];
        if (filters.min_patents) {
            const patentSQL = buildDynamicQueryPatent(filters);
            const patentResponse = await axios.get(`http://13.60.232.202:5000/query?sql=${encodeURIComponent(patentSQL)}`);
            patentResults = patentResponse.data.data;
        }

        // select those results that are present in both paperResults and patentResults
        let results = [];
        if (filters.min_papers && filters.min_patents) {
            results = paperResults.filter(paper => patentResults.some(patent => patent.author_id === paper.author_id));
        } else if (filters.min_papers) {
            results = paperResults;
        } else if (filters.min_patents) {
            results = patentResults;
        }

        return res.render("author_results", {
            title: "PaperTrail",
            results
        });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'An error occurred while processing the query.' });
    }
};