const db = require("../config/knex");
const axios = require('axios');
const mysql = require('mysql');

const buildDynamicQuery = async (filters) => {
    const baseQuery = db('Papers as p');

    // Define joins dynamically
    const joins = {
        metadata: () => {
            baseQuery.leftJoin('Papers_Metadata as m', 'p.id', 'm.paper_id');
        },
        venue: () => {
            baseQuery.leftJoin('Papers_Venue as pv', 'p.id', 'pv.paper_id')
                .leftJoin('Venue as v', 'pv.venue_id', 'v.id');
        },
        authors: () => {
            baseQuery.leftJoin('Paper_Authors as pa', 'p.id', 'pa.paper_id')
                .leftJoin('Authors as a', 'pa.author_id', 'a.id');
        },
        field: () => {
            baseQuery.leftJoin('Fields_of_Study as f', 'p.id', 'f.paper_id');
        }
    };

    // Apply joins based on filters
    joins.metadata();
    joins.venue();
    joins.authors();
    joins.field();

    // Select the required columns
    baseQuery.select(
        'p.id',
        'p.title',
        db.raw('GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ", ") as authors'), // Aggregate authors
        'v.raw as venue',
        'm.n_citation as citations',
        'm.year',
        db.raw('GROUP_CONCAT(DISTINCT f.topic ORDER BY f.topic SEPARATOR ", ") as fields') // Aggregate fields
    );

    // Add WHERE conditions dynamically
    const conditions = [];
    if (filters.id) conditions.push(['p.id', '=', filters.id]);
    if (filters.title) conditions.push(['p.title', 'like', `%${filters.title}%`]);
    if (filters.year) conditions.push(['m.year', '=', filters.year]);
    if (filters.citations) conditions.push(['m.n_citation', '>=', filters.citations]);
    if (filters.venue) conditions.push(['v.raw', 'like', `%${filters.venue}%`]);
    if (filters.field) conditions.push(['f.topic', 'like', `%${filters.field}%`]);

    // Apply exact match conditions
    conditions.forEach((condition) => {
        baseQuery.where(condition[0], condition[1], condition[2]);
    });

    // Apply title conditions
    // if (filters.title) {
    //     baseQuery.where('p.title', '=', filters.title)
    //         .orWhere('p.title', 'like', `%${filters.title}%`)
    //         .orWhereRaw('MATCH(p.title) AGAINST(? IN NATURAL LANGUAGE MODE)', [filters.title]);
    // }

    // Apply phonetic search for authors
    if (filters.authors) {
        baseQuery.whereIn('p.id', function () {
            this.select('pa.paper_id')
                .from('Paper_Authors as pa')
                .join('Authors as a', 'pa.author_id', 'a.id')
                .where(function () {
                    filters.authors.forEach((author) => {
                        const wordCount = author.trim().split(' ').length;
                        if (wordCount > 1) {
                            // Multiple-word input: Compare SOUNDEX of full name
                            this.orWhereRaw(`SOUNDEX(a.name) = SOUNDEX(?)`, [author]);
                        } else {
                            // Single-word input: Compare SOUNDEX with each word in a.name
                            this.orWhere(function () {
                                // Split a.name into words and compare each word
                                this.whereRaw(`
                                    EXISTS (
                                        SELECT 1 FROM (
                                        SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(a.name, ' ', seq.n), ' ', -1)) AS name_part
                                        FROM (
                                            SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
                                        ) seq
                                        WHERE CHAR_LENGTH(a.name) - CHAR_LENGTH(REPLACE(a.name, ' ', '')) + 1 >= seq.n
                                        ) name_parts
                                        WHERE SOUNDEX(name_parts.name_part) = SOUNDEX(?)
                                    )
                                    `, [author]);
                            });
                        }
                    });
                });
        });
    }

    // Group by paper ID to aggregate authors and fields
    baseQuery.groupBy('p.id');

    // // Order results: exact matches first, then like matches, then full-text matches
    // baseQuery.orderByRaw(`
    //     CASE
    //         WHEN p.title = ? THEN 0
    //         WHEN p.title LIKE ? THEN 1
    //         ELSE 2
    //     END, p.title
    // `, [filters.title, `%${filters.title}%`]);

    const rawSQL = baseQuery;
    const localResults = await baseQuery;
    return { rawSQL, localResults };
};

// Function to interpolate bindings into SQL query safely
function interpolateBindings(sql, bindings) {
    return sql.replace(/\?/g, () => mysql.escape(bindings.shift()));
}

const mapBuildDynamicQueryToRemote = async (sql) => {
    let remoteSQL = sql;

    // Fix column references in SELECT clause
    remoteSQL = remoteSQL.replace(/`m`\.`n_citation`\s+as\s+`citations`/gi, '`p`.`n_citation` as `citations`');
    remoteSQL = remoteSQL.replace(/`m`\.`year`/gi, '`p`.`year`');

    // Remove Papers_Metadata join
    remoteSQL = remoteSQL.replace(/\s*left\s+join\s+`Papers_Metadata`\s+as\s+`m`\s+on\s+`p`\.`id`\s*=\s*`m`\.`paper_id`/gi, '');

    // Keep tables in their original case - do not convert case at all
    // The remote schema uses these exact names
    remoteSQL = remoteSQL.replace(/`[Pp]apers_[Vv]enue`/gi, '`Papers_Venue`');
    remoteSQL = remoteSQL.replace(/`[Pp]apers`/gi, '`Papers`');
    remoteSQL = remoteSQL.replace(/`[Vv]enue`/gi, '`Venue`');
    remoteSQL = remoteSQL.replace(/`[Pp]aper_[Aa]uthors`/gi, '`Paper_Authors`');
    remoteSQL = remoteSQL.replace(/`[Aa]uthors`/gi, '`Authors`');
    remoteSQL = remoteSQL.replace(/`[Ff]ields_[Oo]f_[Ss]tudy`/gi, '`Fields_of_Study`');

    // Fix WHERE clause conditions
    remoteSQL = remoteSQL.replace(/where\s+`m`\./gi, 'where `p`.');
    remoteSQL = remoteSQL.replace(/and\s+`m`\./gi, 'and `p`.');

    // Clean up any artifacts
    remoteSQL = remoteSQL.replace(/\s+/g, ' ').trim();

    return remoteSQL;
};

module.exports.handleQuery = async function (req, res) {
    const filters = req.body;

    try {
        // Handle comma-separated authors
        if (filters.authors) {
            filters.authors = filters.authors.split(',').map((author) => author.trim());
        }

        // Build the dynamic query
        const { rawSQL, localResults } = await buildDynamicQuery(filters);

        // Extract the SQL query and bindings
        const { sql, bindings } = rawSQL.toSQL();

        // Interpolate the bindings into the SQL string
        const localQuery = interpolateBindings(sql, bindings);

        // Map the query to remote database schema
        const remoteQuery = await mapBuildDynamicQueryToRemote(localQuery);

        // Encode the query string
        const encodedQuery = encodeURIComponent(remoteQuery);

        // Send the API call
        const response = await axios.get(`http://13.60.225.50:5000/execute_query?query=${encodedQuery}`);

        // Process the response data
        const remoteResults = response.data.results;

        // return res.status(200).json(results);

        return res.render("paper_results", {
            title: "PaperTrail",
            results: [...localResults, ...(Array.isArray(remoteResults) ? remoteResults : [])], // Combine and pass the results to the view for display
        });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'An error occurred while processing the query.' });
    }
};
