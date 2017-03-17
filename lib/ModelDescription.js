
var apersistence = require("./abstractPersistence.js");

function ModelDescription(typeName, description, strategy){
    this.persistentProperties = [];
    var self = this;
    var pkField = "id";
    var template = {};
    var functions = {};
    var indexes = [];
    var _hasIndexAll = false;

    this.getFieldType = function(fieldName){
        var desc = description[fieldName];
        if(!desc){
            return null;
        }
        return desc.type;
    };

    this.getFieldDescription = function(fieldName){
        var desc = description[fieldName];
        if(!desc){
            return null;
        }
        return desc;
    };

    this.getIndexes = function(){
        return indexes;
    }

    this.hasIndexAll = function(){
         return _hasIndexAll;
    }

    this.getPKField = function(){
        return pkField;
    }

    this.createRaw = function(pkValue){
        var args = [];
        for(var i = 0; i<arguments.length;i++){
            args.push(arguments[i]);
        }
        var res = {
            __meta:{
                typeName:typeName,
                freshRawObject:true,
                savedValues: {},
                getPK : function(){
                    if(pkField){
                        return res[pkField];
                    } else {
                        throw new Error("No pk member found for type " + typeName);
                    }
                },
                getPKField : function(){
                    if(pkField){
                        return pkField;
                    } else {
                        throw new Error("No pk member found for type " + typeName);
                    }
                },
                loadLazyField : function(field,callback){
                    var thisModel = models[res.__meta.typeName];
                    var typeOfField = thisModel.getFieldDescription(field).type;
                    var isArray = false;

                    if(typeOfField.match("array:")){
                        isArray = true;
                        typeOfField = typeOfField.split(":")[1];
                    }

                    if(!models[typeOfField]){
                        callback(new Error("Type \""+typeOfField+"\" is not registered"));
                    }else{
                        var persistence = apersistence.getPersistencesForType(typeOfField)[0];
                        if(isArray===false){
                            persistence.findById(typeOfField,res[field],function(err,result){
                                if(result){
                                    res[field] = result;
                                }
                                callback(err,res);
                            })
                        }else if(res[field].length===0){
                            callback(null,[]);
                        }else{
                            var results = [];
                            var errs = [];
                            var left = res[field].length;
                            res[field].forEach(function(id){
                                persistence.findById(typeOfField,id,function(err,result){
                                    if(err){
                                        errs.push(err);
                                    }else{
                                        results.push(result);
                                    }
                                    left--;
                                    if(left===0){
                                        if(errs.length>0){
                                            callback(errs,res);
                                        }else{
                                            res[field] = results;
                                            callback(null,res);
                                        }
                                    }
                                })
                            })
                        }
                    }
                },
                loadLazyFields: function(callback){
                    var errs = {};
                    var numErrs = 0;
                    var lazyFields = self.persistentProperties.filter(function(field){
                        return self.isLazy(field);
                    });
                    var left = lazyFields.length;
                    lazyFields.forEach(function(lazyField){
                        res.__meta.loadLazyField(lazyField,function(err,result){
                            if(err){
                                errs[field] = err;
                                numErrs++;
                            }
                            left--;
                            if(left===0 ){
                                if(numErrs>0) {
                                    callback(errs, res);
                                }else{
                                    callback(null,res);
                                }
                            }
                        })
                    })
                }
            }
        };

        res.assign = castAssign.bind(res);

        res.__meta.getPK = res.__meta.getPK.bind(res);

        for(var v in functions){
            var field = description[v];
            res[v] = field.bind(res);
        }

        for(var v in template){
            res[v] = template[v];
        }

        res[pkField] = pkValue;
        if(description.ctor){
            description.ctor.apply(res,args);
        }

        return res;
    };

    this.isLazy = function(field){
        return !strategy.getConverterTo(description[field].type) &&
            !strategy.getConverterTo(description[field].type.split(":")[1])
    };

    for(var v in description){
        var field = description[v];
        if(typeof field !== "function"){
            this.persistentProperties.push(v);

            if(field.pk === true){
                pkField = v;
            }

            if(field.index === true){
                _hasIndexAll = true;
                indexes.push(v);
            }

            if(this.isLazy(v)){
                description[v].loadLazy = true;
            }

            template[v] = field.default;
        } else {
            functions[v] = field;
        }
    }

    function castAssign(fieldName, value){ //will get binding to a model object
        this[fieldName] = convertFrom(strategy, this.__meta.typeName, fieldName, value)
    }
}

var models = {};

exports.registerModel = function(typeName, description, strategy){
    models[typeName] = new ModelDescription(typeName, description, strategy);
    return models[typeName];
};

exports.ModelDescription = ModelDescription;

function convertFrom(strategy, modelName, fieldName, fromData){

    try {
        var typeDesc = models[modelName].getFieldDescription(fieldName);
        var typeName = typeDesc.type;
        if(typeName.match("array")){
            typeName="array";
        }
        var converterFrom = strategy.getConverterFrom(typeName);
        if(!converterFrom) {
            throw new Error("Failed to convert data of type " + typeName + " for field " + fieldName + " in model "+ modelName);
        }
        return converterFrom(fromData);
    } catch(err){
        console.log(err.stack);
        console.log("Failing to convert value to field ", fieldName, " in model ", modelName, err);
        return undefined;
    }
}

function convertTo(modelName, fieldName,value, strategy){
    try{
        var model = models[modelName];
        var typeDesc = model.getFieldDescription(fieldName);

        var typeName = typeDesc.type;

        if(typeName.match('array')){
            typeName = 'array';
        }

        if(!typeName){
            console.log("Ignoring unknown field: ", fieldName);
            return undefined;
        }

        var converterOut = strategy.getConverterTo(typeName);
        if(!converterOut){
            return value;
        }
        if(value == null || value == undefined){
            return value;
        }
        return converterOut(value,typeDesc);
    } catch(err){
        console.log("Failing to convert value from field ", fieldName, " in model ", modelName, " Trying to convert value: ", fromData,  err);
        return undefined;
    }
}

exports.load = function( rawObject, from , strategy){
    var rawModel = models[rawObject.__meta.typeName];
    var props = rawModel.persistentProperties;

    props.forEach(function(p){
        if(from[p] || from[p]===false) {
            var value;
            if(rawModel.isLazy(p)){
                var lazyType  = rawModel.getFieldDescription(p).type;
                if(lazyType.match("array")){
                    value = convertFrom(strategy,rawObject.__meta.typeName,p,from[p]);
                }else{
                    var lazyModel = models[lazyType];
                    value = convertFrom(strategy,lazyType,lazyModel.getPKField(),from[p]);
                }
            }else{
                value = convertFrom(strategy, rawObject.__meta.typeName, p, from[p]);
            }
            rawObject[p] = value;
            rawObject.__meta.savedValues[p] = value;
        }
    });
    delete rawObject.__meta.freshRawObject;
};

exports.updateObject = function(modelObject,from,strategy){
    var props = models[modelObject.__meta.typeName].persistentProperties
    props.forEach(function(property){
        if(from[property]) {
            modelObject[property] = convertFrom(strategy, modelObject.__meta.typeName, property, from[property]);
        }
    })
};

exports.serialiseField = convertTo;

exports.serialiseObjectValues = function(typeName,object,strategy){
    var ser = {};
    for(var field in object){
        var s = exports.serialiseField(typeName,field,object[field],strategy)
        ser[field] = s;
    }
    return ser;
};

exports.deserialiseField = function(typeName,field,value,strategy){
    return convertFrom(strategy,typeName,field,value);
};

exports.changesDiff = function(obj){

    var diff = [];
    var modelObject = models[obj.__meta.typeName];
    var props = modelObject.persistentProperties;

    props.forEach(function (p) {
        var isLazy = modelObject.isLazy(p);
        var isArray = modelObject.getFieldType(p)==="array";
        var isLoaded = isArray ? obj[p][0].__meta !== undefined : obj[p].__meta !== undefined;

        if (!isLazy && !isArray) {
            if (obj[p] !== obj.__meta.savedValues[p]) {
                diff.push(p);
            }
        } else if (!isLazy && isArray) {
            if (!arraysMatch(obj[p], obj.__meta.savedValues[p])) {
                diff.push(p);
            }
        } else if (isLazy && !isArray && !isLoaded) {
            if (obj[p] !== obj.__meta.savedValues[p]) {
                diff.push(p);
            }
        } else if (isLazy && !isArray && isLoaded) {
            if (obj[p].__meta.getPK() !== obj.__meta.savedValues[p]) {
                diff.push(p);
            }
        } else if (isLazy && isArray && !isLoaded) {
            if (!arraysMatch(obj[p], obj.__meta.savedValues[p])) {
                diff.push(p);
            }
        } else if (isLazy && isArray && isLoaded) {
            if (!arraysMatch(obj[p].map(function (o) {
                    return o.__meta.getPK();
                }), obj.__meta.savedValues[p])) {
                diff.push(p);
            }
        }
    });    
    return diff;

    function arraysMatch(arr1,arr2){
        if(arr1.length!==arr2.length){
            return false;
        }
        for(var arrIndex = 0;arrIndex<arr1.length;arrIndex++){
            if(arr1[arrIndex]!==arr2[arrIndex]){
                return false;
            }
        }
        return true;
    }
};

exports.createObjectFromData = function(typename,data){
    var m = models[typename];
    var raw = exports.createRaw(typename, data[m.getPKField()]);
    var props = m.persistentProperties;
    props.forEach(function(p){
        raw[p]= data[p];
    })
    delete raw.__meta.freshRawObject;
    return raw;
};

exports.createRaw = function(typeName, pk,strategy){
    var d = models[typeName];
    return d.createRaw(pk);
}

exports.getIndexes = function(typeName){
    var d = models[typeName];
    return d.getIndexes();
}

exports.hasIndexAll = function(typeName){
    var d = models[typeName];
    return d.hasIndexAll();
}

exports.getPKField = function(typeName){
    var d = models[typeName];
    return d.getPKField();
}

exports.getModel = function(typeName){
    return models[typeName];
}

exports.getInnerValues = function(obj, strategy){
    var ret = {};
    for(var field in obj){
        if(field != "__meta" && typeof obj[field] != "function"){
            ret[field] = obj[field];
        }
    }
    return ret;
}

