const express = require('express');
const redis = require('redis');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Redis client setup
const redisUrl = 'redis://default:pVfsPsHSoGstDPuOSwuQYFYLZUPvJIwb@viaduct.proxy.rlwy.net:11001';
const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => console.error('Redis Client Error', err));

client.connect().then(() => {
  console.log('Connected to Redis');
});

// Define a set of possible workouts
const workouts = [
  { name: 'Push-Ups', description: '3 sets of 15 reps' },
  { name: 'Squats', description: '3 sets of 20 reps' },
  { name: 'Planks', description: '3 sets of 1 minute' },
  { name: 'Jumping Jacks', description: '3 sets of 50 reps' },
  { name: 'Burpees', description: '3 sets of 10 reps' },
  { name: 'Lunges', description: '3 sets of 15 reps per leg' },
];

// Function to generate random workouts
const generateRandomWorkouts = () => {
  const shuffled = workouts.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3); // Return 3 random workouts
};

// API endpoint to get random workouts
app.get('/random-workouts', (req, res) => {
  const randomWorkouts = generateRandomWorkouts();
  res.json(randomWorkouts);
});

// API endpoints
app.post('/food-entry', async (req, res) => {
  const { userName, foodItem, calories } = req.body;
  if (!userName || !foodItem || !calories) {
    return res.status(400).send('User name, food item, and calories are required');
  }

  const id = `food:${Date.now()}`;
  console.log('Adding to Redis:', id, { userName, foodItem, calories });

  try {
    // Setting each field individually
    await client.hSet(id, 'userName', userName);
    await client.hSet(id, 'foodItem', foodItem);
    await client.hSet(id, 'calories', calories);

    res.status(201).send('Food entry added');
  } catch (error) {
    console.error('Error adding to Redis:', error);
    res.status(500).send('Error adding food entry');
  }
});

app.get('/food-entries', async (req, res) => {
  const keys = await client.keys('food:*');
  const foodEntries = [];
  for (const key of keys) {
    const entry = await client.hGetAll(key);
    entry.id = key; // Add the key as an ID to each entry for identification
    foodEntries.push(entry);
  }
  res.json(foodEntries);
});

// Delete endpoint
app.delete('/food-entry/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const exists = await client.exists(id);
    if (!exists) {
      return res.status(404).send('Food entry not found');
    }

    await client.del(id);
    res.status(200).send('Food entry deleted');
  } catch (error) {
    console.error('Error deleting from Redis:', error);
    res.status(500).send('Error deleting food entry');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
