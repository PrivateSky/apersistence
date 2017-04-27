/**
 * Created by ctalmacel on 12/21/15.
 */



var assert       = require('double-check').assert;
var exceptions   = require('double-check').exceptions;



exports.test = function(persistence,filterTests,onSuccess){
    var testFunctions = [];
    filterTests.forEach(function(filterTest) {
        testFunctions.push(function (next) {
            persistence.filter(filterTest.modelName, filterTest.filter, function (err, results) {
                if(err){
                    throw(err);
                }
                var match = true;
                results.forEach(function(result){
                    if(!matchesFilter(result,filterTest.filter)){
                        match = false;
                    }
                });

                assert.equal(true,match,"The results do not match the filters");

                next();
            })
        })
    });

    testFunctions.push(function(next){
        onSuccess(next);
    })

    assert.steps("Test filter",testFunctions);
}

function expectedObject(expectedObject,resultObject){
    for(var field in expectedObject){
        if(resultObject[field] !== expectedObject[field]){
            return false;
        }
    }
    return true;
}

function matchesFilter(obj,filter){
    for(var field in filter) {
        if (Array.isArray(filter[field])) {
            var matchesField = false;
            filter[field].forEach(function (fieldValue) {
                if(obj[field] === fieldValue){
                    matchesField =  true;
                }
            });

            if (matchesField == false) {
                return false;
            }
        }
        else if (obj[field] != filter[field]) {
            return false;
        }
    }
    return true;
}




