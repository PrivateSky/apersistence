

exports.registerTypeConverters = function(persistence){

    persistence.registerConverter("string",
        function(value){
            return value;
        },
        function(value){
            return value;
        }
    )

    persistence.registerConverter("int",
        function(value){
            return parseInt(value);
        },
        function(value){
            return value;
        }
    )

    persistence.registerConverter("float",
        function(value){
            return parseFloat(value);
        },
        function(value){
            return value;
        }
    )

    persistence.registerConverter("boolean",
        function(value){
            if(value != 'false') {
                return true;
            }
            return false;
        },
        function(value){
            return value;
        }
    )

}
