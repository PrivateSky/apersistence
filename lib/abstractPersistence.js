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
var async = require("asynchron");
var container = require('safebox').container;

function MemoryPersistenceStrategy(){
    var persistence = {};

    function getInternal(typeName, id){
        var p = persistence[typeName];
        if(!p){
            persistence[typeName] = p = {};
        }
        var o = p[id];
        if(!o){
            p[id] = o = modelUtil.createRaw(typeName, id);
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

    this.filter = function(type, filter,  callback){
        console.log("MemoryPersistenceStrategy: Get all not implemented");
    }

    this.query = function(type, query, callback){
        console.log("MemoryPersistenceStrategy: Query not implemented");
    }
}

MemoryPersistenceStrategy.prototype = require("./BasicStrategy.js").createBasicStrategy();

function AbstractPersistence(persistenceStrategy){
    var self = this;
    this.persistenceStrategy = persistenceStrategy;

    this.lookup = function(typeName, id, callback){
        var serialized_id = modelUtil.serialiseField(typeName,modelUtil.getPKField(typeName),id,self.persistenceStrategy);
        persistenceStrategy.getObject(typeName, serialized_id, callback);
    };

    this.findById = function(typeName, id, callback){
        var serialized_id = modelUtil.serialiseField(typeName,modelUtil.getPKField(typeName),id,self.persistenceStrategy);
        persistenceStrategy.findById(typeName, serialized_id, callback);
    };

    this.saveFields = function(obj, fields, callback){
        if(callback === undefined){
            callback = function(){};
        }

        if(fields === undefined){
            fields = modelUtil.changesDiff(obj);
        }

        if(fields.length === 0){
            return callback(null,obj);
        }

        var valueDiff = [];
        var objModel = modelUtil.getModel(obj.__meta.typeName);

        fields.forEach(function(field){
            if(objModel.isTransient(field)){
                callback(new Error("Cannot save transient field "+field+" in model "+obj.__meta.typeName))
            }else{
                valueDiff.push( modelUtil.serialiseField(obj.__meta.typeName,field,obj[field], persistenceStrategy));
            }
        });

        var pk = obj.__meta.getPK();
        
        if(!pk){
            throw new Error("Failing to save object with null pk:" + JSON.stringify(obj));
        }

        persistenceStrategy.updateFields(obj, fields, valueDiff,function(err,result){
            if(err){
                callback(err);
            }
            else{
                fields.forEach(function(field){
                    if(obj[field] && obj[field].__meta) {
                        obj.__meta.savedValues[field] = obj[field].__meta.getPK();
                    }else{
                        obj.__meta.savedValues[field] = obj[field];
                    }
                });
                callback(err,obj);
            }
        });
    };

    this.saveObject = function(obj,callback){
        self.saveFields(obj,undefined,callback);
    };

    this.save = this.saveObject;

    this.filter = function(typeName, filter, callback){
        var serializedFilter = {}
        for(var field in filter){
            serializedFilter[field] = modelUtil.serialiseField(typeName,field,filter[field],persistenceStrategy);
        }
        persistenceStrategy.filter(typeName, serializedFilter, callback);
    };

    this.query = function(typeName, query, callback){
        if(persistenceStrategy.query){
            persistenceStrategy.query(typeName, query,callback);
        }
    };

    this.isFresh = function(obj){
        return obj.__meta.freshRawObject;
    };

    this.externalUpdate = function(obj, newValues,dataIsSerialized){
        /*
            External update updates an object with new values.
            If the values are serialized, it assumes that the serialization type (sql or JSON) is
            the one associated with the type of persistence.
            If the data is not serialized, externalUpdate is a utility function to make the code more readable.
         */
        
        if(!dataIsSerialized){
            modelUtil.getModel(obj.__meta.typeName).persistentProperties.forEach(function(property){
                if(newValues.hasOwnProperty(property)){
                    obj[property] = newValues[property];
                }
            });
        }else{
            modelUtil.updateObject(obj,newValues,self.persistenceStrategy);
        }
    };

    this.registerModel = function(typeName,model,callback){
        /*
            There is a chain of dependencies that must be considered when registering a model.
            As such the process is as follows:
                1. Declare a model
                2. After the models your model depend on are also declare, perform validation.
                3. If the validation
                    returns true: you wait for the other models to be validated and then can call the callback
                    return false: you return the callback with some error

            For model there are 2 associated dependencies:
                1. ModelDeclared
                2. ModelValidated
                3. ModelUpAndRunning

            The callback is called after all the model and model dependencies declarations and validations are performed.
            Yey for dependency injection!
         */


        var dependentFields = evaluateDependentFields(model);
        var dependencies = dependentFields.map(function(field){
            if(field.type.match("array")){
                return field.type.split(":")[1]+"Declared";
            }else {
                return field.type + "Declared";
            }
        });
        container.declareDependency(typeName+"Validated",dependencies,function(outOfService){
            if(!outOfService){
                //a cute way to deepClone an object; useful because 'databaseModel' will be altered
                var databaseModel = JSON.parse(JSON.stringify(model));

                for(var property in databaseModel){
                    if(databaseModel[property].type.match("array")){
                        databaseModel[property].type = "array";
                    }
                }
                dependentFields.forEach(function(dependentField){
                    if(!dependentField.type.match("array")){
                        var depModel = modelUtil.getModel(dependentField.type);
                        databaseModel[dependentField.name].type = depModel.getFieldType(depModel.getPKField());
                    }
                });

                validateModel(databaseModel,typeName,function(err,result){
                    if(err){
                        callback(err);
                    }else if(result===false){
                        container.outOfService(typeName+"Validated");
                        callback(new Error("Model \""+typeName+"\" is invalid"));
                    }else{
                        persistenceRegistry[typeName] = self;
                        container.resolve(typeName+"Validated",model);

                        dependencies = dependentFields.map(function(field){
                            if(field.type.match("array")){
                                return field.type.split(":")[1]+"Declared";
                            }else {
                                return field.type + "Validated";
                            }
                        });

                        container.declareDependency(typeName+"UpAndRunning",dependencies,function (outOfService) {
                            if(!outOfService){
                                callback(null, modelUtil.getModel(typeName));
                            }
                        })
                    }
                });
                return null;
            }
        });
        var registeredModel = modelUtil.registerModel(typeName, model, self.persistenceStrategy);
        container.resolve(typeName+"Declared",registeredModel);

        function evaluateDependentFields(model){
            var dependentFields = [];
            for(var field in model){
                if(typeof model[field] === 'function'){
                    continue;
                }

                var type = undefined;
                if((model[field]['type']).match(":")){
                    type = model[field]['type'].split(":")[1];
                }else{
                    type = model[field]['type']
                }
                if(!self.persistenceStrategy.getConverterTo(type)){
                    //if the type is not primitive
                    dependentFields.push({"name":field,"type":model[field].type});
                }
            }
            return dependentFields;
        }

        function validateModel(model,typeName,callback) {
            if (self.persistenceStrategy.validateModel === undefined) {
                callback(null, true);
            }
            else {
                self.persistenceStrategy.validateModel(typeName, model, function (err, isValid) {
                    if (err) {
                        callback(err);
                    } else if (isValid === false) {
                        callback(null, false);
                    } else {
                        callback(null, true);
                    }
                });
            }
        }
    };

    this.delete = function(obj,callback){
        if(callback===undefined){
            callback = function(){};
        }
        this.deleteById(obj.__meta.typeName,obj.__meta.getPK(),callback);
    };

    this.deleteById = function(typeName,id,callback){
        this.persistenceStrategy.deleteObject(typeName,id,callback);
    }
}

var basicTypesForJson = require('./basicJSONTypes.js');
var basicTypesForSQL  = require('./basicSQLTypes.js');

exports.createMemoryPersistence = function(){
    var strategy = new MemoryPersistenceStrategy();
    basicTypesForJson.registerTypeConverters(strategy);
    var pers = new AbstractPersistence(strategy);
    pers = async.bindAllMembers(pers);
    return pers;
};

exports.createPersistence = function(strategy){
    var pers = new AbstractPersistence(strategy);
    pers = async.bindAllMembers(pers);
    return pers;
};

exports.createRawObject = function(typeName, pk){
    return modelUtil.createRaw(typeName, pk);
};

var persistenceRegistry = {}; /* allow multiple persistences to coexist in the same environment*/

exports.getPersistenceForType = function(typeName){
    return persistenceRegistry[typeName];
};

var waiters = {};
function getWaiter(typeName){
    var ret = waiters[typeName];
    if(!ret){
        ret = waiters[typeName] = require("./SingletonWaiter.js").create();
    }
    return ret;
}

var persistences = {};
exports.registerModel = function(modelName, persistenceType, description,callback){
    var waiter = getWaiter(persistenceType);
    waiter.gCall(function(){
        var persistence    = persistences[persistenceType];
        if(! persistence){
            throw (new Error(persistenceType+" not registered "));
        }
        persistence.registerModel(modelName, description, callback);
    })
}

exports.createRedisPersistence = function(redisConnection){
    var REDIS_PERSISTENCE_TYPE = "Redis";
    var strategy = require("../db/RedisPersistence.js").createRedisStrategy(redisConnection);
    var pers = new AbstractPersistence(strategy);
    pers = async.bindAllMembers(pers);

    persistences[REDIS_PERSISTENCE_TYPE] = pers;
    basicTypesForJson.registerTypeConverters(strategy);
    var waiter = getWaiter(REDIS_PERSISTENCE_TYPE);
    waiter.setSingleton(pers);
    return pers;
};

exports.createMySqlPersistence = function(mysqlPool){
    var MYSQL_PERSISTENCE_TYPE = "MySQL";
    var strategy = require("../db/sql/MySqlPersistence.js").createMySqlStrategy(mysqlPool);
    var pers = new AbstractPersistence(strategy);
    pers.mysqlUtils = require('../db/sql/mysqlUtils.js');
    persistences[MYSQL_PERSISTENCE_TYPE] = pers;
    basicTypesForSQL.registerTypeConverters(strategy);
    var waiter = getWaiter(MYSQL_PERSISTENCE_TYPE);
    waiter.setSingleton(pers);
    return pers;
}

exports.modelUtilities = modelUtil;