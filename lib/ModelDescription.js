
function ModelDescription(typeName, description){
    this.persistentProperties = [];
    var pkField = "id";
    var template = {};
    var functions = {};

    for(var v in description){
        var field = description[v];
        if(typeof field !== "function"){
            this.persistentProperties.push(v);
            if(field.pk){
                pkField = field;
            }
            template[v] = field.default;
        } else {
            functions[v] = field;
        }
    }

    this.createRaw = function(){
        var args = [];
        for(var i = 0; i<arguments.length;i++){
            args.push(arguments[i]);
        }
        var res = {__meta:{
            typeName:typeName,
            savedValues: {}
            }
        };

        res.__meta.getPK = function(){
            if(pkField){
                return res[pkField];
            } else {
                throw new Error("No pk member found for type " + typeName);
            }
        }.bind(res);

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

exports.createRaw = function(typeName){
    var d = models[typeName];
    return d.createRaw();
}