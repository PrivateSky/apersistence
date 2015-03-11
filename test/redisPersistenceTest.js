
var assert = require("assert");
var apersistence = require("../lib/persistence.js");
var async = require("asynchron");
var redis = require("redis");


var redisConnection = async.bindAllMembers(redis.createClient());
var persistence = apersistence.createRedisPersistence(redisConnection);


persistence.registerModel("TestModel", {
    name: {
        type:'string',
        default:"no name",
        pk:true
    },
    age: {
        type:'int',
        default:0,
        index:true
    },
    sex: {
    type:'boolean',
    default:true
    }
});

var t1 = persistence.lookup.async("TestModel", "T1");
var t11 = persistence.lookup.async("TestModel", "T11");
var t3 = persistence.lookup.async("TestModel", "T2");



(function(t1, t11, t3){
    t1.age = 1;
    t11.age = 1;
    t3.age = 3;
    console.log("Loading objects... starting tests:");
    persistence.save(t1);
    persistence.save(t11);
    persistence.save(t3);
}).wait(t1, t11, t3);


setTimeout(function(){
  var values =  persistence.filter.async("TestModel", {"age": 1});
    (function(values){
        console.log("Test 1 values", values);
        assert.equals(values.length, 2);
    }).wait(values);

    var age3Values =  persistence.filter.async("TestModel", {"age": 3});
    (function(age3Values){
        console.log("Test 2 values", age3Values);
        assert.equals(age3Values.length, 1);
    }).wait(age3Values);

    /*
    var sexValues =  persistence.filter.async("TestModel", {"sex": true});
    (function(sexValues){
        console.log("Failed test!");
    }).wait(sexValues, function(err){
            console.log("Negative test passed also!");
        }); */
    process.exit(0);
}, 1000);