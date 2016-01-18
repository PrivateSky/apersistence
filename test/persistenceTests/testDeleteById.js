/**
 * Created by ctalmacel on 12/21/15.
 */



var assert       = require('semantic-firewall').assert;
var exceptions   = require('semantic-firewall').exceptions;


exports.test = function(persistence,typeName,ids,onSuccess){
    var functions = [];
    ids.forEach(function(id){
        functions.push(function(next) {
            persistence.deleteById(typeName, id, function (err, result) {
                if (err) {
                    console.log(err.stack);
                } else {
                    next();
                }
            })
        });

        functions.push(function(next){
            persistence.findById(typeName,id,function(err,result){
                if(err){
                    console.log(err.stack);
                }else{
                    assert.isNull(result);
                    next();
                }
            })
        })

    })
    functions.push(function(next){
        onSuccess(next);
    })

    assert.steps('Test DeleteById',functions);
}


