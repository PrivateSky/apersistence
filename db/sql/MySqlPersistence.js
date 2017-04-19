/**
 * Created by ctalmacel on 12/8/15.
 */

var Q = require('q');
var createRawObject = require("../../lib/abstractPersistence.js").createRawObject;
var modelUtil = require("../../lib/ModelDescription.js");
var mysqlUtils = require("./mysqlUtils.js");

function sqlPersistenceStrategy(mysqlPool) {
    var self = this;
    var runQuery = Q.nbind(mysqlPool.query,mysqlPool);

    this.validateModel = function(typeName,description,callback){
        mysqlPool.query("DESCRIBE "+typeName,function (err,sqlProperties) {
            if(err){
                if(err.message.match('ER_NO_SUCH_TABLE')) {
                    var persistentFields = modelUtil.getModel(typeName).persistentProperties;
                    var tableDescription = {};
                    persistentFields.forEach(function (field) {
                        tableDescription[field] = description[field];
                    });
                    mysqlPool.query(mysqlUtils.createTable(self, typeName, tableDescription), callback);
                }else{
                    callback(err);
                }
            }else{
                var invalidProperties = [];
                var model = new modelUtil.ModelDescription(typeName,description,self);
                sqlProperties.forEach(function(column){
                    column['Type'] = column['Type'].split('(')[0];   //ignore size specifications such as INT(10)
                });
                model.persistentProperties.forEach(function(modelProperty){
                    var expectedDbType = self.getDatabaseType(model.getFieldType(modelProperty));
                    if(expectedDbType === undefined){
                        invalidProperties.push(new Error("Property "+modelProperty+" is invalid because the sql type for "+model.getFieldType(modelProperty)+" apersistence Type is unknown"));
                        return;
                    }
                    sqlProperties.forEach(function(sqlProperty){
                        if(sqlProperty.field === modelProperty && sqlProperty.type !== expectedDbType){
                            invalidProperties.push(new Error("Property "+modelProperty+" is invalid because the expected sql type for "
                                +model.getFieldType(modelProperty)+" apersistence Type is "+expectedDbType+" " +
                                "whereas in the table the type is "+column['Type']));
                        }
                    })
                });
                if(invalidProperties.length >0){
                    callback(invalidProperties)
                }else{
                    callback();
                }
            }
        })
    };

    this.findById = function (typeName, serialized_id, callback) {
        self.getObject(typeName,serialized_id,function(err,obj){
            if(err){
                callback(err);
            }else{
                if(obj.__meta.freshRawObject===true){
                    callback(null,null);
                }else{
                    callback(undefined,obj);
                }
            }
        });
    };

    this.getObject = function (typeName, serialized_id, callback) {
        var query = mysqlUtils.find(typeName,modelUtil.getPKField(typeName),serialized_id);
        mysqlPool.query(query,function(err,result){
            if(err){
                callback(err);
            }else{
                var model = modelUtil.getModel(typeName);
                var deserialized_id = modelUtil.deserialiseField(typeName,model.getPKField(),serialized_id,self);
                var retObj = createRawObject(typeName, deserialized_id);
                if (result.length>0) {
                    modelUtil.load(retObj, result[0], self);
                }
                self.cache[deserialized_id] = retObj;
                callback(null,retObj);
            }
        })
    };

    this.updateFields = function(obj,fields,values,callback){
        var typeName = obj.__meta.typeName;
        var pkName = obj.__meta.getPKField();
        var id = obj.__meta.getPK();
        var serialised_id = modelUtil.serialiseField(typeName,pkName,id,self);

        var model = modelUtil.getModel(typeName);

        var query;
        if(obj.__meta.savedValues.hasOwnProperty(obj.__meta.getPKField()))
            query = mysqlUtils.update(typeName,model.getPKField(),serialised_id,fields,values);
        else{
            var data = {};
            fields.forEach(function(field,index){
                data[field] = values[index];
            })
            query = mysqlUtils.insertRow(typeName,data);
        }

        mysqlPool.query(query,function(err,result){
            if(err){
                callback(err);
            }else{
                self.cache[id] = obj;
                callback(null,obj);
            }
        });
    };

    this.filter = function(typeName,filter,callback){
        function createObjectsFromData(queryResponse){
            var results = queryResponse[0];
            var objects = [];
            results.forEach(function(rawData){
                var newObject = createRawObject(typeName,rawData[modelUtil.getPKField(typeName)]);
                modelUtil.load(newObject,rawData,self);
                objects.push(newObject);
            })
            return objects;
        }
        runQuery(mysqlUtils.filter(typeName,filter)).
        then(createObjectsFromData).
        then(function(objectsArray){callback(null,objectsArray);}).
        catch(callback);
    };

    this.deleteObject = function(typeName,id,callback){
        var query = mysqlUtils.deleteObject(typeName,id);
        runQuery(query).
        then(function(result){
            delete self.cache[id];
            callback(null,result)}).
        catch(function(err){
            delete self.cache[id];
            callback(err);
        });
    }
}

sqlPersistenceStrategy.prototype = require('../../lib/BasicStrategy.js').createBasicStrategy();


exports.createMySqlStrategy = function (mysqlConnection){
    return new sqlPersistenceStrategy(mysqlConnection);
}

