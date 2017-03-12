"use strict";
var config = require("config");
var debug = require("debug")("test:integration:search");
var expect = require("chai").expect;
var nock = require("nock");
var supertest = require("supertest");

var api = require("../../");
var fixtures = {
  search: {
    index: {
      kartuli: require("../fixtures/search/kartuli/index"),
      quechua: require("../fixtures/search/quechua/index")
    },
    createIndex: {
      kartuli: require("../fixtures/search/kartuli/create-index")
    },
    properties: {
      kartuli: require("../fixtures/search/kartuli/properties")
    },
    query: {
      kartuli: require("../fixtures/search/kartuli/utterance:ar")
    }
  },
  database: {
    kartuli: require("../fixtures/database/kartuli/searchable"),
    quechua: require("../fixtures/database/quechua/searchable")
  }
};

// could take 5 or 6 ms
delete fixtures.search.index.kartuli.took;
delete fixtures.search.query.kartuli.took;

fixtures.search.index.kartuli.items.map(function(item) {
  delete item.index._version; // version will increase on each request
  delete item.index.status; // status might be 201 created or 200 updated
  delete item.index._shards.successful; // successful will match the number of shards
});

fixtures.search.index.quechua.items.map(function(item) {
  delete item.index._version; // version will increase on each request
  delete item.index.status; // status might be 201 created or 200 updated
  delete item.index._shards.successful; // successful will match the number of shards
});

delete fixtures.search.properties.kartuli["testinglexicon-kartuli"].settings.index.creation_date;
delete fixtures.search.properties.kartuli["testinglexicon-kartuli"].settings.index.uuid;

var useNocks = process.env.USE_NOCK;

describe("/v1", function() {

  before(function() {
    if (useNocks) {
      nock.disableNetConnect();
      nock.enableNetConnect("127.0.0.1");
    }
  });

  after(function() {
    if (useNocks) {
      nock.enableNetConnect();
    }
  });

  it("should use fixtures", function() {
    expect(fixtures.search).to.be.an("object");
    expect(fixtures.search.index).to.be.an("object");
    expect(fixtures.search.index.kartuli).to.be.an("object");
    expect(fixtures.search.index.quechua).to.be.an("object");

    expect(fixtures.search.index.kartuli.items).to.be.an("array");
    expect(fixtures.search.index.quechua.items).to.be.an("array");

    expect(fixtures.search.query.kartuli).to.be.an("object");
    expect(fixtures.search.query.kartuli.hits).to.be.an("object");

    expect(fixtures.database).to.be.an("object");
    expect(fixtures.database.kartuli).to.be.an("object");
    expect(fixtures.database.quechua).to.be.an("object");

    expect(fixtures.database.kartuli.rows).to.be.an("array");
    expect(fixtures.database.quechua.rows).to.be.an("array");
  });

  describe("indexing", function() {
    it("should have a template", function(done) {
      supertest(config.search.url)
        .get("/_template")
        .expect("Content-Type", "application/json; charset=UTF-8")
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.equal({});
          done();
        });
    });

    it("should (re-)index a metadata heavy database", function(done) {
      this.timeout(10 * 1000);

      var corpusNock;
      var searchNock;
      if (useNocks) {
        corpusNock = nock(config.corpus.url)
          .get("/testinglexicon-quechua/_design/search/_view/searchable")
          .query({
            limit: 4
          })
          .reply(200, fixtures.database.quechua);

        searchNock = nock(config.search.url)
          // .filteringRequestBody(/.*/, "*")
          .post("/testinglexicon-quechua/datum/_bulk", function(body) {
            debug("posted body was", body);
            return true;
          })
          .reply(200, fixtures.search.index.quechua);
      }

      supertest(api)
        .post("/search/testinglexicon-quechua/index")
        .query({
          limit: 4
        })
        .expect("Content-Type", "application/json; charset=utf-8")
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          if (useNocks) {
            corpusNock.done();
            searchNock.done();
          }

          if (res.status >= 500) {
            expect(res.body.message).to.not.equal("connect ECONNREFUSED 127.0.0.1:9200");
            expect(res.body).to.deep.equal({});
            return done();
          }

          if (res.status >= 400) {
            expect(res.body.message).to.not.equal("Failed to derive xcontent");
            expect(res.body).to.deep.equal({});
            return done();
          }

          debug(JSON.stringify(res.body.couchDBResult, null, 2));
          expect(res.body.couchDBResult).to.deep.equal(fixtures.database.quechua);

          // could take 5 or 6 ms
          debug(JSON.stringify(res.body.elasticSearchResult, null, 2));
          delete res.body.elasticSearchResult.took;

          res.body.elasticSearchResult.items.map(function(item) {
            delete item.index.created; // maybe true or false
            delete item.index.result; // maybe created or updated
            delete item.index._version; // version will increase on each request
            delete item.index.status; // status might be 201 created or 200 updated
            delete item.index._shards.successful; // successful will match the number of shards
          });
          // debug(JSON.stringify(res.body.elasticSearchResult, null, 2));
          expect(res.body.elasticSearchResult).to.deep.equal(fixtures.search.index.quechua);

          done();
        });
    });

    it("should (re-)index a media heavy database", function(done) {
      this.timeout(10 * 1000);
      var corpusNock;
      var searchNock;
      if (useNocks) {
        corpusNock = nock(config.corpus.url)
          .get("/testinglexicon-kartuli/_design/search/_view/searchable")
          .query({
            limit: 4
          })
          .reply(200, fixtures.database.kartuli);

        searchNock = nock(config.search.url)
          // .filteringRequestBody(/.*/, "*")
          .post("/testinglexicon-kartuli/datum/_bulk", function(body) {
            debug("posted body was", body);
            return true;
          })
          .reply(200, fixtures.search.index.kartuli);
      }

      supertest(api)
        .post("/search/testinglexicon-kartuli/index")
        .query({
          limit: 4
        })
        .expect("Content-Type", "application/json; charset=utf-8")
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          if (useNocks) {
            corpusNock.done();
            searchNock.done();
          }

          if (res.status >= 500) {
            expect(res.body.message).to.not.equal("connect ECONNREFUSED 127.0.0.1:9200");
            expect(res.body).to.deep.equal({});
            return done();
          }

          if (res.status >= 400) {
            expect(res.body.message).to.not.equal("Failed to derive xcontent");
            expect(res.body).to.deep.equal({});
            return done();
          }

          debug("res.body.couchDBResult", JSON.stringify(res.body.couchDBResult, null, 2));
          expect(res.body.couchDBResult).to.deep.equal(fixtures.database.kartuli);

          var elasticSearchResult = res.body.elasticSearchResult;
          // could take 5 or 6 ms
          delete elasticSearchResult.took;

          elasticSearchResult.items.map(function(item) {
            delete item.index.result;
            delete item.index.created;
            delete item.index._version; // version will increase on each request
            delete item.index.status; // status might be 201 created or 200 updated
            delete item.index._shards.successful; // successful will match the number of shards
          });

          debug(JSON.stringify(elasticSearchResult, null, 2));
          expect(elasticSearchResult).to.deep.equal(fixtures.search.index.kartuli);

          if (useNocks) {
            searchNock = nock(config.search.url)
              .get("/testinglexicon-kartuli")
              .reply(200, fixtures.search.properties.kartuli);
          }
          
          // look at the index properties
          supertest(config.search.url)
            .get("/testinglexicon-kartuli")
            .end(function(err, res) {
              if (err) {
                return done(err);
              }
              if (useNocks) {
                searchNock.done();
              }

              debug(JSON.stringify(res.body, null, 2));
              delete res.body["testinglexicon-kartuli"].settings.index.creation_date;
              delete res.body["testinglexicon-kartuli"].settings.index.uuid;
              if (res.body["testinglexicon-kartuli"].settings.index.numberOfReplicas) {
                res.body["testinglexicon-kartuli"].settings.index.number_of_replicas = res.body["testinglexicon-kartuli"].settings.index.numberOfReplicas;
                delete res.body["testinglexicon-kartuli"].settings.index.numberOfReplicas;
              }
              if (res.body["testinglexicon-kartuli"].settings.index.numberOfShards) {
                res.body["testinglexicon-kartuli"].settings.index.number_of_shards = res.body["testinglexicon-kartuli"].settings.index.numberOfShards;
                delete res.body["testinglexicon-kartuli"].settings.index.numberOfShards;
              }
              expect(res.body).to.deep.equal(fixtures.search.properties.kartuli);

              done();
            });
        });
    });
  });

  describe("search", function() {
    it("should search a database", function(done) {
      this.timeout(10 * 1000);
      var searchNock;
      if (useNocks) {
        searchNock = nock(config.search.url)
          .post("/testinglexicon-kartuli/datum/_search")
          .reply(200, fixtures.search.query.kartuli);
      }

      supertest(api)
        .post("/search/testinglexicon-kartuli")
        .send({
          value: "orthography:არ OR translation:don't"
            // value: "orthography:არ"
        })
        .expect("Content-Type", "application/json; charset=utf-8")
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          if (useNocks) {
            searchNock.done();
          }

          if (res.status === 401) {
            expect(res.status).to.equal(401);
            expect(res.body).to.deep.equal({
              message: "action [indices:data/read/search] requires authentication",
              error: {},
              status: 401
            });
            return done();
          }

          if (res.status === 500) {
            expect(res.status).to.equal(500);

            if (res.body.message.indexOf("ECONNREFUSED") > -1) {
              expect(res.body).to.deep.equal({
                message: "connect ECONNREFUSED 127.0.0.1:9200",
                error: {
                  address: "127.0.0.1",
                  code: "ECONNREFUSED",
                  errno: "ECONNREFUSED",
                  port: 9200,
                  syscall: "connect"
                },
                status: 500
              });
              return done();
            }

            expect(res.body).to.deep.equal({
              message: "Unknown cluster.",
              error: {},
              status: 500
            });
            return done();
          }

          if (res.status >= 400) {
            expect(res.body).to.deep.equal({
              message: "no such index",
              error: {
                error: {
                  root_cause: [{
                    type: "index_not_found_exception",
                    reason: "no such index",
                    "resource.type": "index_or_alias",
                    "resource.id": "testinglexicon-kartuli",
                    index_uuid: "_na_",
                    index: "testinglexicon-kartuli"
                  }],
                  type: "index_not_found_exception",
                  reason: "no such index",
                  "resource.type": "index_or_alias",
                  "resource.id": "testinglexicon-kartuli",
                  index_uuid: "_na_",
                  index: "testinglexicon-kartuli"
                },
                status: 404
              },
              status: 404
            });
            return done();
          }

          debug(JSON.stringify(res.body, null, 2));
          expect(res.body.hits.total).to.equal(4);
          delete res.body.took;
          expect(res.body).to.deep.equal(fixtures.search.query.kartuli);

          done();
        });
    });
  });
});
