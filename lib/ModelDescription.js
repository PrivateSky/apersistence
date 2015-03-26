
function ModelDescription(typeName, description){
    this.persistentProperties = [];
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
    }

    this.getIndexes = function(){
        return indexes;
    }

    this.hasIndexAll = function(){
         return _hasIndexAll;
    }

    this.getPKField = function(){
        return pkField;
    }

    for(var v in description){
        var field = description[v];
        if(typeof field !== "function"){
            this.persistentProperties.push(v);

            if(field.pk){
                pkField = v;
                if(field.index){
                    _hasIndexAll = true;
                }
            } else {
                if(field.index){
                    indexes.push(v);
                }
            }
            template[v] = field.default;
        } else {
            functions[v] = field;
        }
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
                            return getPKField;
                        } else {
                            throw new Error("No pk member found for type " + typeName);
                        }
                    }
                }
        };


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
    }
}


var models = {};
exports.registerModel = function(typeName, description){
    models[typeName] = new ModelDescription(typeName, description);
}


function convertFrom(strategy, modelName, fieldName, fromData){
    var typeName = models[modelName].getFieldType(fieldName);
    var converterFrom = strategy.getConverterFrom(typeName);
    if(!converterFrom){
        throw new Error("Failed to convert data of type " + typeName + " for field " + fieldName + " in model "+ modelName);
    }
    return converterFrom(fromData);
}


function convertTo(strategy, modelName, fieldName, fromData){
    var typeName = models[modelName].getFieldType(fieldName);
    if(!typeName){
        console.log("Ignoring unknown field: ", fieldName);
        return undefined;
    }
    var converterOut = strategy.getConverterTo(typeName);
    if(!converterOut){
        return fromData;
    }
    return converterOut(fromData);
}

exports.load = function( modelObject, from , strategy){
    var props = models[modelObject.__meta.typeName].persistentProperties;
    if(modelObject === from){ //internal load before saving
        props.forEach(function(p){
            var value = from[p];
            modelObject.__meta.savedValues[p] = value;
        })

        delete modelObject.__meta.freshRawObject;
        return ;
        }
    props.forEach(function(p){
        var value = convertFrom(strategy, modelObject.__meta.typeName, p, from[p]);
        modelObject[p]= value;
        modelObject.__meta.savedValues[p] = value;
    })
    delete modelObject.__meta.freshRawObject;
}

exports.serialiseField = function(modelObject, field , strategy){
    var props = models[modelObject.__meta.typeName].persistentProperties;
    return convertTo(strategy, modelObject.__meta.typeName, field, modelObject[field]);
}


exports.changesDiff = function(modelObject){
    var diff = [];
    var props = models[modelObject.__meta.typeName].persistentProperties;
    props.forEach(function(p){
        if( modelObject[p] !== modelObject.__meta.savedValues[p]){
            diff.push(p);
        };
    })
    return diff;
}

exports.createRaw = function(typeName, pk){
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

exports.getInnerValues = function(obj, strategy){
    var ret = {};
    for(var v in obj){
        if(v != "__meta" && typeof obj[v] != "function"){
            ret[v] = exports.serialiseField(obj, v, strategy);
        }
    }

    return ret;
}