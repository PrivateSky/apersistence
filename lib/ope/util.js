exports.buffer_to_bitstring = function(buff) {
	data = buffer_to_bytearray(buff)
	for(var i = 0; i < data.length; ++i) {
		return byte_to_bitstring(data[i])
	}
}

function buffer_to_bytearray(buff) {
	return buff.toJSON(buff).data
}

function byte_to_bitstring(byte) {
	var bits = [];
	for (var i = 7; i >= 0; i--) {
   		var bit = byte & (1 << i) ? 1 : 0;
   		bits.push(bit);
	}
	return bits
}