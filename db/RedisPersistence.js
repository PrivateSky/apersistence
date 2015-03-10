


function RedisPersistenceStrategy(redisConnection){
    var persistence = {};

    function mkKey(typeName, pk){
        return "ObjectSpace:" + typeName + ":" + pk;
    }

    this.getObject = function(typeName, id, callback){
        var o = redisConnection.hgetall(mkKey(typeName, id));
        (function(o){
            callback(null, o);
        }).wait(o);
    }

    this.updateFields =  function(type, id, fields, values){
        var key = mkKey(typeName, id);
        for(var i = 0, len = fields.length; i<len; i++){
            redisConnection.hset(key, fields[i], values[i]);
        }
    }

    this.deleteObject = function(typeName, id){
        var key = mkKey(typeName, id);
        redisConnection.del(key);
    }

    this.getAll = function(type, callback){
        console.log("RedisPersistenceStrategy: Get all not implemented");
    }

    this.query = function(type, query){
        console.log("RedisPersistenceStrategy: Query not implemented");
    }
}

exports.createRedisPersistence = function(redisConnection){
    return new AbstractPersistence(new RedisPersistenceStrategy(redisConnection));
}
