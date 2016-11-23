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
                for(var field in filterTest.filter){
                    results.forEach(function(result){
                        if(result[field]!==filterTest.filter[field]){
                            match = false;
                        }
                    })
                }
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


