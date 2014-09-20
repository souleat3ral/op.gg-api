var cheerio = require('cheerio');
var request = require('request');
var http = require('http');
var express = require('express');

/* app */
var res;
var app = express();
var options = {
  url: '',
  headers: {
    'Content-Type': 'text/html',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36',
    'Accept-Language': 'en-GB,en-US;q=0.8,en;q=0.6'
  }
};

app.param('region', function(req,res,next,id){
  if (req.params.region == 'kr') {req.params.region = 'www';}
  next();
});

app.get('/:region', function(req,_res){
  _res.set('Content-Type', 'application/json');
  res = _res;
  options.url = 'http://'+req.params.region+'.op.gg/spectate/pro/';
  console.log("parsing "+options.url);
  request(options,parseLive);
});

app.param('summoner', function(req,res,next,id){
  next();
});

app.get('/:region/:summoner', function(req,_res) {
  _res.set('Content-Type', 'application/json');
  res = _res;
  options.url = 'http://'+req.params.region+'.op.gg/summoner/userName='+req.params.summoner;
  console.log("parsing "+options.url);
  request(options,parseSummoner);
});

app.get('/:region/:summoner/champions', function(req,_res) {
  _res.set('Content-Type', 'application/json');
  res = _res;
  options.url = 'http://'+req.params.region+'.op.gg/summoner/champions/userName='+req.params.summoner;
  console.log("parsing "+options.url);
  request(options,parseSummonerChampions);
});

app.get('/:region/:summoner/league', function(req,_res) {
  _res.set('Content-Type', 'application/json');
  res = _res;
  options.url = 'http://'+req.params.region+'.op.gg/summoner/league/userName='+req.params.summoner;
  console.log("parsing "+options.url);
  request(options,parseSummonerLeague);
});

app.get('/:region/league/top', function(req,_res) {
  _res.set('Content-Type', 'application/json');
  res = _res;
  options.url = 'http://'+req.params.region+'.op.gg/ranking/ladder';
  console.log("parsing "+options.url);
  request(options,parseLeague);
});

http.createServer(app).listen(1337, function() {
  console.log('App started');
});

/* end app */


/* fetch */
function parseLive(err, resp, html) {
  if (err) {res.send('endpoint not found'); return console.error(err);}
  var $ = cheerio.load(html);
  var ret = [];

  $('div.nBoxContent').each(function(i,item0) {
    $('div.SpectatorSummoner').each(function(j,item1){
      var $ = cheerio.load(item1);
      summoner = {};
      summoner.champId = stripNewLines($('.championImage').attr('data-championid'));
      summoner.champName = stripNewLines($('.championName').text());
      summoner.timestamp = stripNewLines($('._countdown').attr('data-timestamp'));
      summoner.matchId = stripURL($('a').attr('href'));
      summoner.name = stripNewLines($('.summonerName').text());
      summoner.rank = stripNewLines($('.TierRankString').text());
      summoner.team = stripNewLines($('.summonerTeam').text());
      ret.push(summoner);
    });
  });
  res.send(ret);
  console.log('done');
}

function parseSummoner(err, resp, html) {
  if (err) {res.send('endpoint not found'); return console.error(err);}
  var $ = cheerio.load(html);
  var ret = {};

  var recent = {};
  recent.winRatio = parseInt($('.AverageGameStats .WinRatioText').text().slice(0,-1));

  var temp = $('.AverageGameStats .WinRatioTitle').text().split('\n');
  recent.wins = parseInt(temp[2].slice(0,-1));
  recent.losses = parseInt(temp[3].slice(0,-1));
  recent.games = parseInt(temp[1].slice(0,-1));
  recent.kdaKillsAverage = parseFloat($('.AverageGameStats .kda .kill').text());
  recent.kdaDeathsAverage = parseFloat($('.AverageGameStats .kda .death').text());
  recent.kdaAssistsAverage = parseFloat($('.AverageGameStats .kda .assist').text());
  recent.kdaKillsTotal = parseInt($('.AverageGameStats .kdatotal .kill').text());
  recent.kdaDeathsTotal = parseInt($('.AverageGameStats .kdatotal .death').text());
  recent.kdaAssistsTotal = parseInt($('.AverageGameStats .kdatotal .assist').text());
  recent.kdaRatio = parseFloat($('.AverageGameStats .kdaratio .kdaratio').text().slice(0,-2));
  ret.recent = recent;

  var games = [];
  $('.GameBox').each(function(i,game) {
    var $ = cheerio.load(game);
    game = {};
    game.type = stripNewLines($('.subType').contents().eq(0).text()).slice(0,-2);
    game.date = stripNewLines($('._timeago').data('data-datetime'));
    game.mmr = parseInt(stripNewLines($('.mmr').text()).substring(11));
    
    var temp = stripURL($('.observer a').attr('href'));
    game.id = temp.replace( /^\D+/g, '');
    game.length = stripNewLines($('.gameLength').text());
    game.result = stripNewLines($('.gameResult span').text());
    game.champion = stripNewLines($('.championName').text());
    game.championId = $('.championImage').data().championid;
    game.championImage = stripNewLines($('.championImage img').attr('src'));
    game.spell1 = stripNewLines($('.spell1 img').attr('src'));
    game.spell2 = stripNewLines($('.spell2 img').attr('src'));
    game.kills = parseInt(stripNewLines($('.kda .kill').text()));
    game.deaths = parseInt(stripNewLines($('.kda .death').text()));
    game.assists = parseInt(stripNewLines($('.kda .assist').text()));
    game.ratio = parseFloat(stripNewLines($('.kdaratio .kdaratio').text()).slice(0,-2));
    game.multikill = stripNewLines($('.multikill .kill').text());
    game.level = parseInt(stripNewLines($('.level .level').text()));

    var temp = stripNewLines($('.cs .cs').text()).split(' (');
    game.cs = parseInt(temp[0]);
    game.csps = parseFloat(temp[1].slice(0,-1));
    game.gold = stripNewLines($('.gold .gold').text());
    game.wardsGreenBought = parseInt(stripNewLines($('.wards.sight').text()));
    game.wardsPinkBought = parseInt(stripNewLines($('.wards.vision').text()));

    var items = [];
    $('.Items .item32').each(function(j,_item) {
      var $ = cheerio.load(_item);

      var item = {};
      item.name = stripNewLines($('.item32').attr('title'));
      item.image = $('.item32 .img').css('display');
      item.slot = j+1;
      items.push(item);
    });
    game.items = items;

    var trinket = {};
    trinket.name = stripNewLines($('.ItemsTrinket .item32').attr('original-title'));
    trinket.image = stripNewLines($('.ItemsTrinket .item32 .img').css('background-image'));
    trinket.slot = 1;
    game.items.push(trinket);

    var players = [];
    $('.teamId-100 .player').each(function(j,_player) {
      var $ = cheerio.load(_player);

      var player = {};
      player.champion = stripNewLines($('.championIcon').attr('title'));
      player.championId = $('.championIcon').data().championid;
      player.championImage = stripNewLines($('.championIcon .img').css('background-image'));
      player.name = stripNewLines($('.summonerName a').text());
      players.push(player);
    });
    game.team1 = players;

    var players = [];
    $('.teamId-200 .player').each(function(j,_player) {
      var $ = cheerio.load(_player);

      var player = {};
      player.champion = stripNewLines($('.championIcon').attr('title'));
      player.championId = $('.championIcon').data().championid;
      player.championImage = stripNewLines($('.championIcon .img').css('background-image'));
      player.name = stripNewLines($('.summonerName a').text());
      players.push(player);
    });
    game.team2 = players;

    games.push(game);
  });
  ret.games = games;
  ret.gameCount = ret.games.length;
  res.send(ret);
  console.log('done');
}

function parseSummonerChampions(err, resp, html) {
  if (err) {res.send('endpoint not found'); return console.error(err);}
  var $ = cheerio.load(html);
  var ret = [];

  $('.ChampionsStatsTable .ChampionStatsTr').each(function(i,item) {
    var $ = cheerio.load(item);
    summoner = {};
    summoner.name = stripNewLines($('.championName').text());
    summoner.winrate = parseInt(stripNewLines($('.WinRatio .winRatio').text()).slice(0,-1));
    summoner.wins = parseInt(stripNewLines($('.Wins .wins').text()).slice(0,-1));
    summoner.losses = parseInt(stripNewLines($('.Losses .losses').text()).slice(0,-1));
    summoner.kills = parseInt(stripNewLines($('.kill').text()));
    summoner.deaths = parseInt(stripNewLines($('.death').text()));
    summoner.assists = parseInt(stripNewLines($('.assist').text()));
    summoner.kdaratio = Math.round((summoner.kills/summoner.deaths) * 10)/10;
    summoner.cs = parseInt(stripNewLines($('.cs').text()));
    summoner.gold = stripNewLines($('.gold').text());
    summoner.rank = i+1;
    ret.push(summoner);
  });
  res.send(ret);
  console.log('done');
}

function parseSummonerLeague(err, resp, html) {
  if (err) {res.send('endpoint not found'); return console.error(err);}
  var $ = cheerio.load(html);
  var ret = {};

  var league = {};
  league.image = stripNewLines($('.LeagueHeader img').attr('src'));
  league.rank = stripNewLines($('.LeagueHeader .LeagueRank').text());
  league.tier = stripNewLines($('.LeagueHeader .LeagueTierRank').text());
  league.name = stripNewLines($('.LeagueHeader .LeagueName').text());

  var summoners = [];
  $('.LeagueContent .LeagueRankTableData').each(function(i,item) {
    var $ = cheerio.load(item);
    summoner = {};
    summoner.rank = parseInt(stripNewLines($('.rank').text()));
    summoner.change = parseInt(stripNewLines($('.change span').text()));
    summoner.changeDirection = stripNewLines($('.change span').attr('class'));
    summoner.name = stripNewLines($('.summonerName').text());
    summoner.image = stripNewLines($('.summonerImage img').attr('src'));
    summoner.wins = parseInt(stripNewLines($('.wins').text()));
    summoner.losses = parseInt(stripNewLines($('.losses').text()));
    summoner.points = parseInt(stripNewLines($('.LeaguePoints').text()));
    summoners.push(summoner);
  });

  ret.league = league;
  ret.summoners = summoners;
  res.send(ret);
  console.log('done');
}

function parseLeague(err, resp, html) {
  if (err) {res.send('endpoint not found'); return console.error(err);}
  var $ = cheerio.load(html);
  var ret = [];

  $('.RankingTable tr').each(function(i,item) {
    var $ = cheerio.load(item);
    summoner = {};
    summoner.rank = parseInt(stripNewLines($('.Rank').text()));
    summoner.change = parseInt(stripNewLines($('.rankPreviousPosition').text()));
    var temp = stripNewLines($('.rankPreviousPosition').attr('class'));
    if (typeof(temp) !== 'undefined') {
      if (temp.indexOf('up') > -1) {temp = 1}
      else if (temp.indexOf('down') > -1) {temp = 0}
    }
    summoner.changeDirection = temp;
    summoner.name = stripNewLines($('.SummonerName .summonerName').text());
    summoner.image = stripNewLines($('.summonerImage img').attr('src'));
    summoner.tier = stripNewLines($('.summonerTierRank .tierRank').text());
    summoner.team = stripNewLines($('.SummonerTeam').text());
    summoner.wins = parseInt(stripNewLines($('.SummonerWinsLosses .progress .blue').text()));
    summoner.losses = parseInt(stripNewLines($('.SummonerWinsLosses .progress .red').text()));
    summoner.ratio = parseFloat(stripNewLines($('.SummonerWinsLosses .winRatio').text()));
    summoner.points = parseInt(stripNewLines($('.summonerLeaguePoint').text()));

    var champions = [];
    $('.Champions .championIcon').each(function(j, champ) {
      var $ = cheerio.load(champ);

      var champion = {};
      var temp = $('div').attr('title').split('<br>');
      champion.name = temp[0];
      champion.games = parseInt(temp[1].split(' ')[0]);
      champion.kda = parseFloat(temp[3].substring(4));

      temp = temp[2].split('/');
      champion.kills = parseFloat(temp[0].trim());
      champion.deaths = parseFloat(temp[1].trim());
      champion.assists = parseFloat(temp[2].trim());
      champions.push(champion);
    });
    summoner.champions = champions;
    ret.push(summoner);
  });

  res.send(ret);
  console.log('done');
}

function stripNewLines(str) {
  if (typeof(str) === 'undefined' || typeof(str) === 'object') {return str}
  return str.replace(/(?:\r\n|\r|\n)/g, '');
}

function stripURL(str) {
  if (typeof(str) === 'undefined') {return str}
  return str.split('=')[1];
}
/* end fetch */