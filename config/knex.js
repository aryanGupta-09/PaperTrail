const knex = require('knex');

const db = knex({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: 'root', // Replace with your MySQL password
    database: 'researchsystem2', // Replace with your database name
  },
});

// Test the connection
db.raw('SELECT 1')
  .then(() => {
    console.log('Database connection successful!');
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
  });

// Function to create a FULLTEXT index if it doesn't exist
const createFullTextIndex = async () => {
  try {
    console.log('Checking if FULLTEXT index exists...');
    const indexExists = await db
      .raw(`
        SELECT COUNT(1) as count
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = 'researchsystem2' 
          AND TABLE_NAME = 'Papers'
          AND INDEX_NAME = 'fulltext_index';
      `)
      .then((result) => result[0][0].count > 0);

    if (!indexExists) {
      console.log('Creating FULLTEXT index...');
      await db.raw(`
        ALTER TABLE Papers
        ADD FULLTEXT INDEX fulltext_index (title);
      `);
      console.log('FULLTEXT index created successfully.');
    } else {
      console.log('FULLTEXT index already exists.');
    }
  } catch (error) {
    console.error('Error creating FULLTEXT index:', error);
  }
};

createFullTextIndex();
module.exports = db;