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
    grades:{
        type:"array:int",
        default:[]
    }
};

assert.callback("Array of primitive types test",function(end){
    var persistence = apersistence.createMySqlPersistence(mysqlPool);
    persistence.registerModel("TestUser",userModel,function(err,result) {
        var user = apersistence.createRawObject("TestUser", "Johnny Smith");
        user.grades = [2,3];
        persistence.save(user, function (err, user) {
            persistence.findById("TestUser", "Johnny Smith", function (err, user) {
                assert.equal(user.grades.length, 2);
                assert.equal(user.grades[0], 2);
                assert.equal(user.grades[1], 3);
                mysqlPool.query("DROP TABLE TestUser", function (err, result) {
                    mysqlPool.end();
                });

                end();
            })
        })    
        
    })
});
