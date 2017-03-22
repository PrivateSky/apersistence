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
    books:{
        type:"array:UserBooksMapping",
        relation:"name:author"
    }
};

// how do we make sure that the same object is not loaded twice?!!!

var userBooksMapping = {
    "author":{
        type:"string",
        index:true
    },
    "bookName":{
        type:"string",
        index:true,
        pk:true
    },
    "book":{
        type:"TestBook",
        relation:"bookName:name"
    }
}

var bookModel = {
    name:{
        pk:true,
        type:'string'
    }
};



var persistence = apersistence.createMySqlPersistence(mysqlPool);

assert.steps("Array of objects test",[
    function(next) {
        persistence.registerModel("TestBook", bookModel, function (err, result) {
        });
        persistence.registerModel("UserBooksMapping", userBooksMapping, function (err, result) {
        });
        persistence.registerModel("TestUser", userModel, function (err, result) {
            next();
        })
    },
    function(next){
        function storeSomeBooks(callback){
            var book1 = apersistence.createRawObject("TestBook", "Shogun");
            var book2 = apersistence.createRawObject("TestBook", "War And Peace");

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

        function storeMappings(callback){
            var map1 = apersistence.createRawObject("UserBooksMapping","Shogun");
            map1.author = "Mircea Cartarescu";
            var map2 = apersistence.createRawObject("UserBooksMapping","War And Peace");
            map2.author = "Mircea Cartarescu";

            persistence.save(map1,function(err,result){
                if(err){
                    callback(err);
                }else {
                    persistence.save(map2, function (err, result) {
                        if (err) {
                            callback(err)
                        }else {
                            callback(null);
                        }
                    })
                }
            })

        }

        storeSomeBooks(function(err,books) {
            storeMappings(function(err) {
                var user = apersistence.createRawObject("TestUser","Mircea Cartarescu");
                persistence.save(user, function (err, user) {
                    next()
                })
            })
        })
    },
    function(next) {
        persistence.findById("TestUser", "Mircea Cartarescu", function (err, user) {
            user.__meta.loadLazyField("books",function (err, user) {
                
                assert.equal(user.books[1].bookName,"War And Peace","Should load the right mapping");
                assert.equal(user.books[1].__meta!==undefined,true,"The book mapping should be an object");

                user.books[1].__meta.loadLazyFields(function(err,loadedBookMapping){
                    assert.equal(loadedBookMapping.book.name, 'War And Peace',"Should load the right book");
                    assert.equal(loadedBookMapping.book.__meta!==undefined,true,"The loaded book should be an object");
                    
                    assert.equal(user.books[1].book.name , "War And Peace","The user should have the right book loaded")
                    next();
                })
            })
        })
    },
    function(next){
        mysqlPool.query("DROP TABLE TestUser",function(err,result){
            mysqlPool.query("DROP TABLE TestBook",function(err,result) {
                mysqlPool.query("DROP TABLE UserBooksMapping",function(err,result) {
                    mysqlPool.end();
                })
            });
        });
        next();
    }
],1000);





