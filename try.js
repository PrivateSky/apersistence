var apersistence = require("./lib/abstractPersistence");
var redis = require("redis");
var async = require("asynchron");
var model_utils = require ("./lib/ModelDescription");
var crypto = require('crypto')
var conn = async.bindAllMembers(redis.createClient());
var persistence = apersistence.createRedisPersistence(conn);


persistence.registerModel("Person", {
    name: {
        type:'string',
        default:"no name",
        pk:true,
        security: 'eq'
    },
    lastName: {
        type:'string',
        default:'',
        index: true
    },
    age: {
        type: 'int',
        default: 20,
        security: 'ord'
    }
},function(){});

var object1 = persistence.lookup.async("Person", "person1");
var object2 = persistence.lookup.async("Person", "person2");
var object3 = persistence.lookup.async("Person", "person3");

function get_key() {
    return "mysuperstrongpassword"
}

function get_key2() {
    return "cacaasdfghj"
}

KEY = get_key2();

(function(object1, object2, object3) {

    object1.name = "name1"
    object1.lastName = "lastName1"
    object1.age = 21
    object1.key = {"name": KEY, "age": KEY}

    object2.name = "name2"
    object2.lastName = "lastName2"
    object2.age = 24

    object3.name = "name3"
    object3.lastName = "lastName3"
    object3.age = 21

    

    console.log("================SAVE================\n")
    persistence.saveObject(object1, function(err, res) {
        console.log("OBJECT1:");
        console.log(res.__meta.savedValues);
        console.log("\n\n");
    });
    persistence.saveObject(object2, function(err, res) {
        console.log("OBJECT2:");
        console.log(res.__meta.savedValues);
        console.log("\n\n");
    });
    persistence.saveObject(object3, function(err, res) {
        console.log("OBJECT3:");
        console.log(res.__meta.savedValues);
        console.log("\n\n");
    });
    

}).wait(object1, object2, object3);

setTimeout(function() {
    var values =  persistence.filter.async("Person", {"lastName":"lastName1", "__passwords" : {"name": KEY, "age": KEY}});
    (function(values){
        console.log("================FILTER ENCRYPTED================\n");
        for(var i = 0; i < values.length; i++) {
            console.log(values[i].__meta.savedValues);
            console.log("\n\n");
        }
    }).wait(values);

    setTimeout(function(){
        process.exit(0);
    }, 1000)


    
    setTimeout(function() {
        process.exit(0);
    }, 1000);
}, 1000);






