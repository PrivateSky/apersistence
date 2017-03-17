/**
 * Created by ctalmacel on 1/5/16.
 */




var apersistence = require("../lib/abstractPersistence.js");
var mysqlUtils = require("../db/sql/mysqlUtils");
var modelUtil  = require("../lib/ModelDescription");
var mysql      = require('mysql');
var mysqlPool = mysql.createPool({
    host     : 'localhost',
    user     : 'root',
    password : 'operando',
    database : 'operando'
});

var book = {
    name: {
        type:'string',
        default:"0",
        pk:true
    }
},user = {
    name: {
        pk:true,
        type:'string',
        default:"Mircea Cartarescu"
    },
    books:{
        type:"array:Book",
        default:[]
    }
};


var persistence = apersistence.createMySqlPersistence(mysqlPool);
persistence.registerModel("Book",book,function(err,result) {
});
persistence.registerModel("User",user,function(err,result){
    persistence.findById("User","1",function(err,user){
        user.__meta.loadLazyFields(function(err,user){
            console.log(user);
            var newBook = persistence.createRaw("Some beautiful book");
            user.books = ["Some other book"];
            persistence.save(user,function(err,result){
                persistence.findById("User","1",function(err,user){
                    console.log(user);
                });
            });
        });
    })
});

