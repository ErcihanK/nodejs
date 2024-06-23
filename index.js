const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MySQL connection
const dbConfig = {
  host: 'viaduct.proxy.rlwy.net',
  user: 'root',
  password: 'QfkUeRbkZcLajihYecWVUkZLnTSOsYUM',
  database: 'railway',
  port: 28002,
};

let connection;

const connectToDatabase = async () => {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL');
  } catch (error) {
    console.error('MySQL connection error:', error);
    process.exit(1);
  }
};

connectToDatabase();

// API endpoints
app.post('/food-entry', async (req, res) => {
  const { foodItem, calories } = req.body;
  if (!foodItem || !calories) {
    return res.status(400).send('Food item and calories are required');
  }
  try {
    const query = 'INSERT INTO foodEntry (food, calories) VALUES (?, ?)';
    await connection.execute(query, [foodItem, calories]);
    res.status(201).send('Food entry added');
  } catch (error) {
    console.error('Error adding food entry:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/food-entries', async (req, res) => {
  try {
    const [rows] = await connection.execute('SELECT * FROM food_entries');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching food entries:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
