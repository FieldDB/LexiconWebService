"use strict";

var debug = require("debug")("routes:inuktitut");
var express = require("express");
var exec = require("child_process").exec;

var router = express.Router();

function useUqailaut(req, res) {

  var searchTerm = encodeURIComponent(req.params.word);

  var command = "./lib/uqailaut.sh " + searchTerm;
  exec(command, function(err, stdout, stderr) {
    debug("stderr", stderr);
    if (err) {
      throw err;
    } else {
      debug("Analyzed: " + searchTerm);
      debug("sent results: " + stdout);

      var results = stdout.split("\n");
      results.pop();

      res.json({
        "output": results
      });
    }
  });

}

function filterOutput(output, returnTier) {
  switch (returnTier) {
    case "all":
      return output;
    case "allomorphs":
      return output.analysisByTierByWord.allomorphs;
    case "morphemes":
      return output.analysisByTierByWord.morphemes;
    case "gloss":
      return output.analysisByTierByWord.glosses;
    case "morphosyntacticcategories":
      return output.analysisByTierByWord.glosses;
  }
}

function analyzeInuktitutByTierByWord(req, res, returnTier) {
  var searchTerm = encodeURIComponent(req.params.word).split("%20");
  var allomorphs = {};
  var morphemes = {};
  var glosses = {};
  var farley = {};
  var submittedTerms = searchTerm.length;
  var processedTerms = 0;

  for (var word in searchTerm) {
    allomorphs[searchTerm[word]] = [];
    morphemes[searchTerm[word]] = [];
    glosses[searchTerm[word]] = [];
  }


  searchTerm.map(function(currentWord) {
    var command = "./lib/uqailaut.sh " + currentWord;
    exec(command, function(err, stdout, stderr) {
      debug("stderr", stderr);
      var output;
      if (err) {
        throw err;
      } else {
        debug("Analyzed: " + currentWord);

        var results = stdout.split("\n");
        results.pop();
        farley[currentWord] = results;

        if (results.length === 0) {

          allomorphs[currentWord].push(currentWord);
          morphemes[currentWord].push(currentWord);
          glosses[currentWord].push(currentWord);

          processedTerms++;
          if (processedTerms === submittedTerms) {
            output = filterOutput({
              analysisByTierByWord: {
                allomorphs: allomorphs,
                morphemes: morphemes,
                glosses: glosses
              },
              farley: farley
            }, returnTier);
            debug("Sent results: \n" + JSON.stringify(output));
            res.json(output);
          }

        } else {

          var aReg = new RegExp(/([^{:\/}]+)(?=\:)/g),
            mReg = new RegExp(/([^{:\/}]+)(?=\/)/g),
            gReg = new RegExp(/([^{:\/}]+)(?=\})/g);

          for (var line in results) {
            var aMatch = results[line].match(aReg).join("-"),
              mMatch = results[line].match(mReg).join("-"),
              gMatch = results[line].replace(/-/g, ".").match(gReg).join("-");

            if (allomorphs[currentWord].indexOf(aMatch) === -1) {
              allomorphs[currentWord].push(aMatch);
            }
            if (morphemes[currentWord].indexOf(mMatch) === -1) {
              morphemes[currentWord].push(mMatch);
            }
            if (glosses[currentWord].indexOf(gMatch) === -1) {
              glosses[currentWord].push(gMatch);
            }

          }
          processedTerms++;
          if (processedTerms === submittedTerms) {
            output = filterOutput({
              analysisByTierByWord: {
                allomorphs: allomorphs,
                morphemes: morphemes,
                glosses: glosses
              },
              farley: farley
            }, returnTier);
            debug("Sent results: \n" + JSON.stringify(output));
            res.json(output);
          }
        }
      }
    });
  });
}

router.all("/farley/inuktitut/:word", useUqailaut);

router.all("/analysisbytierbyword/inuktitut/:word", function(req, res) {
  analyzeInuktitutByTierByWord(req, res, "all");
});

router.all("/allomorphs/inuktitut/:word", function(req, res) {
  analyzeInuktitutByTierByWord(req, res, "allomorphs");
});

router.all("/morphemes/inuktitut/:word", function(req, res) {
  analyzeInuktitutByTierByWord(req, res, "morphemes");
});

router.all("/morphosyntacticcategories/inuktitut/:word", function(req, res) {
  analyzeInuktitutByTierByWord(req, res, "morphosyntacticcategories");
});

router.all("/gloss/inuktitut/:word", function(req, res) {
  analyzeInuktitutByTierByWord(req, res, "gloss");
});

module.exports.useUqailaut = useUqailaut;
module.exports.analyzeInuktitutByTierByWord = analyzeInuktitutByTierByWord;

module.exports.router = router;
