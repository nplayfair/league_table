const express = require('express');
const axios = require('axios');
const redis = require('redis');
require('dotenv').config();
const app = express();

const config = {
  headers: {
    'x-rapidapi-host': process.env.API_HOST,
    'x-rapidapi-key': process.env.API_KEY,
  },
  params: {
    league: '39',
    season: '2020',
  },
};

app.get('/pl', async (req, res) => {
  try {
    const leagueTable = await axios.get(
      'https://v3.football.api-sports.io/standings',
      config
    );
    res.status(200).send({
      table: leagueTable.data,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running`);
});
