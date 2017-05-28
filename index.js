#!/usr/bin/env node

var http = require("http");
var https = require("https");
var cheerio = require("cheerio");
var uglifycss = require('uglifycss');
var Url = require('url');
var Q = require('q'); //utiliser q-io (https://github.com/kriskowal/q-io) ?
// var whacko = require('whacko');
//  var HTTP = require("q-io/http"); //<--

var argv = require("nomnom")
    .help("Get a webpage, inline all stylesheet and scripts, output on stdout")
    .options({
        url: {
            position: 0,
            help: "URL adress to crawl",
            list: true
        },
        minify: {
            abbr: 'm',
            flag: true,
            help: 'inline and minify CSS & JS'
        },
        minify_js: {
            abbr: '',
            flag: true,
            help: 'inline and minify JS and inline CSS (unless stripped)'
        },
        minify_css: {
            abbr: '',
            flag: true,
            help: 'minify and inline CSS and inline JS (unless stripped)'
        },
        strip: {
            abbr: 's',
            flag: true,
            help: 'strip all styles and scripts'
        },
        strip_css: {
            abbr: '',
            flag: true,
            help: 'strip all styles'
        },
        strip_js: {
            abbr: '',
            flag: true,
            help: 'strip all scripts'
        },
        es5: {
            abbr: '5',
            flag: true,
            help: 'use ES5 only (ECMAScript 5)'
        }
    })
    .parse();

var processJSInput = null;

var uglifyjs = require(argv.es5 ? 'uglify-js' : 'uglify-es');
var babel = require("babel-core");


if (argv.minify | argv.minify_js) {
    processJSInput = function processJSInput(input) {
        var result = uglifyjs.minify(input, { warnings: true });
        if (result.error) throw(result.error);
        // return result.code;
        result = babel.transform(result.code, { presets: [ 'babel-preset-es2015' ].map(require.resolve) });
        return result.code;
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
            //console.log("data ok :"+url);
            callback(data, url);
        });
    }).on("error", function() {
        callback(null, url);
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
            //console.log("data ok :"+url);
            deferred.resolve(data);
        });
    }).on("error", function(e) {
        deferred.reject(e);
    });

    return deferred.promise;
};


//main function
var processContent = function processContent(data, baseUrl) {
    if (data === null) {
        console.error('Error: resource not loaded at ' + baseUrl);
        process.exit(1);
    }

    //var deferred = new Deferred();
    var $ = cheerio.load(data/*,{
        normalizeWhitespace: true,
        xmlMode: false,
        decodeEntities: false,
        recognizeSelfClosing:true,
        recognizeCDATA:true
    }*/);

    //object containing the promises for stylesheets processing
    var inliningStyle;
    //object containing the promises for script tags processing
    var inliningScripts;

    var promises = [];

    if (argv.strip || argv.strip_css) {
        inlingStyle = $("link[rel='stylesheet'], style").remove();
    } else {
        inliningStyle = $("link[rel='stylesheet']").map(processingCSS);
    }



    if (argv.strip || argv.strip_js) {
        inliningScripts = $('script').remove();
    } else {
        inliningScripts = $('script[src]').map(function() {
            var defer = Q.defer();
            var elem = $(this);
            var script = elem.attr('src');
            if (!script) {
                defer.reject();
            }
            if (script & script.match(/^\/\//)) {
                defer.reject();
            }

            script = Url.resolve(baseUrl, script);

            getRessourceP(script).then(function(data) {
                var out = '';

                if (script.indexOf('min.js') === -1) {
                    out = processJSInput(data);
                } else {
                    out = data;
                }
                elem.replaceWith('<script>' + out + '</script>');
                defer.resolve();
            }).fail(function(error) {
                console.error("Error replacing script : " + error);
            });
            return defer.promise;
        });
    }

    //concatening all the promises into an array
    if (inliningStyle && inliningStyle.length) {
        promises = [].slice.call(inliningStyle);
    }

    promises = promises.concat([].slice.call(inliningScripts));

    //when all promises have resolved, output the processed html document
    Q.all(promises).then(function() {
        console.log($.html());
    }).fail(function(error) {
        console.error("Something wrong happened. Error writing html : "+error);
    });

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

        style = Url.resolve(baseUrl, style);

        getRessourceP(style).then(function(data) {
            elem.replaceWith('<style>' + processCSSInput(data) + '</style>');
            defer.resolve();
        }).fail(function(error) {
            console.error("Error replacing css : " + error);
        });
        return defer.promise;
    }
};

//for each url in arguments (useful ? most of time, it will be 1)
argv._.forEach(function(urlToSmoosh) {
    getRessource(urlToSmoosh, processContent);

});
