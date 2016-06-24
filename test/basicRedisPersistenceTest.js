

//process.env['RUN_WITH_WHYS'] = false;

var assert = require("double-check").assert;
var apersistence = require("../lib/abstractPersistence.js");
var redis = require("redis");
var callflow = require("callflow");

var logger = require('double-check').logger;

var redisConnection = callflow.bindAllMembers(redis.createClient());
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
    },
    active: {
        type:'boolean',
        default:false
    }
},function(err, result){
    assert.equal(err,null, "Error on creating model");
});




var PersistenceFlowTest = callflow.createFlow("testFlow", {
        begin:function(end){
            this.xxx = "xxx";
            this.t1     = persistence.lookup.async("TestModel", "T1");
            this.t11    = persistence.lookup.async("TestModel", "T11");
            this.t2     = persistence.lookup.async("TestModel", "T2");

            this.end = end;
        },
        modify:{
            join:"t1,t11,t2",
            code:function(){
                this.t1.age  = 1;
                this.t11.age = 1;
                this.t2.age = 2;
                persistence.saveObject(this.t1,  this.error);
                persistence.saveObject(this.t11, this.error);
                persistence.saveObject(this.t2,  this.error);

                this.runFilters();
            }
        },
        runFilters:function(){
            this.filerAge1 =  persistence.filter.async("TestModel", {"age": 1});
            this.filerAge2 =  persistence.filter.async("TestModel", {"age": 2});
            this.filerAge3 =  persistence.filter.async("TestModel", {"age": 3});
        },
        testFilters:{
            join:"filerAge1,filerAge2,filerAge3",
            code:function(){
                assert.equal(this.filerAge1.length, 2);
                assert.equal(this.filerAge2.length, 1);
                assert.equal(this.filerAge3.length, 0);
                this.end();
            }
        }
    }
)

assert.begin("Testing using redis persistence within a callflow");

assert.callback("Test obect creation with lookup and filters", function(end){
    var flow = PersistenceFlowTest(end);
});


