const db = require("../config/knex");

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
    if (filters.title) conditions.push(['p.title', 'like', `%${filters.title}%`]);
    if (filters.year) conditions.push(['m.year', '=', filters.year]);
    if (filters.citations) conditions.push(['m.n_citation', '>', filters.citations]);
    if (filters.venue) conditions.push(['v.raw', 'like', `%${filters.venue}%`]);
    if (filters.field) conditions.push(['f.topic', 'like', `%${filters.field}%`]);

    // Apply conditions
    conditions.forEach((condition) => {
        baseQuery.where(condition[0], condition[1], condition[2]);
    });

    // Apply author condition
    if (filters.authors) {
        baseQuery.where(function () {
            filters.authors.forEach((author, index) => {
                if (index === 0) {
                    this.where('a.name', 'like', `%${author}%`);
                } else {
                    this.orWhere('a.name', 'like', `%${author}%`);
                }
            });
        });
    }

    // Group by paper ID to aggregate authors
    baseQuery.groupBy('p.id');

    return await baseQuery;
};

module.exports.handleQuery = async function (req, res) {
    const filters = req.body;

    try {
        // Handle comma-separated authors
        if (filters.authors) {
            filters.authors = filters.authors.split(',').map((author) => author.trim());
        }

        // Build the dynamic query
        const results = await buildDynamicQuery(filters);

        // return res.status(200).json(results);

        return res.render("results", {
            title: "PaperTrail",
            results, // Pass the results to the view for display
        });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'An error occurred while processing the query.' });
    }
};
