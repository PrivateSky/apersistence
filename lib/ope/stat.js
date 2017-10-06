exports.sample_uniform = function(start, end, coins) {
	// Uniformly select a number from the range using the bit list as a source of randomness
	while (end - start + 1 > 1) {
		mid = Math.floor((start + end)/2)
		bit = coins.next().value;
		if( bit == 0 ) {
			end = mid
		} else {
			start = mid+1
		}
		// console.log("start", start)
		// console.log("end", end)
	}
	console.assert(end-start+1 == 1)
	return start
}

exports.sample_hgd = function(in_start, in_end, out_start, out_end, nsample, coins) {
	// Get a sample from the hypergeometric distribution, using the provided bit list as a source of randomness
	var in_size = in_end - in_start + 1;
	var out_size = out_end - out_start + 1;
	console.assert(in_size > 0 && out_size > 0)
	console.assert(in_size <= out_size)
	console.assert(nsample >= out_start && nsample <= out_end)

	// # 1-based index of nsample in out_range
	var nsample_index = nsample - out_start + 1;
	if(in_size == out_size) {
		return in_start + nsample_index - 1;
	}
	var in_sample_num = rhyper(nsample_index, in_size, out_size-in_size, coins);
	if(in_sample_num == 0) {
		return in_start;
	} else if (in_sample_num == in_size){
		return in_end;
	} else {
		var in_sample = in_start + in_sample_num
		console.assert(in_sample >= in_start && in_sample <= in_end);
		return in_sample
	}
}

function rhyper(kk, nn1, nn2, coins) {
	var prng = new PRNG(coins)
	if( kk > 10 ) {
		return hypergeometric_hrua(prng, nn1, nn2, kk);
	} else {
		return hypergeometric_hyp(prng, nn1, nn2, kk)
	}
}

function hypergeometric_hrua(prng, good, bad, sample) {
	var D1 = 1.7155277699214135
    var D2 = 0.8989161620588988

    mingoodbad = Math.min(good, bad)
    popsize = good + bad
    maxgoodbad = Math.max(good, bad)
    m = Math.min(sample, popsize - sample)
    d4 = mingoodbad / popsize
    d5 = 1.0 - d4
    d6 = m*d4 + 0.5
    d7 = Math.sqrt((popsize - m) * sample * d4 * d5 / (popsize-1) + 0.5)
    d8 = D1*d7 + D2
    d9 = parseInt(Math.floor((m+1) * (mingoodbad+1) / (popsize + 2)))
    d10 = loggam(d9+1) + loggam(mingoodbad-d9+1) + loggam(m-d9+1) + loggam(maxgoodbad-m+d9+1)
    d11 = Math.min(Math.min(m, mingoodbad) + 1.0, Math.floor(d6 + 16 * d7))

    while(true) {
    	X = prng.draw()
    	Y = prng.draw()
    	W = d6+d8*(Y-0.5)/X

    	if(W<0.0 || W>= d11) {
    		continue;
    	}

    	Z = parseInt(Math.floor(W))
    	T = d10 - (loggam(Z+1) + loggam(mingoodbad-Z+1) + loggam(m-Z+1) + loggam(maxgoodbad-m+Z+1))

    	if( (X*(4.0-X) - 3.0) <= T) {
    		break;
    	}

    	if(X*(X-T) >= 1) {
    		continue;
    	}

    	if(2.0 * Math.log(X) <= T) {
    		break;
    	}
    }
    if(good>bad) {
    	Z = m-Z
    }
    if(m<sample) {
    	Z = good - Z
    }
    return Z
}

function loggam(x) {
	a = [8.333333333333333e-02, -2.777777777777778e-03,
             7.936507936507937e-04, -5.952380952380952e-04,
             8.417508417508418e-04, -1.917526917526918e-03,
             6.410256410256410e-03, -2.955065359477124e-02,
             1.796443723688307e-01, -1.39243221690590e+00]
    x *= 1.0
	x0 = x
    n = 0

    if(x == 1 || x == 2)
    	return 0.0
   	else if(x <= 7.0) {
   		n = parseInt(7-x)
   		x0 = x + n
   	}
   	x2 = 1.0/(x0*x0)
   	xp = 2 * Math.PI
   	gl0 = a[9]
   	for(var k = 8; k >= 0; k--) {
   		gl0 = gl0*x2;
   		gl0 = gl0 + a[k]
   	}
   	gl = gl0/x0 + 0.5*Math.log(xp) + (x0-0.5)*Math.log(x0) - x0
   	if(x <= 7.0) {
   		for(var k = 1; k <= n; ++k){
   			gl = gl - Math.log(x0-1.0)
   			x0 = x0 - 1.0
   		}
   	}
   	return gl;
}

function hypergeometric_hyp(prng, good, bad, sample) {
	d1 = bad + good - sample
	d2 = Math.min(bad,good)

	Y = d2
	K = sample
	while(Y > 0.0) {
		U = prng.draw();
		Y = Y - Math.floor(U + Y/(d1+K));
		K--;
		if(K == 0) {
			break;
		}
	}
	Z = parseInt(d2-Y)
	if(good > bad) 
		Z = sample - Z
	return Z
}


function PRNG(coins) {
	this.coins  = coins;
}
PRNG.prototype.draw = function() {
	var bits = []
	while(bits.length != 32) {
		v = this.coins.next().value;
		if(typeof(v) == 'number')
			bits.push(this.coins.next().value)
	}
	console.assert(bits.length == 32)
	var out = 0;
	for (var b in bits) {
		if(typeof(bits[b]) == 'number')
			out = (out * 2) + bits[b]
	}
	res = 1.0 * out / (Math.pow(2,32) -1)
	console.assert(res >=0 && res <=1)
	return res
}

exports.test = function(coins) {
	var x = new PRNG(coins)
	console.log(x.draw())
}