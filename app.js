var restify = require('restify');

var server = restify.createServer();

var config = require('./config.json');

var bind = require('./lib/bind.js');

var dig = require('./lib/dig.js');

dig.config = config;
bind.config=config;



server.use(restify.bodyParser());

server.use(restify.queryParser({ mapParams: false }));


function app (req, res, next){

	var data

	var token = req.headers['x-token'];

	if (req.method=='GET'){
		data = req.query;
	}else{
		data = req.body;
	}

	if(req.headers['content-type'] !== 'application/json'){
		data = JSON.parse(data);
	}
	
	data.zone = req.params.zone;
	data.ttl = (data.ttl) ? data.ttl : config.ttl;
	data.type = (data.type) ? data.type : config.type;
	data.zone = req.params.zone;

	var resp = {
		status:'fail'
	};


	if(!req.params.zone){
		resp.message='zone needed /api/:zone';
		res.send(resp);
		return next();
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
	
	if(!req.params.zone){
		res.send(resp);
		return;
	}
	switch(req.method){
		case 'DELETE':
			bind.delete(data, function (err, msg){
				
				if(err){
					resp.message=msg;
				}else{
					resp.status='success';
				}

				res.send(resp);
			});
		break;
		case 'PUT':

		break;
		case 'POST':
			bind.update(data, function (err, msg){
				if(err){
					resp.message=msg;
				}else{
					resp.status='success';
				}

				res.send(resp);
			});
		break;
		case 'GET':
			if(req.params.zone !== 'dig'){
				data.hostname=data.zone;
			} 
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
			
		break;
		default:
			resp.message="Operation not supported";
			res.send(resp);
		break;
	}


	return next();
};

server.get('/api/:zone', app);
server.del('/api/:zone', app);
server.put('/api/:zone', app);
server.post('/api/:zone', app);

// server.post('/api/:zone', function (req, res){

// 	console.log('POST');
// 	var data = JSON.parse(req.body);
// 	var token = req.headers['x-token'];
// 	var resp = {status:'fail'} ;

// 	if(!data.value || !data.hostname){
// 		resp.message="value or hostname missing";
// 		res.send(resp);
// 		return;
// 	}

// 	if(!Authenticate(token)){
// 		if(token == undefined){
// 			resp.message="No token";
// 		}else{
// 			resp.message="Token not valid";
// 		}
// 		res.send(resp);
// 		return;
// 	}

	
// 	data.ttl = (data.ttl) ? data.ttl : config.ttl;
// 	data.type = (data.type) ? data.type : config.type;
// 	data.zone = req.params.zone;
// 	bind.update(data, function (err, msg){
		
// 		if(err){
// 			resp.message=msg;
// 		}else{
// 			resp.status='success';
// 		}

// 		res.send(resp);
// 	});
	
// });
// server.del('/api/:zone', function (req, res){
// 	console.log('DELETE');

// 	var data = JSON.parse(req.body);

// 	var token = req.headers['x-token'];
// 	var resp = {status:'fail'} ;

// 	if(!Authenticate(token)){
// 		if(token == undefined){
// 			resp.message="No token";
// 		}else{
// 			resp.message="Token not valid";
// 		}
// 		res.send(resp);
// 		return;
// 	}


// 	data.ttl = (data.ttl) ? data.ttl : config.ttl;
// 	data.type = (data.type) ? data.type : config.type;
// 	data.zone = req.params.zone;
// 	bind.delete(data, function (err, msg){
		
// 		if(err){
// 			resp.message=msg;
// 		}else{
// 			resp.status='success';
// 		}

// 		res.send(resp);
// 	});
// });

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
