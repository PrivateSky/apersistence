
function objectToArray(o){
    var res = [];
    for(var v in o){
        res.push(o[v]);
    }
    return res;
}
var createRawObject = require("../lib/persistence.js").createRawObject;
var modelUtil = require("../lib/ModelDescription.js");


function RedisPersistenceStrategy(redisConnection){
    var persistence = {};


    function mkKey(typeName, pk){
        return "ObjectSpace:" + typeName + ":" + pk;
    }

    function mkIndexKey(typeName, indexName, value){
        return "IndexSpace:" + typeName + ":" + indexName + ":" + value;
    }

    this.getObject = function(typeName, id, callback){
        var obj = redisConnection.hgetall.nasync(mkKey(typeName, id));
        (function(obj){
            var retObj = createRawObject(typeName, id);
            if(obj){
                modelUtil.load(retObj, obj);
            }
            callback(null, retObj);
        }).wait(obj);
    }

    this.updateFields =  function(typeName, id, fields, values, obj){
        var key = mkKey(typeName, id);
        for(var i = 0, len = fields.length; i<len; i++){
            redisConnection.hset(key, fields[i], values[i]);
        }

        updateAllIndexes(typeName, obj);
    }

    this.deleteObject = function(typeName, id){
        var key = mkKey(typeName, id);
        redisConnection.del(key);
    }

    function filterArray(typeName, arr, filter, callback){
        var res = [];
        arr.forEach(function(o){
            for(var k in filter){
                if(o[k] != filter[k]) return;
            }
            var retObj = createRawObject(typeName);
            modelUtil.load(retObj, o);
            res.push(retObj);
        });
        callback(null, res);
    }

    function returnIndexPart(typeName, indexName, value, callback){
        var idxKey = mkIndexKey(typeName, indexName, value);

        var ret = redisConnection.hgetall.async(idxKey);
        (function(ret){
            var arr = [];
            for(var v in ret){
                arr.push(JSON.parse(ret[v]));
            }
            callback(null, arr);
        }).wait(ret);
    }

    function updateAllIndexes(typeName, obj){
        var indexes      = modelUtil.getIndexes(typeName);
        var pkValue      = obj.__meta.getPK();
        indexes.map(function(i){
            var idxKey = mkIndexKey(typeName, i, obj[i]);
            redisConnection.hset(idxKey, pkValue, JSON.stringify(modelUtil.getInnerValues(obj)));
        })
    }


    this.filter = function(typeName, filter, callback){
        var indexes = modelUtil.getIndexes(typeName);
        var foundIndex = null;

        for(var k in filter){
            if(indexes.indexOf(k) !=-1){
                foundIndex = k;
                break;
            }
        }
        if(foundIndex){
            returnIndexPart(typeName, foundIndex, filter[foundIndex], function(err,res){
                filterArray(typeName, res, filter, callback);
            });
        } else {
            callback(new Error("Please add at least one index in your model to match at least one criteria from this filter:" + filter));
        }
    }

    this.query = function(type, query){
        console.log("RedisPersistenceStrategy: Query not implemented");
    }
}

exports.createRedisStrategy = function(redisConnection){
    return new RedisPersistenceStrategy(redisConnection);
}
