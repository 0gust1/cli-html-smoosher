#!/usr/bin/env node
 //module.exports = function(){

var http = require("http");
var https = require("https");
var optimist = require("optimist");
var cheerio = require("cheerio");
var uglifyjs = require('uglifyjs');
var uglifycss = require('uglifycss');
var Url = require('url');
var Q = require('q'); //utiliser q-io (https://github.com/kriskowal/q-io) ?
// var whacko = require('whacko');
//  var HTTP = require("q-io/http"); //<--

var argv = optimist
  .usage('Request a web page and output it (with inlined/stripped/minified CSS & JS) on stdout.\n Usage: $0 url [--option] ')
  .boolean(['minify', 'minify_js', 'minify_css', 'strip', 'strip_js', 'strip_css'])
  .describe('minify', 'inline and minify CSS & JS')
  .describe('strip', 'strip all JS and CSS from the web page')
  .describe('minify-js', 'inline and minify JS and inline CSS (unless stripped)')
  .describe('minify-css', 'minify and inline CSS and inline and inline JS (unless stripped)')
  .describe('strip_js', 'strip all JS, inline CSS')
  .describe('strip_css', 'you should be able to figure it out, no ?')
  .argv;

//CLI options :

//minify
//minify-js
//minify-css

//strip-js
//strip-css

var processJSInput = null;
debugger;
if (argv.minify | argv.minify_js) {
  processJSInput = function processJSInput(input) {
    return uglifyjs.minify(input, {
      fromString: true
    }).code;
  };
} else {
  processJSInput = function processJSInput(input) {
    return input;
  };
}
var processCSSInput = null;
if (argv.minify | argv.minify_css) {
  processCSSInput = function processCSSInput(input) {
    return uglifycss.processString(input);
  };
} else {
  processCSSInput = function processCSSInput(input) {
    return input;
  };
}

//async http get - callback version
var getRessource = function getRessource(url, callback) {
  var req = http;

  if (Url.parse(url).protocol == "https:") {
    req = https;
  }

  req.get(url, function(res) {
    var data = "";
    res.on("data", function(chunk) {
      data += chunk;
    });
    res.on("end", function() {
      callback(data, url);
    });
  }).on("error", function() {
    callback(null);
  });
};

//async http get - promise version
var getRessourceP = function getRessourceP(url) {

  var deferred = new Q.defer();
  var req = http;

  if (Url.parse(url).protocol == "https:") {
    req = https;
  }
  req.get(url, function(res) {
    var data = "";
    res.on("data", function(chunk) {
      data += chunk;
    });
    res.on("end", function() {
      deferred.resolve(data);
    });
  }).on("error", function(e) {
    deferred.reject(e);
  });

  return deferred.promise;
};

/*var stripCSS = function stripCSS(){

};

var stripJS = function stripJS(){
  //this.$
};

var processingCSS = function processCSS(){
  var defer = Q.defer();
    var elem = $(this);
    var style = elem.attr('href');
    if (!style) {
        defer.reject();
    }
    if (style.match(/^\/\//)) {
        defer.reject();
    }
    // if (Url.parse(style).protocol) {
    //   return;
    // }

    style = Url.resolve(baseUrl, style);

    getRessourceP(style).then(function(data) {
      elem.replaceWith('<style>' + processCSSInput(data) + '</style>');
      defer.resolve();
    });
    return defer.promise;
};

var processingJS = function processJS(elem){
  //var elem = $(this);
    var defer = Q.defer();
    var script = elem.attr('src');
    if (!script) {
      defer.reject();
    }
    if (script.match(/^\/\//)) {
       defer.reject();
    }
    // if (Url.parse(script).protocol) {
    //   return;
    // }

    script = Url.resolve(baseUrl, script);

    getRessourceP(script).then(function(data) {
      elem.replaceWith('<script>' + processJSInput(data) + '</script>');
      defer.resolve();
    });
    return defer.promise;
};*/

//main function
var processContent = function processContent(data, baseUrl) {
  //var deferred = new Deferred();
  var $ = cheerio.load(data);
  var promises = [];
    debugger;
  //object containing the promises for stylesheets processing
  var inliningStyle = $("link[rel='stylesheet']").map(processingCSS);

    function processingCSS() {
        var defer = Q.defer();
        var elem = $(this);
        var style = elem.attr('href');
        if (!style) {
            defer.reject();
        }
        if (style.match(/^\/\//)) {
            defer.reject();
        }
        // if (Url.parse(style).protocol) {
        //   return;
        // }

        style = Url.resolve(baseUrl, style);

        getRessourceP(style).then(function (data) {
            elem.replaceWith('<style>' + processCSSInput(data) + '</style>');
            defer.resolve();
        });
        return defer.promise;
    }

    //object containing the promises for script tags processing
  var inliningScripts = $('script[src]').map(function(){
      var defer = Q.defer();
      var elem = $(this);
      var script = elem.attr('src');
      if (!script) {
          defer.reject();
      }
      if (script & script.match(/^\/\//)) {
          defer.reject();
      }
      // if (Url.parse(script).protocol) {
      //   return;
      // }

      script = Url.resolve(baseUrl, script);

      getRessourceP(script).then(function(data) {
          elem.replaceWith('<script>' + processJSInput(data) + '</script>');
          defer.resolve();
      });
      return defer.promise;
  });

  //concatening all the promises into an array
  promises = [].slice.call(inliningStyle);
  promises.concat([].slice.call(inliningScripts));

  //when all promises have resolved, output the processed html document
  Q.all(promises).then(function() {
    console.log($.html());
  });


};

argv._.forEach(function(element) {
  getRessource(element, processContent);

});


