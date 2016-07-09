var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var express = require('express');
var path = require('path');
var validator = require('validator');
var url = 'mongodb://test:test1@ds017185.mlab.com:17185/api'; //nothing else in here, don't bother :P


var app = express();
app.enable('trust proxy');
app.listen(process.env.PORT || 3000, function() { //need to adapt port to work correctly on heroku
    console.log("URL shortener listening on port 3000.");
});

app.use(express.static('public'));

app.get('/new/*', function(req, res) {
    var doc = {};
    var suspect = req.originalUrl.slice(5);
    if (validator.isURL(suspect)) {
        //put the new pair into database, reply with JSON of what was added
        MongoClient.connect(url, function(err, db) {
            assert.equal(null, err);
            if (err)
                console.log("Fire!");
            else {
                db.collection('urls').find({
                    "docs": {
                        $exists: true
                    }
                }).toArray(function(err, docs) {
                    doc = {
                        "original": suspect,
                        "short": req.protocol + '://' + req.get('host') + '/' + docs[0].docs
                    };
                    res.send(JSON.stringify(doc));
                    db.collection('urls').insertOne(doc);
                    console.log("Document successfully added.");
                });
                db.collection('urls').updateOne({
                    "docs": {
                        $exists: true
                    }
                }, {
                    $inc: {
                        "docs": 1
                    }
                }, function(err, results) {
                    assert.equal(err, null);
                    db.close();
                });
            }
        });
    } else {
        res.end(JSON.stringify({"error":"invalid url"}));
    }
});

app.use('/:shortForm', function(req, res) {
    if (typeof + req.params.shortForm !== "number") {
        res.end("That is not a valid URL. If you're looking to convert a URL, use this format: " + req.protocol + '://' + req.get('host') + '/new/<your-long-url-here>');
    } else {
        MongoClient.connect(url, function(err, db) {
            assert.equal(null, err);
            db.collection('urls').findOne({
                "short":  req.protocol + '://' + req.get('host') + req.originalUrl
            }, function(err, doc) {
                if (doc) {
					console.log("Successful redirect to " + doc.original);
                    res.redirect(doc.original);
                } else {
                    res.end("No URL match found. If you're looking to convert a URL, use this format: " + req.protocol + '://' + req.get('host') + '/new/<your-long-url-here>');
                }
            });
        });
    }
});


app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});
