"use strict";

var config = require("config");
var debug = require("debug")("routes:search");
var express = require("express");
var request = require("request");
var url = require("url");

var search = require("../lib/search");

var router = express.Router();

/**
 * Search a database
 * @param  {Request} req
 * @param  {Response} res
 */
function querySearch(req, res, next) {
  debug("querySearch", req.params);

  debug("body", req.body);
  var dbname = req.params.dbname;
  var queryString = req.body.value;
  if (queryString && typeof queryString.trim === "function") {
    queryString = queryString.trim();
    console.log("Trimming string " + queryString);
  }
  if (!queryString) {
    res.status(400);
    res.json([]);
    return;
  }
  var queryTokens = search.processQueryString(queryString);
  if (!queryTokens || queryTokens.length === 0) {
    res.status(400);
    res.json([]);
    return;
  }
  var elasticsearchTemplateString = search.addQueryTokens(queryTokens);
  debug(elasticsearchTemplateString);

  var searchOptions = url.parse(config.search.url);
  searchOptions.pathname = "/" + dbname + "/datum/_search";

  debug("searchOptions ", searchOptions, elasticsearchTemplateString);
  debug("elasticsearchTemplateString ", elasticsearchTemplateString);
  request({
    data: elasticsearchTemplateString,
    json: true,
    method: "POST",
    uri: url.format(searchOptions)
  }, function(err, response, body) {
    debug("requested search result", err, body);
    if (err) {
      return next(err);
    }
    if (response.statusCode >= 400) {
      body.status = response.statusCode;
      return next(body);
    }

    res.status(response.statusCode);
    body.original = elasticsearchTemplateString;
    res.json(body);
  });
}

/**
 * Re-index a database
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-update.html
 *
 * @param  {Request} req
 * @param  {Response} res
 * @param  {Function} next
 */
function indexDatabase(req, res, next) {
  debug("indexDatabase", req.params);

  var dbname = req.params.dbname;
  debug("Config", config, process.env);
  var couchDBOptions = url.parse(config.corpus.url);
  couchDBOptions.auth = "public:none"; // Not indexing non-public data couch_keys.username + ":" + couch_keys.password;
  couchDBOptions.pathname = "/" + dbname + "/_design/search/_view/searchable";
  couchDBOptions.query = {
    limit: 4
  };

  debug("GET ", couchDBOptions);
  request({
    json: true,
    method: "GET",
    uri: url.format(couchDBOptions)
  }, function(err, response, couchDBResult) {
    debug("requested training data", couchDBResult);
    if (err || couchDBResult.reason) {
      return next(err || couchDBResult);
    }
    if (response.statusCode >= 400) {
      couchDBResult.status = response.statusCode;
      return next(couchDBResult);
    }

    // create bulk requests
    var data = [];
    couchDBResult.rows.map(function(row) {
      var searchable = row.key;
      data.push({
        "index": {
          "_id": row.id,
          "_type": "datum",
          "_index": dbname
        }
      });
      data.push(searchable);
    });

    // convert into 1 request per line
    data = data.map(JSON.stringify).join("\n") + "\n";
    debug("re-indexing with ", data);

    var searchOptions = url.parse(config.search.url);
    searchOptions.pathname = "/" + dbname + "/datum/_bulk";

    debug("searchOptions ", searchOptions);
    request({
      body: data,
      json: true,
      method: "POST",
      uri: url.format(searchOptions)
    }, function(err, response, elasticSearchResult) {
      debug("index search elasticSearchResult", err, elasticSearchResult);
      if (err) {
        return next(err);
      }
      if (response.statusCode >= 400) {
        elasticSearchResult.status = response.statusCode;
        return next(elasticSearchResult);
      }

      res.status(response.statusCode);
      res.json({
        couchDBResult: couchDBResult,
        elasticSearchResult: elasticSearchResult
      });
    });
  });
}

router.post("/:dbname/index", indexDatabase);
router.post("/:dbname", querySearch);

module.exports.querySearch = querySearch;
module.exports.indexDatabase = indexDatabase;

module.exports.router = router;
