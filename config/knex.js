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

module.exports = db;