var restify = require('restify');

var exec = require('child_process').exec;

var server = restify.createServer();

var config = require('./config.json');

var md5 = require('MD5');

var isWin = /^win/.test(process.platform);
var separator = (isWin) ? '\\' : '/';
var fs = require('fs');
server.use(restify.bodyParser());

 server.use(restify.queryParser({ mapParams: false }));

server.get('/api/:zone', function (req, res){

	var token = req.headers['x-token'];

	var data = req.query;
	data.zone = req.params.zone;
	var resp = {
		status:'fail',
		message : 'zone needed /api/:zone'
	};


	if(!Authenticate(token)){
		if(token == undefined){
			resp.message="No token";
		}else{
			resp.message="Token not valid";
		}
		res.send(resp);
		return;
	}
	data.type = (data.type) ? data.type : config.type;
	if(!req.params.zone){
		res.send(resp);
		return;
	}
	if(req.params.zone == 'dig'){
		console.log(data);
		resp.status='fail';
		delete resp.message;
		dig.query(data, function (err, response){
			console.log('err:',err, response);
			if(!err){
				resp.status='success';
				resp.data=response;
			}else{
				resp.message=response;
			}
			res.send(resp);
		});
	}else{
		resp.status='fail';
		delete resp.message;
		dig.hostname=data.zone;
		dig.query(data, function (err, response){
			console.log('err:',err, response);
			if(!err){
				resp.status='success';
				resp.data=response;
			}else{
				resp.message=response;
			}
			res.send(resp);
		});
	}
	
});

server.post('/api/:zone', function (req, res){
	var data = JSON.parse(req.body);
	var token = req.headers['x-token'];
	var resp = {status:'fail'} ;

	if(!data.value || data.hostname){
		resp.message="value or hostname missing";
		res.send(resp);
		return;
	}

	if(!Authenticate(token)){
		if(token == undefined){
			resp.message="No token";
		}else{
			resp.message="Token not valid";
		}
		res.send(resp);
		return;
	}

	
	data.ttl = (data.ttl) ? data.ttl : config.ttl;
	data.type = (data.type) ? data.type : config.type;
	data.zone = req.params.zone;
	bind.update(data, function (err, msg){
		
		if(err){
			resp.message=msg;
		}else{
			resp.status='success';
		}

		res.send(resp);
	});
	
});
server.del('/api/:zone', function (req, res){
	var data = JSON.parse(req.body);

	var token = req.headers['x-token'];
	var resp = {status:'fail'} ;

	if(!Authenticate(token)){
		if(token == undefined){
			resp.message="No token";
		}else{
			resp.message="Token not valid";
		}
		res.send(resp);
		return;
	}


	data.ttl = (data.ttl) ? data.ttl : config.ttl;
	data.type = (data.type) ? data.type : config.type;
	data.zone = req.params.zone;
	bind.delete(data, function (err, msg){
		
		if(err){
			resp.message=msg;
		}else{
			resp.status='success';
		}

		res.send(resp);
	});
});

function Authenticate(token){
	if(config.tokens.indexOf(token) !== -1 ){
		return true;
	}else{
		return false;
	}
}

server.listen(8081, function() {
  console.log('%s listening at %s', server.name, server.url);
});


var bind = {
	createrequest : function (obj, type, callback){
		console.log(obj);
		var content = ""; 
		var hash = md5(JSON.stringify(obj));
		var file = __dirname+separator+"tmp"+separator+ hash
		content+="server " + config.server + "\n";
//		content+="debug yes" + "\n";
		content+="zone "+ obj.zone +"." + "\n";
		if(type == 'update'){
			if(obj.type.toLowerCase() == "cname" ){
				content+="prereq nxrrset "+obj.hostname+" A";
				content+="prereq nxrrset "+obj.hostname+" CNAME";
			}
			content+="update add "+obj.hostname +" "+ obj.ttl +" "+obj.type+" "+obj.value + "\n";
			
		}else if(type == 'delete'){
			content+="update delete "+obj.hostname +" "+obj.type+"\n";
		}else{
			return;
		}
		content+="send" + "\n";
		fs.writeFile(file, content, function (err, stats){
			if(err){
				callback(err);
			}else{
				callback(null, file);
			}
		});
	},
	update : function (obj, callback){
		var _root = this;

		this.createrequest(obj,'update', function (err, file){
			if(!err){
				_root.nsupdate(file, callback);
			}
		});
		
	},
	delete : function (obj, callback){
		var _root=this;
		this.createrequest(obj,'delete', function (err, file){
			if(!err){
				_root.nsupdate(file, callback);
			}
		});
	},
	nsupdate : function (file, callback){
		var auth = "";
		if (config.key){
			auth = "-y "+config.rndc_key+":"+config.rndc_secret;
		}
		var command = "nsupdate "+auth+" -v "+file;
		exec(command,
		  function (error, stdout, stderr) {
		    if (error) {
		      callback(error, stderr + stdout);
		    }else{
		      callback(null, command);
		    }
		});
	}
};

var dig = {
	query : function (obj, callback){

		var _root = this;
		var extra ='';
		if (obj.type == 'soa'){
			extra = '+m'
		}

		var command = 'dig @' + config.server +' ' + obj.hostname + ' '+obj.type+' +noall +nocomments +answer ' + extra;
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