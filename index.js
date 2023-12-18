const express = require('express');
const axios = require('axios');
const redis = require('redis');
const cors = require('cors');
const { param, validationResult } = require('express-validator');
const app = express();

// Redis setup
const redisConfig = {
  url: process.env.REDIS_URL,
  database: 1,
}

let redisClient;

(async () => {
  redisClient = redis.createClient(redisConfig);
  redisClient.on("error", (error) => console.error(`Error: ${error}`));
  await redisClient.connect();
})();

// CORS
app.use(cors());

// Functions

// Legacy fetch function
function LeagueSeason(league, season) {
  this.url = 'https://api-football-v1.p.rapidapi.com/v3/standings';
  this.method = 'GET';
  this.params = {
    league: league,
    season: season,
  };
  this.headers = {
    'X-RapidAPI-Host': process.env.API_HOST,
    'X-RapidAPI-Key': process.env.API_KEY,
  }
}

// Fetch table from remote API
async function fetchTable(league, season) {
  reqSeason = new LeagueSeason(league, season);
  const apiResponse = await axios.request(reqSeason);
  return apiResponse.data;
}

// Get a league table
async function getLeagueTable(req, res) {
  const league = req.params.league;
  const season = req.params.season;
  const seasontable = req.params.league + req.params.season;
  let results;
  let isCached = false;

  // Try to fetch a league table
  try {
    // First check cache
    const cacheResults = await redisClient.get(seasontable);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      // Fetch remotely
      results = await fetchTable(league, season);
      if (results.length === 0) {
        throw "API returned no data"
      }
      // Store table in cache
      await redisClient.set(seasontable, JSON.stringify(results), {
        EX: 21600,
        NX: true,
      });
    }
    // Return the league table for the corresponding season
    res.status(200).send({
      fromCache: isCached,
      table: results
    });
  } catch (error) {
    console.error(error);
    res.status(404).send("Data not found");
  }
}

// Routes
// new method
app.get('/league/:league/:season', getLeagueTable);

// Current Premier League Table
app.get('/pl', getLeagueTable);


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
