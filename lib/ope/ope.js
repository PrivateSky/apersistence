const crypto = require('crypto');
var util = require('./util');
var stat = require('./stat')

DEFAULT_IN_RANGE_START = 0
DEFAULT_IN_RANGE_END = Math.pow(2,15) - 1
DEFAULT_OUT_RANGE_START = 0
DEFAULT_OUT_RANGE_END = Math.pow(2,31) - 1


function* tape_gen(password, data) {
	data = data.toString()
	// Derive a key from data
	var hmac = crypto.createHmac('sha256', password);
	hmac.update(data)
	var digest = hmac.digest()

	// Use AES in the CTR mode to generate a pseudo-random bit string
	var aes = crypto.createCipher('aes-256-ctr', password);
	while(true) {
		encrypted_bytes = aes.update('\x00'.repeat(16))
		bits = util.buffer_to_bitstring(encrypted_bytes)
        for (var bit in bits) {
            yield bits[bit]
        }
	}
}

exports.encrypt = function(password, n, in_start, in_end, out_start, out_end) {
	in_start = in_start || DEFAULT_IN_RANGE_START
	in_end = in_end || DEFAULT_IN_RANGE_END
	out_start = out_start || DEFAULT_OUT_RANGE_START
	out_end = out_end || DEFAULT_OUT_RANGE_END

	in_size = in_end - in_start + 1
	out_size = out_end - out_start + 1
	in_edge = in_start - 1
	out_edge = out_start - 1
	mid = out_edge + Math.ceil(out_size/2)
	console.assert(in_size <= out_size) 
	if(in_size == 1) {
		coins = tape_gen(password, n)
		ciphertext = stat.sample_uniform(out_start, out_end, coins)
		return ciphertext;
	}
	coins = tape_gen(password, mid)
	x = stat.sample_hgd(in_start, in_end, out_start, out_end, mid, coins)
	if(n <= x) {
		in_start = in_edge+1
		in_end = x

		out_start = out_edge + 1
		out_end = mid
	} else {
		in_start = x+1
		in_end = in_edge + in_size

		out_start = mid+1
		out_end = out_edge + out_size
	}
	return exports.encrypt(password, n, in_start, in_end, out_start, out_end);
}

exports.decrypt = function(password, n, in_start, in_end, out_start, out_end) {
	//FIX ME
	in_start = in_start || DEFAULT_IN_RANGE_START
	in_end = in_end || DEFAULT_IN_RANGE_END
	out_start = out_start || DEFAULT_OUT_RANGE_START
	out_end = out_end || DEFAULT_OUT_RANGE_END

	cin_start = in_start
	cin_end = in_end

	while(cin_start < cin_end) {
		var mid = (cin_start + cin_end)/2
		var enc = exports.encrypt(password, parseInt(mid), in_start, in_end, out_start, out_end)
		if(enc == n) {
			console.log("\n\n\n\n\n")
			return parseInt(mid)
		}
		if(enc < n) {
			cin_start = mid+1
		} else {
			cin_end = mid -1
		}
	}
	return "error"
}


exports.decrypts = function(password, n, in_start, in_end, out_start, out_end) {
	in_size = in_end - in_start + 1
	out_size = out_end - out_start + 1
	in_edge = in_start - 1
	out_edge = out_start - 1
	mid = out_edge + Math.ceil(out_size/2)
	console.assert(in_size <= out_size) 
	if(in_size == 1) {
		in_range_min = in_start
		coins = tape_gen(password, in_range_min)
		sampled_ciphertext = stat.sample_uniform(out_start, out_end, coins)
		if(sampled_ciphertext == n) {
			return in_range_min
		} else {
			return "error"
		}
	}
	coins = tape_gen(password, mid)
	x = stat.sample_hgd(in_start, in_end, out_start, out_end, mid, coins)
	if(n <= mid) {
		in_start = in_edge+1
		in_end = x

		out_start = out_edge + 1
		out_start = mid
	} else {
		in_start = x+1
		in_end = in_edge+in_size

		out_start = mid+1
		out_end = out_edge + out_size
	}
	return exports.decrypt(password, n, in_start, in_end, out_start, out_end)
}















