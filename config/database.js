const mysql = require('mysql2');

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'kunal',
  password: 'e$9L#4fG*p&2T@7v',
  database: 'fly247',
  waitForConnections: true,
  connectionLimit: 10, // Adjust this limit as needed
  queueLimit: 0, 
  port:3306
});

// Test the MySQL connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
  connection.release(); // Release the connection when done with it
});

module.exports = { pool };
