	var crypto = require('crypto');
var iv = crypto.randomBytes(16);

var ope = require('./ope/ope.js');

var fs = require('fs');
// var config = JSON.parse(fs.readFileSync('../etc/config.json', 'utf8'));
var config = {
	"password": "mysuperstrongpassword",
	"big_prime": 1223,
	"algorithm": "aes-256-cbc"
}
var algorithm = config.algorithm
var pwd = config.password
var big_prime = config.big_prime

var inputEncoding = 'utf8';
var outputEncoding = 'hex';

function XOR(a,b) {
	return a^b;
}

function ope_encryption(password, text) {
	if(['int', 'float', 'number'].indexOf(typeof(text)) == -1) {
		return text;
	}
	return ope.encrypt(password, text);
}

function ope_decryption(password, text) {
	if(['int', 'float', 'number'].indexOf(typeof(text)) == -1) {
		return text;
	}
	return ope.decrypt(password, text)
}

function probabilistic_encryption(password, text) {
	return text;
}

function deterministic_encryption(password, text) {
	if(['int', 'float', 'number'].indexOf(typeof(text)) != -1) {
		return XOR(text, convert_to_number(password));
	}
	var cipher = crypto.createCipher(algorithm, password);
	var enc = cipher.update(text, inputEncoding, outputEncoding)
	enc += cipher.final(outputEncoding);
	return enc;
}

function convert_to_number(string) {
	s = 0
	if(string === undefined)
		return 0
	for (var i = 0; i < string.length; i++) {
  		s += string.charCodeAt(i);
	}
	return s
}

function deterministic_decryption(password, text) {
	if(['int', 'float', 'number'].indexOf(typeof(text)) != -1) {
		return XOR(text, convert_to_number(password));
	}
	try {
		var decipher = crypto.createDecipher(algorithm, password)
		var dec = decipher.update(text, outputEncoding, inputEncoding)
  		dec += decipher.final(inputEncoding);
		return dec;
	} catch(err) {
		// console.log(err)
		return "error"
	}
}


exports.encrypt = function(fields, type, securityModel, password, callback) {
	if(typeof(fields) != 'object') 
		fields = [fields]
	var ret = []
	var processed = 0
	fields.forEach((field) => {
		processed++;
		switch(securityModel) {
			case 'eq': //join, det, rand
				var _det = deterministic_encryption(password, field);
				ret.push(_det);
				break;
			case 'ord': //ope-join, ope, rand
				var _ope = ope_encryption(password, field);
				ret.push(_ope);
				break;
		}
		if(processed = fields.length) {
			if(ret.length == 0) {
				if(fields.length == 1) 
					callback(null,fields[0])
				else return callback(null, fields);
			} else {
				if(ret.length == 1)
					callback(null,ret[0]);
				else return callback(null,ret);
			}
		}

	});
}

exports.decrypt = function(fields, type, securityModel, password, callback) {
	if (fields === undefined) {
		return;
	}
	if(typeof(fields) != 'object') 
		fields = [fields];
	var ret = []
	var processed = 0
	fields.forEach((field) => {
		processed++;
		switch(securityModel) {
			case 'eq': //join, det, rand
				var _det = deterministic_decryption(password, field);
				ret.push(_det);
				break;
			case 'ord': //ope-join, ope, rand
				var _ope = ope_decryption(password, field);
				ret.push(_ope);
				break;
		}
		if(processed == fields.length) {
			if(ret.length == 0) {
				if(fields.length == 1) 
					callback(null,fields[0])
				else return callback(null,fields);
			} else {
				if(ret.length == 1)
					return callback(null, ret[0]);
				else return callback(null,ret);
			}
		}
	});
}

