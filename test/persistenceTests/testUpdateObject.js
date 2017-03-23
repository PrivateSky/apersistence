/**
 * Created by ctalmacel on 12/28/15.
 */
var assert       = require('double-check').assert;
var exceptions   = require('double-check').exceptions;


//this test depends on testFindById.js to work properly

exports.test = function(persistence,objects,onSuccess){
    var testFunctions = [];
    var auxObject ;
    /*
        Interchange some fields. Check wether the changes were made in the database.
    */
    objects.some(function(object,index) {
        if (index % 2 == 0 && index < objects.length - 1) {
            var pkField = object.__meta.getPKField();
            for(var field in object){

                if(field === pkField || field ==="__meta" || typeof object[field] === 'function'){
                    continue;
                }

                var value = object[field];
                object[field] = objects[index+1][field];
                objects[index+1][field] = value;
            }
        }
        else {
            if (index == objects.length - 1)
                return true;
            else
                return false;
        }
    });

    objects.forEach(function(object){
        testFunctions.push(function(next){
            persistence.saveObject(object,function(err,result){
                if(err){
                    console.error(err);
                }
                else {
                    object = result;
                    next();
                }
            })
        });

        testFunctions.push(function(next){
            persistence.findById(object.__meta.typeName,object.__meta.getPK(),function(err,result){
                assert.equal(err,undefined,"Error ",err," appeared while testing that object was saved");
                assert.objectHasFields(result.__meta.savedValues,object.__meta.savedValues,'Object with id '+object.__meta.getPK()+' was not saved properly');
                next();
            })
        })
    });

     testFunctions.push(function(next){
        onSuccess(next);
     });
    assert.steps("Test updateObject",testFunctions);
}

