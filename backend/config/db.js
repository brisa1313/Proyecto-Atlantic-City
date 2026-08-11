const sql = require('mssql');

require('dotenv').config();

const dbConfig = {

    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {

        encrypt: true,
        trustServerCertificate: true // Crucial para conexiones locales

    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)

    .connect()
    .then(pool => {

        console.log('✅ Conectado exitosamente a SQL Server');
        return pool;
    })

    .catch(err => {

        console.error('❌ Error de conexión a la Base de Datos:', err);

    });

module.exports = { sql, poolPromise };