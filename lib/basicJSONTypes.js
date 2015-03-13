

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


    persistence.registerConverter("date",
        function(value){
            return Date.parse(value);
        },
        function(value){
            return value.toISOString();
        }
    )


    persistence.registerConverter("array",
        function(value, typeDescription){
            return JSON.parse(value);
        },
        function(value, typeDescription){
            return JSON.stringify(value);
        }
    )
}
