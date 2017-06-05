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
                var expectedResults = []
                for(var r in filterTest.expectedResults) {
                    if(typeof(filterTest.expectedResults[r]) === 'object') {
                       expectedResults.push(JSON.stringify(filterTest.expectedResults[r]))
                    }
                }

                if(err){
                    throw(err);
                }
                var match = true;
                results.forEach(function(result){
                    var index = expectedResults.indexOf(JSON.stringify(result.__meta.savedValues));
                    if(index == -1) {
                        match = false;
                    } else {
                        expectedResults.splice(index,1)
                    }

                });
                if(expectedResults.length) {
                    match = false;
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




