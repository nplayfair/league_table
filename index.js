const express = require('express');
const axios = require('axios');
const redis = require('redis');
const cors = require('cors');
const { param, validationResult } = require('express-validator');
const app = express();

const redisConfig = {
    url: process.env.REDIS_URL,
    db: 1,
}

const client = redis.createClient(redisConfig);

client.on('error', (err) => {
  console.log(err);
});

// CORS
app.use(cors());

function LeagueSeason(leagueID, year) {
  this.params = { league: leagueID, season: year }
  this.headers = {
    'x-rapidapi-host': process.env.API_HOST,
    'x-rapidapi-key': process.env.API_KEY,
  }
}

// Routes

app.get('/pl', async (req, res) => {
  const league = '39';
  const year = '2021';
  const query = league + year;
  try {
    client.get(query, async (err, leagueTable) => {
      if (err) throw err;

      // Return cached league table if present
      if (leagueTable) {
        res.status(200).send({
          table: JSON.parse(leagueTable),
          message: 'data retrieved from cache',
        });
      } else {
        // Fetch from the API
        reqSeason = new LeagueSeason(league, year);
        const leagueTable = await axios.get(
          'https://v3.football.api-sports.io/standings',
          reqSeason
        );
        // Save result to cache
        client.setex(query, 43200, JSON.stringify(leagueTable.data));
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
  const year = '2021';
  const query = league + year;
  try {
    client.get(query, async (err, leagueTable) => {
      if (err) throw err;

      // Return cached league table if present
      if (leagueTable) {
        res.status(200).send({
          table: JSON.parse(leagueTable),
          message: 'data retrieved from cache',
        });
      } else {
        // Fetch from the API
        reqSeason = new LeagueSeason(league, year);
        const leagueTable = await axios.get(
          'https://v3.football.api-sports.io/standings',
          reqSeason
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

app.get('/v2/:league/:year', 
  [
    // League id must be one of these
    param('league').isIn(['39', '40', '41', '42']),
    // Year must be no earlier than 2018
    param('year').isIn(['2018', '2019', '2020', '2021']),
  ],
  async (req, res) => {
    // Validate
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    // Begin method
    const league = req.params.league;
    const year = req.params.year;
    const query = league + year;
    try {
      client.get(query, async (err, leagueTable) => {
        if (err) throw err;

        // Return cached league table if present
        if (leagueTable) {
          res.status(200).send({
            table: JSON.parse(leagueTable),
            message: 'data retrieved from cache',
          });
        } else {
          // Fetch from the API
          reqSeason = new LeagueSeason(league, year);
          const leagueTable = await axios.get(
            'https://v3.football.api-sports.io/standings',
            reqSeason
          );
          // Save result to cache
          client.setex(query, 43200, JSON.stringify(leagueTable.data));
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
