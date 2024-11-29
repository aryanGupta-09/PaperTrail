const { Sequelize } = require('sequelize');

const dbNames = ['researchsystem2'];
const username = 'root';
const password = 'root';
const host = 'localhost';

// Function to initialize Sequelize instances
function initialize() {
    const sequelizeInstances = {};

    for (const dbName of dbNames) {
        const sequelize = new Sequelize(dbName, username, password, {
            host: host,
            dialect: 'mysql'
        });

        sequelize.authenticate()
            .then(() => {
                console.log(`Connection to ${dbName} has been established successfully.`);
            })
            .catch((error) => {
                console.error(`Unable to connect to the database ${dbName}:`, error);
            });

        sequelizeInstances[dbName] = sequelize;
    }

    return sequelizeInstances;
}

const dbs = initialize();

module.exports = dbs;