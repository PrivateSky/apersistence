
function BasicStrategy(){
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


exports.createBasicStrategy = function(){
    return new BasicStrategy();
}