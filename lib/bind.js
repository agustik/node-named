var md5 = require('MD5');

var fs = require('fs');

var exec = require('child_process').exec;

module.exports = {
	config : {
		
	},
	createrequest : function (obj, type, callback){
		console.log(obj);
		var content = ""; 
			_root=this,
			hash = md5(JSON.stringify(obj)),
			isWin = /^win/.test(process.platform),
			separator = (isWin) ? '\\' : '/',
			fs = require('fs'),
			file = __dirname+separator+"tmp"+separator+ hash;
		content+="server " + _root.config.server + "\n";
//		content+="debug yes" + "\n";
		content+="zone "+ obj.zone +"." + "\n";
		if(type == 'update'){


			if(obj.type.toLowerCase() == "cname" ){
				content+="prereq nxrrset "+obj.hostname+" A \n";
				content+="prereq nxrrset "+obj.hostname+" CNAME \n";
			}
			/* Delete record if exists */
			content+="update delete "+obj.hostname +" "+obj.type+"\n";

			/* Add new record */
			content+="update add "+obj.hostname +" "+ obj.ttl +" "+obj.type+" "+obj.value + "\n";
			
		}else if(type == 'insert'){
			if(obj.type.toLowerCase() == "cname" ){
				content+="prereq nxrrset "+obj.hostname+" A \n";
				content+="prereq nxrrset "+obj.hostname+" CNAME \n";
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
	insert : function (obj, callback){
		var _root = this;

		this.createrequest(obj,'insert', function (err, file){
			if(!err){
				_root.nsupdate(file, callback);
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
		var _root = this;
		if (_root.config.key){
			auth = "-y "+_root.config.rndc_key+":"+_root.config.rndc_secret;
		}
		var command = "nsupdate "+auth+" -v "+file;
		var exec = require('child_process').exec;
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