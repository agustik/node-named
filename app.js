var restify = require('restify');

var exec = require('child_process').exec;

var server = restify.createServer();

var config = require('./config.json');

var md5 = require('MD5');

var isWin = /^win/.test(process.platform);
var separator = (isWin) ? '\\' : '/';
var fs = require('fs');
server.use(restify.bodyParser());

server.get('/api/:zone', function (req, res){
	console.log(req.params.zone);

	var resp = {
		status:'fail',
		message : 'zone needed /api/:zone'
	};
	if(req.params.zone){
		resp.status='success';
		delete resp.message;
	}
	res.send(resp);
});

server.get('/api/:zone', function (req, res){
		
	var data = req.body;
	data.zone = req.params.body;
	bind.update(data);
	res.send({status:'success'});
});

server.post('/api/:zone', function (req, res){
	var data = JSON.parse(req.body);
	data.ttl = (data.ttl) ? data.ttl : config.ttl;
	data.type = (data.type) ? data.type : config.type;
	data.zone = req.params.zone;
	bind.update(data, function (err, msg){
		var resp = {status:'fail'} ;
		if(err){
			resp.message=msg;
		}else{
			resp.status='success';
			resp.data = msg;
		}

		res.send({status:'fail', message : msg});
	});
	
});
server.del('/api/:zone', function (req, res){
	var data = JSON.parse(req.body);
	data.ttl = (data.ttl) ? data.ttl : config.ttl;
	data.type = (data.type) ? data.type : config.type;
	data.zone = req.params.zone;
	bind.delete(data, function (err, msg){
		var resp = {status:'fail'} ;
		if(err){
			resp.message=msg;
		}else{
			resp.status='success';
			resp.data = msg;
		}

		res.send({status:'fail', message : msg});
	});
});



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
			content+="update add "+obj.hostname +" "+ obj.ttl +" "+obj.type+" "+obj.ip + "\n";
			
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
}