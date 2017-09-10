define(['lib/lodash'], function(_) {

	// Modify array prototype for array moves
	var moveFunction = function (old_index, new_index) {
	    if (new_index >= this.length) {
	        var k = new_index - this.length;
	        while ((k--) + 1) {
	            this.push(undefined);
	        }
	    }
	    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
	    return this; 
	};
	Array.prototype.move = moveFunction;

	var Utils = {
		Array: {
			move: moveFunction 
			, checkMove: function() {
				if(!Array.prototype.move) {
					Array.prototype.move = moveFunction;
				}
			}
		}
		, cloneObject: function(obj) {
			var clone, i;

			if (typeof obj !== 'object' || !obj)
				return obj;

			if ('[object Array]' === Object.prototype.toString.apply(obj)) {
				clone = [];
				var len = obj.length;
				for (i = 0; i < len; i++)
				  clone[i] = Utils.cloneObject(obj[i]);
				return clone;
			}

			clone = {};
			for (i in obj)
				if (obj.hasOwnProperty(i))
			  		clone[i] = Utils.cloneObject(obj[i]);
			return clone;
		}
		// Binary string sorting function
		, binaryInsert: function(value, array, opt) {
 
			var length = array.length;
			var start = typeof(opt.startVal) != 'undefined' ? opt.startVal : 0;
			var end = typeof(opt.endVal) != 'undefined' ? opt.endVal : length - 1;
			var m = start + Math.floor((end - start)/2);
			var usekey = false;

			function c(val) {
				var ref;
				if(usekey) {
					ref = val[opt.key];
				}
				else {
					ref = val;
				}
				if(opt.lower && typeof(value) == "string") {
					ref = ref.toLowerCase();
				}
				if(opt.prefix) {
					ref = opt.prefix + ref;
				}
			}
			if(typeof(opt.key) != 'undefined' && typeof(value[opt.key]) != 'undefined') {
				usekey = true;
			}

			if(length == 0){
				array.push(value);
				return 0;
			}
		 
			if(c(value) > c(array[end])) {
				console.log(c(value) + ' > ' + c(array[end]) + '?'); 
				array.splice(end + 1, 0, value);
				return end + 1;
			}
		 
			if(c(value) < c(array[start])){
				console.log(c(value) + ' < ' + c(array[start]) + '?');
				array.splice(start, 0, value);
				return start;
			}
		 
			if(start >= end){
				return end;
			}
		 
			if(c(value) < c(array[m])){
				console.log(c(value) + ' < ' + c(array[m]) + '?');
				var opt2 = _.clone(opt);
				opt2.startVal = start;
				opt2.endVal = m - 1;
				return binaryInsert(value, array, opt2);
			}
		 
			if(c(value) > c(array[m])){
				console.log(c(value) + ' > ' + c(array[m]) + '?');
				var opt2 = _.clone(opt);
				opt2.startVal = m + 1;
				opt2.endVal = end;
				return binaryInsert(value, array, opt2);
			}
		 
			//we don't insert duplicates
		}
		, Math: {

			cubicBezier: function(x1, y1, x2, y2, epsilon) {

				var curveX = function(t){
					var v = 1 - t;
					return 3 * v * v * t * x1 + 3 * v * t * t * x2 + t * t * t;
				};

				var curveY = function(t){
					var v = 1 - t;
					return 3 * v * v * t * y1 + 3 * v * t * t * y2 + t * t * t;
				};

				var derivativeCurveX = function(t){
					var v = 1 - t;
					return 3 * (2 * (t - 1) * t + v * v) * x1 + 3 * (- t * t * t + 2 * v * t) * x2;
				};

				return function(t){

					var x = t, t0, t1, t2, x2, d2, i;

					// First try a few iterations of Newton's method -- normally very fast.
					for (t2 = x, i = 0; i < 8; i++){
						x2 = curveX(t2) - x;
						if (Math.abs(x2) < epsilon) return curveY(t2);
						d2 = derivativeCurveX(t2);
						if (Math.abs(d2) < 1e-6) break;
						t2 = t2 - x2 / d2;
					}

					t0 = 0, t1 = 1, t2 = x;

					if (t2 < t0) return curveY(t0);
					if (t2 > t1) return curveY(t1);

					// Fallback to the bisection method for reliability.
					while (t0 < t1){
						x2 = curveX(t2);
						if (Math.abs(x2 - x) < epsilon) return curveY(t2);
						if (x > x2) t0 = t2;
						else t1 = t2;
						t2 = (t1 - t0) * .5 + t0;
					}

					// Failure
					return curveY(t2);

				}

			}
		}
	};
	return Utils;
});
