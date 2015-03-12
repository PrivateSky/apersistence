
function ModelDescription(typeName, description){
    this.persistentProperties = [];
    var pkField = "id";
    var template = {};
    var functions = {};
    var indexes = [];

    this.getIndexes = function(){
        return indexes;
    }

    this.getPKField = function(){
        return pkField;
    }

    for(var v in description){
        var field = description[v];
        if(typeof field !== "function"){
            this.persistentProperties.push(v);
            if(field.index){
                indexes.push(v);
            }
            if(field.pk){
                pkField = v;
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
                    savedValues: {},
                    getPK : function(){
                        if(pkField){
                            return res[pkField];
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

        if(description.ctor){
            description.ctor.apply(res,args);
        }

        res[pkField] = pkValue;
        return res;
    }
}


var models = {};
exports.registerModel = function(typeName, description){
    models[typeName] = new ModelDescription(typeName, description);
}



exports.load = function(modelObject, from){
    var props = models[modelObject.__meta.typeName].persistentProperties;
    props.forEach(function(p){
        modelObject[p]= from[p];
        modelObject.__meta.savedValues[p] = from[p];
    })
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

exports.getPKField = function(typeName){
    var d = models[typeName];
    return d.getPKField();
}

exports.getInnerValues = function(obj){
    var ret = {};
    for(var v in obj){
        if(v != "__meta"){
            ret[v] = obj[v];
        }
    }

    return ret;
}