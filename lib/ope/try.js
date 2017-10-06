const crypto = require('crypto');
var util = require('./util');
var stat = require('./stat')
var ope = require('./ope')


in_start = 0
in_end = Math.pow(2,15) - 1
out_start = 0
out_end = Math.pow(2,31) - 1
var prev = -1
for(var i = 0; i < Math.pow(2,15); i++) {
	x = ope.encrypt("superstrongpassword", i, in_start, in_end, out_start, out_end);
	console.log(i, x)
	console.assert(prev < x)
	prev = x
	y = ope.decrypt("superstrongpassword", x, in_start, in_end, out_start, out_end);
	console.assert(y==i)
}
console.log(ope.encrypt("superstrongpassword", 10,in_start, in_end, out_start,out_end))
console.log(ope.encrypt("superstrongpassword", 11,in_start, in_end, out_start,out_end))
console.log(ope.encrypt("superstrongpassword", 12,in_start, in_end, out_start,out_end))
