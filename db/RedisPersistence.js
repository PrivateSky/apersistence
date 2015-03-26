
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

    var self = this;

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
                modelUtil.load(retObj, obj, self);
            }
            callback(null, retObj);
        }).wait(obj);
    }

    this.updateFields =  function(typeName, id, fields, values, obj){
        deleteFromIndexes(typeName, id, obj);
        var key = mkKey(typeName, id);
        for(var i = 0, len = fields.length; i<len; i++){
            redisConnection.hset(key, fields[i], values[i]);
        }
        updateAllIndexes(typeName, obj);
    }

    this.deleteObject = function(typeName, id){
        var key = mkKey(typeName, id);
        deleteFromIndexes(typeName, id);
        console.log("Deleting ", key);
        redisConnection.del(key);
    }

    function filterArray(typeName, arr, filter, callback){
        var res = [];
        arr.forEach(function(o){
            for(var k in filter){
                if(o[k] != filter[k]) return;
            }
            var retObj = createRawObject(typeName);
            modelUtil.load(retObj, o, self);
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
        var stringValue = JSON.stringify(modelUtil.getInnerValues(obj, self));

        indexes.map(function(i){
            var idxKey = mkIndexKey(typeName, i, obj[i]);
            redisConnection.hset(idxKey, pkValue, stringValue);
        })

        if( modelUtil.hasIndexAll(typeName)){
            var idxKey = mkIndexKey(typeName, "specialIndex", "all");
            redisConnection.hset(idxKey, pkValue, stringValue);
        }
    }

    function deleteFromIndexes(typeName, id, obj){
        var indexes      = modelUtil.getIndexes(typeName);
        var pkValue      = id;

        function cleanAll(obj){
            indexes.map(function(i){
                var idxKey = mkIndexKey(typeName, i, obj[i]);
                console.log("Deleting ", idxKey, pkValue);
                redisConnection.hdel.async(idxKey, pkValue);
            })

            if( modelUtil.hasIndexAll(typeName)){
                var idxKey = mkIndexKey(typeName, "specialIndex", "all");
                console.log("Deleting ", idxKey, pkValue);
                redisConnection.hdel.async(idxKey, pkValue);
            }
        }

        if(!obj){
            obj = self.getObject.async(typeName, id);
            (function(obj){
                cleanAll(obj);
            }).wait(obj)
        } else {
            cleanAll(obj);
        }
    }

    function returnAllObjects(typeName, callback){
        returnIndexPart(typeName, "specialIndex", "all", callback);
    }


    this.filter = function(typeName, filter, callback){
        var indexes = modelUtil.getIndexes(typeName);
        var foundIndex = null;

        if(!filter){
            returnAllObjects(typeName, callback);
            return ;
        }
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
            callback(new Error("Please add at least one index in your model to match at least one criteria from this filter:" + J(filter)));
        }
    }

    this.query = function(type, query){
        console.log("RedisPersistenceStrategy: Query not implemented");
    }


    var typeConverterRegistryFrom = {};
    var typeConverterRegistryTo = {};

    this.registerConverter = function(typeName, from, to){
        typeConverterRegistryFrom[typeName] = from;
        typeConverterRegistryTo[typeName] = to;
    }

    this.getConverterFrom = function(typeName){
        return typeConverterRegistryFrom[typeName];
    }

    this.getConverterTo = function(typeName){
        return typeConverterRegistryTo[typeName];
    }
}

RedisPersistenceStrategy.prototype = require("../lib/BasicStrategy.js").createBasicStrategy();


exports.createRedisStrategy = function(redisConnection){
    return new RedisPersistenceStrategy(redisConnection);
}
