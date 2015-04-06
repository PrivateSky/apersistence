
var moment = require('moment');

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
            if(value && value != 'false') {
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
            if(value instanceof  Date ){
                throw new Error("Invalid type, expecting string not Date");
            }
            var date = new Date();
            date.setTime(parseInt(value));
            return date;
        },
        function(value){
            return value.getTime();
        }
    )

    persistence.registerConverter("dateFormat",
        function(value, typeDescription){
            if(!value){
                console.log("null date ");
                return null;
            }
            var m = moment(value,typeDescription.format);
            console.log("From dateFormat", value);
            return m;
        },
        function(value, typeDescription){
            var txt = value.format(typeDescription.format);
            console.log("Saving", txt);
            return txt;
        }
    )

    persistence.registerConverter("array",
        function(value, typeDescription){
            if (value == null || value == undefined){
                return "null";
            }
            return JSON.parse(value);
        },
        function(value, typeDescription){
            if(value == "null"){
                return null;
            }
            return JSON.stringify(value);
        }
    )
}
