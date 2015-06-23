
var exec = require('child_process').exec;

module.exports =  {
	config : {

	},
	query : function (obj, callback){
		var _root = this;
		var extra ='';
		//var exec = require('child_process').exec;
		if (obj.type == 'soa'){
			extra = '+m'
		}

		var command = 'dig @' + _root.config.server +' ' + obj.hostname + ' '+obj.type+' +noall +nocomments +answer ' + extra;

		exec(command,
		  function (error, stdout, stderr) {
		    if (error) {
		      callback(error, stderr + stdout);
		    }else{
		    	var x = _root._tools._cleandig(stdout, obj.hostname, obj.type);

		      if(x.length < 1){
		      	x = false;
		      }

		      if(x){
		      	callback(null, x);
		      }else{
		      	callback('notfound', 'Record not found');
		      }
		    }
		});
	},
	_tools : {
		_cleandig : function (data, zone){
			console.log(data, zone);
			var _tools = this,x, value, obj = {}, ret = data.split('global options: +cmd')[1];
			var _root = this;
			ret = ret.split('\r\n')//[1].split('\t');
			var output = [];
			for (key in ret){

				value = ret[key];
				if(value !== ''){
					x = _tools._parse(value, zone);
					if(x){
						output.push(x);
					}
				}
			};
			return output;
		},
		_isIP : function (ip){
			var reg = new RegExp('(\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})');

			return reg.test(ip);
		},
		_parse : function (string, zone){
			string = string.replace(/(\r\n|\n|\r)/gm,"");
			var _tools = this, value, obj = {}, ret = string.split('\t');
			var _root = this;
			console.log(_root);
			var types = ['MX', 'A', 'SOA', 'NS', 'TXT', 'AAA', 'SRV' ,'CNAME','PTR'];
			zone = (zone.charAt(zone.length-1) == '.') ? zone : zone+'.';
			if(ret.length <= 1){
				return false;
			}
			for (key in ret){
				value = ret[key];
				if (zone == value){
					obj.hostname = value;
				}else if (value.charAt(value.length -1) =='.'){
					obj.record = value
				}
				if(value.indexOf(' ') !==-1){
					var y = value.split(' ');
					console.log('SPLIT', value.split(' '));
					obj.record = y[1];
					obj.priority = +y[0];
				}else if(_tools._isIP(value)){
					obj.ip = value;
				}
				if (!isNaN(+value)){
					obj.ttl = +value;
				}
				if(types.indexOf(value) !== -1){
					obj.type=value;
				}
			}
			return obj;
		}
	}
};