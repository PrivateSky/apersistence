/**
 * Created by ctalmacel on 12/15/15.
 */


exports.registerTypeConverters = function(persistence){
    persistence.registerConverter("string",
        function(value){
            return value;
        },
        function(value){
            return value;
        },
        'varchar'
    )
    persistence.registerConverter("textString",
        function(value){
            return value;
        },
        function(value){
            return value;
        },
        'text'
    )

    persistence.registerConverter('int',
        function(value){
            return (value);
        },
        function(value){
            return value;
        },
        "int"
    )

    persistence.registerConverter('float',
        function(value){
            return value;
        },
        function(value){
            return value;
        },
        "float"
    )

    persistence.registerConverter('boolean',
        function(value){
            if(value == 1) {
                return true;
            }
            else {
                return false;
            }
        },
        function(value){
            if(value == true){
                return 1
            }
            else{
                return 0
            }
        },
        "tinyint(1)"
    );

    persistence.registerConverter('date',
        function(value){
            return value;
        },
        function(javascriptDate){
            return javascriptDate.toISOString().substring(0,10);
        },
        "date"
    );

    persistence.registerConverter('datetime',
        function(value){
            return value;
        },
        function(javascriptDate){
            return javascriptDate.toISOString().slice(0, 19).replace('T', ' ');
        },
        "datetime"
    );

    persistence.registerConverter("dateFormat",
        function(value, typeDescription){
            if(!value){
                return null;
            }
            var m = moment(value,typeDescription.format);
            return m;
        },
        function(value, typeDescription){
            var txt = value.format(typeDescription.format);
            return txt;
        },
        "varchar"
    );

    persistence.registerConverter("array",
        function(blobOfStuff, typeDescription){
            if (blobOfStuff == null || blobOfStuff == undefined){
                return "null";
            }
            return JSON.parse(blobOfStuff);
        },
        function(arrayOfStuff, typeDescription){
            if(arrayOfStuff == "null"){
                return null;
            }

            return JSON.stringify(arrayOfStuff)
        },
        'blob'
    );

    persistence.registerConverter("base64image",
        function(value){
            var buffer = new Buffer( value );
            var bufferBase64 = buffer.toString();
            return bufferBase64;
        },
        function(value){
            return value;
        },
        'blob'
    );
    persistence.registerConverter('JSON',
        function(value){
            return JSON.parse(value);
        },
        function(value){
            return JSON.stringify(value);
        },
        'blob'
    );

}