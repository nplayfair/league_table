const express = require('express');
const axios = require('axios');
const redis = require('redis');
const cors = require('cors');
require('dotenv').config();
const app = express();
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: 6379,
  db: 1,
};
const client = redis.createClient(redisConfig);

client.on('error', (err) => {
  console.log(err);
});

// CORS
app.use(cors());

const premierLeague = {
  headers: {
    'x-rapidapi-host': process.env.API_HOST,
    'x-rapidapi-key': process.env.API_KEY,
  },
  params: {
    league: '39',
    season: '2020',
  },
};

const championship = {
  headers: {
    'x-rapidapi-host': process.env.API_HOST,
    'x-rapidapi-key': process.env.API_KEY,
  },
  params: {
    league: '40',
    season: '2020',
  },
};

app.get('/pl', async (req, res) => {
  const league = '39';
  try {
    client.get(league, async (err, leagueTable) => {
      if (err) throw err;

      // Return cached league table if present
      if (leagueTable) {
        res.status(200).send({
          table: JSON.parse(leagueTable),
          message: 'data retrieved from cache',
        });
      } else {
        // Fetch from the API
        const leagueTable = await axios.get(
          'https://v3.football.api-sports.io/standings',
          premierLeague
        );
        // Save result to cache
        client.setex(league, 43200, JSON.stringify(leagueTable.data));
        // Return data from API
        res.status(200).send({
          table: leagueTable.data,
          message: 'cache miss',
        });
      }
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.get('/championship', async (req, res) => {
  const league = '40';
  try {
    client.get(league, async (err, leagueTable) => {
      if (err) throw err;

      // Return cached league table if present
      if (leagueTable) {
        res.status(200).send({
          table: JSON.parse(leagueTable),
          message: 'data retrieved from cache',
        });
      } else {
        // Fetch from the API
        const leagueTable = await axios.get(
          'https://v3.football.api-sports.io/standings',
          championship
        );
        // Save result to cache
        client.setex(league, 43200, JSON.stringify(leagueTable.data));
        // Return data from API
        res.status(200).send({
          table: leagueTable.data,
          message: 'cache miss',
        });
      }
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running`);
});
