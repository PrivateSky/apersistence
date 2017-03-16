/**
 * Created by ciprian on 3/16/17.
 */


var apersistence = require("../lib/abstractPersistence.js");
var mysqlUtils = require("../db/sql/mysqlUtils");
var modelUtil  = require("../lib/ModelDescription");
var assert = require('double-check').assert;
var mysql      = require('mysql');
var mysqlPool = mysql.createPool({
    host     : 'localhost',
    user     : 'root',
    password : 'operando',
    database : 'operando'
});

var userModel = {
    name: {
        pk:true,
        type:'string',
        default:"Mircea Cartarescu"
    },
    book1:{
        type:"TestBook",
        default:"First book"
    },
    book2:{
        type:"TestBook",
        default:"Second book"
    }
};
var bookModel = {
    name:{
        pk:true,
        type:'string'
    }
};
var persistence = apersistence.createMySqlPersistence(mysqlPool);
function storeSomeBooks(callback){
    var book1 = apersistence.createRawObject("TestBook","Shogun");
    var book2 = apersistence.createRawObject("TestBook","War And Peace");
    persistence.save(book1,function(err,result){
        if(err){
            callback(err);
        }else {
            persistence.save(book2, function (err, result) {
                if (err) {
                    callback(err)
                }else {
                    callback(null, [book1, book2]);
                }
            })
        }
    })
}

assert.steps("Load lazy objects test",[
    function(next) {
        persistence.registerModel("TestBook", bookModel, function (err, result) {
        });
        persistence.registerModel("TestUser", userModel, function (err, result) {
            next();
        })
    },
    function(next){
        storeSomeBooks(function(err,books) {
            var user = apersistence.createRawObject("TestUser", "Johnny Smith");
            user.book1 = books[0];
            user.book2 = books[1];
            persistence.save(user, function (err, user) {
                next()
            })
        })
    },
    function(next) {
        persistence.findById("TestUser", "Johnny Smith", function (err, user) {
            assert.equal(user.name, "Johnny Smith");
            assert.equal(user.book1, "Shogun");
            user.__meta.loadLazyFields(function (err, user) {
                assert.equal(user.book1.name, "Shogun");
                assert.equal(user.book2.name, "War And Peace");
                assert.equal(user.book1.__meta !== undefined, true);
                mysqlPool.query("DROP TABLE TestUser", function (err, result) {
                    mysqlPool.query("DROP TABLE TestBook", function (err, result) {
                        mysqlPool.end();
                    });
                });
                next();
            })
        })
    }]);




