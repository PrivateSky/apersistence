
function objectToArray(o){
    var res = [];
    for(var v in o){
        res.push(o[v]);
    }
    return res;
}
var createRawObject = require("../lib/abstractPersistence.js").createRawObject;
var modelUtil = require("../lib/ModelDescription.js");
var q = require('q');

function RedisPersistenceStrategy(redisConnection){

    var ALL_INDEX = "specialIndex";
    var self = this;
    this.redisConnection = redisConnection;

    function mkKey(typeName){
        return "IndexSpace:" + typeName + ":" + ALL_INDEX + ":" + "all";
    }

    function mkIndexKey(typeName, indexName, value){
        return "IndexSpace:" + typeName + ":" + indexName + ":" + value;
    }

    this.getObject = function(typeName, id, callback){
        redisConnection.hget(mkKey(typeName), id,function(err,obj){
            if(err){
                callback(err);
            }
            var retObj = createRawObject(typeName, id);
            if(obj) {
                modelUtil.load(retObj, JSON.parse(obj), self);
            }
            self.cache[id] = retObj;
            callback(null, retObj);
        });
    };

    this.findById = function(typeName, id, callback){
        this.getObject(typeName, id, function(err, o){
            if(self.isFresh(o)){
                callback(null, null);
            } else {
                callback(null, o);
            }
        });
    };

    this.updateFields =  function(obj,  fields, values, callback){
        var typeName = obj.__meta.typeName;

        deleteFromIndexes(typeName, obj, function(err,res) {
            
            if(err){
                console.log("Error after delete");
                callback(err);
            }
            else {
                obj.__meta.savedValues = {};

                fields.forEach(function(field,index){obj[field] = values[index];});

                updateAllIndexes(typeName, obj, function(err,result){
                    if(err) {
                        callback(err);
                    }
                    else {
                        obj.__meta.savedValues = modelUtil.getInnerValues(obj,self);
                        callback(null, obj);
                    }
                });
            }
        });
    };

    this.deleteObject = function(typeName, id,callback){
        if(self.cache[id]) {
            deleteFromIndexes(typeName, self.cache[id], function(err,result){
                delete self.cache[id];
                delete result.__meta.savedValues;
                callback(err, result);
            });
        }
        else{
            self.getObject(typeName,id,function(err,obj){
                if(err){
                    callback(err,null);
                }else {
                    deleteFromIndexes(typeName,obj,function(err,result){
                        delete self.cache[id];
                        delete result.__meta.savedValues;
                        callback(err,result);
                    });
                }
            })
        }
    };

    function filterArray(typeName, arr, filter, callback){
        var matchingObjects = arr.filter(function(obj){
            return matchesFilter(obj,filter);
        });

        var res = matchingObjects.map(function(obj){
            var retObj = createRawObject(typeName);
            modelUtil.load(retObj, obj, self);
            return retObj
        });

        function matchesFilter(obj,filter){
            for(var field in filter) {
                if (Array.isArray(filter[field])) {
                    var matchesField = false;
                    filter[field].forEach(function (fieldValue) {
                        if(obj[field] === fieldValue){
                            matchesField =  true;
                        }
                    });

                    if (matchesField == false) {
                        return false;
                    }
                } 
                else if (obj[field] != filter[field]) {
                    return false;
                }
            }
            return true;
        }

        callback(null, res);
    }

    function returnIndexPart(typeName, indexName, value, callback){
        var idxKey = mkIndexKey(typeName, indexName, value);
        redisConnection.hgetall(idxKey,function(err,ret){
            if(err){
                callback(err);
            }else{
                var arr = [];
                for(var v in ret){
                    arr.push(JSON.parse(ret[v]));
                }
                callback(null, arr);
            }

        })
    }

    function updateAllIndexes(typeName, obj,callback){
        var indexes      = modelUtil.getIndexes(typeName);
        var pkValue      = obj.__meta.getPK();
        var serInnerVal = modelUtil.getInnerValues(obj,self);
        var stringValue = JSON.stringify(serInnerVal);
        var updatesReady = [];
        var qHset = q.nbind(redisConnection.hset,redisConnection);
        indexes.forEach(function(i){
            var idxKey = mkIndexKey(typeName, i, obj[i]);
            updatesReady.push(qHset(idxKey, pkValue, stringValue));
        })

        var idxKey = mkKey(typeName);
        updatesReady.push(qHset(idxKey, pkValue, stringValue));

        q.all(updatesReady).
        then(function(){callback(null,obj);}).
        catch(callback)
    }

    function deleteFromIndexes(typeName,  obj, callback){
        var indexes      = modelUtil.getIndexes(typeName);
        var pk           = obj[modelUtil.getPKField(typeName)];
        var deletionsToPerform = indexes.length;
        var errs = [];
        indexes.forEach(function(index){
            var idxKey = mkIndexKey(typeName,index,obj.__meta.savedValues[index]);
            redisConnection.hdel(idxKey,pk,function(err,res){
                if(err){
                    errs.push(err);
                }
                deletionsToPerform--;
                if(deletionsToPerform===0){
                    if(errs.length>0){
                        callback(new Error("Errors occured during the deleting phase of the update"));
                    }else{
                        redisConnection.hdel(mkKey(typeName),pk,function(err,done){
                            if(err){
                                callback(err);
                            }else{
                                callback(undefined,obj);
                            }
                        })
                    }
                }
            })
        });
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
            var acceptedValues = [filter[foundIndex]];
            var matchingObjects = [];
            if(Array.isArray(filter[foundIndex])){
                acceptedValues = filter[foundIndex];
            }
            var remaining = acceptedValues.length;

            acceptedValues.forEach(function(value){
                returnIndexPart(typeName, foundIndex, value, function(err,res){
                    remaining--;
                    if(err){
                        callback(err);
                    }else{
                        matchingObjects = matchingObjects.concat(res);
                    }
                    if(remaining === 0){
                        filterArray(typeName, matchingObjects, filter, callback);
                    }
                });
            })

        } else {
            returnAllObjects(typeName, function(err,res){
                if(err){
                    callback(err);
                }else {
                    filterArray(typeName, res, filter, callback);
                }
            });
        }
    }

    this.query = function(type, query,callback){
        console.log("RedisPersistenceStrategy: Query not implemented");
        callback();
    }
}

RedisPersistenceStrategy.prototype = require("../lib/BasicStrategy.js").createBasicStrategy();


exports.createRedisStrategy = function(redisConnection){
    return new RedisPersistenceStrategy(redisConnection);
}
