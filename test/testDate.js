/**
 * Created by Rafa on 2/17/2017.
 */

var assert       = require('double-check').assert;
var apersistence = require("../lib/abstractPersistence.js");
var redis = require("redis");
var async = require("asynchron");

var callflow = require("callflow");

var redisConnection = async.bindAllMembers(redis.createClient());
var persistence = apersistence.createRedisPersistence(redisConnection);


persistence.registerModel("TestDateModel", {
    name:{
      type:"string",
      pk:true,
      index:true

    },
    date: {
        type:'date'
    }

},function(err, result){
    assert.equal(err,null, "Error on creating model");
});


var currentDate = new Date();



assert.callback("Test date", function(end){
    var testSameDate=function(date){
        console.log("Retrieved date:",date,currentDate);
        assert.equal(currentDate, date,"Dates should be the same.");
        end();
    }

    var dateFlowTest = callflow.create("dateTest",{
        begin:function(){
            //console.log("BEGIN");
            persistence.lookup("TestDateModel", "1d23", this.continue("addDate"));
        },

        addDate:function(err, dateObj){
            //console.log("ADD DATE");
            dateObj['date'] = currentDate;
            persistence.saveObject(dateObj, this.continue("checkDate"));
        },

        checkDate:function(err, obj){
            //console.log("CHECK DATE");
            persistence.lookup("TestDateModel", obj.name, this.continue("validateDate"));
        },
        validateDate:function(err, date){
            //console.log("VALIDATE DATE");
            testSameDate(date['date']);
        }

    });
    dateFlowTest();
})








