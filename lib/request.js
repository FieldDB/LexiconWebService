'use strict';

var debug = require("debug")("lib:jsonrequest");
var http = require("http");
var https = require("https");

module.exports = function makeJSONRequest(options, onResult) {
  var httpOrHttps = http;
  var data = options.data;
  if (options.protocol === "https://") {
    httpOrHttps = https;
  }
  delete options.protocol;
  delete options.data;

  debug("Requesting ", options);
  var req = httpOrHttps.request(options, function(res) {
    var output = "";
    // res.setEncoding("utf8");

    res.on("data", function(chunk) {
      output += chunk;
    });

    res.on("end", function() {
      var obj = JSON.parse(output);
      onResult(res.statusCode, obj);
    });
  });
  // req.setHeader("Content-type", "application/json; charset=utf-8");

  req.on("error", function(err) {
    console.log("Error searching for " + JSON.stringify(data));
    console.log(options);
    console.log(err);
    onResult(500, err);
  });

  if (data) {
    debug("data is a object?", data.constructor !== String);
    if (data.constructor !== String) {
      debug("stringifying data", data);
      data = JSON.stringify(data);
    }
    debug("sending data", data);
    req.write(data, "utf8");
    req.end();
  } else {
    req.end();
  }
};
