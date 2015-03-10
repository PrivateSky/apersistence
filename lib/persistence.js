/*
   Abstraction for doing simple CRUD operations over Redis or SQl databases

   APIs:

    persistence.lookup("typeName", id) -> object
    persistence.save(object)
    persistence.loadAll("typeName")


    Ensures:
    - minimal database hits (discover changes in objects)
    - minimise concurrency issues
    - can use a cache
    - declare field types, can initialise and check types before saving

*/

var modelUtil = require("./ModelDescription.js");


function MemoryPersistenceStrategy(){
    var persistence = {};

    function getInternal(typeName, id){
        var p = persistence[typeName];
        if(!p){
            persistence[typeName] = p = {};
        }
        var o = p[id];
        if(!o){
            p[id] = o = modelUtil.createRaw(typeName);
        }
        return o;
    }

    this.getObject = function(typeName, id, callback){
        var o = getInternal(typeName, id);
        callback(null, o);
    }

    this.updateFields =  function(type, id, fields, values){
        var o = getInternal(type, id);
        for(var i= 0, len=fields.length;i<len; i++){
            o[fields[i]] = values[i];
        }
    }

    this.deleteObject = function(type, id){
        console.log("MemoryPersistenceStrategy:Delete object not implemented");
    }

    this.getAll = function(type, callback){
        console.log("MemoryPersistenceStrategy: Get all not implemented");
    }

    this.query = function(type, query){
        console.log("MemoryPersistenceStrategy: Query not implemented");
    }
}


function AbstractPersistence(persistenceStrategy){

    this.lookup = function(typeName, id, callback){
        persistenceStrategy.getObject(typeName, id, callback);
    }

    this.saveObject = function(obj, diff){
        var typeName = obj.__meta.typeName;
        var pk = obj.__meta.getPK();

        var valueDiff = [];
        diff.forEach(function(i){
            valueDiff.push(obj[i]);
        })
        persistenceStrategy.updateFields(typeName, pk, diff, valueDiff);
    }

    this.loadAll = function(typeName, callback){
        loadAll(typeName, callback);
    }

    this.query = function(query, callback){
        if(queryFunc){
            queryFunc(query,callback);
        }
    }
}

var persistenceRegistry = {};

AbstractPersistence.prototype.registerModel = function(typeName, description, persistence){
    persistenceRegistry[typeName] = this;
    modelUtil.registerModel(typeName, description);
}

AbstractPersistence.prototype.lookup = function(typeName, id, callback){
    var persistence = persistenceRegistry[typeName];
    persistence.lookup(typeName, id, callback);
}

AbstractPersistence.prototype.delete = function(obj){
    var persistence = persistenceRegistry[obj.__meta.typeName];
    persistence.delete(obj);
}

AbstractPersistence.prototype.save = function(obj, callback){
    var persistence = persistenceRegistry[obj.__meta.typeName];
    var diff = modelUtil.changesDiff(obj);
    persistence.saveObject(obj, diff);
    modelUtil.load(obj, obj);
    if(callback){
        callback(null,diff);
    }
}


exports.createMemoryPersistence = function(){
    return new AbstractPersistence(new MemoryPersistenceStrategy());
}






