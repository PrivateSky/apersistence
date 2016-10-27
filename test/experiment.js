/**
 * Created by ctalmacel on 1/5/16.
 */

var apersistence = require("../lib/abstractPersistence.js");
var mysqlUtils = require("../db/sql/mysqlUtils");
var assert       = require('double-check').assert;
var exceptions   = require('double-check').exceptions;
var modelUtil  = require("../lib/ModelDescription");
var mysql      = require('mysql');
var mysqlConnection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'operando',
    database : 'operando'
});

mysqlConnection.query("SELECT * from DefaultUser",console.log)