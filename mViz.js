/* *******************************
*  mViz
*  The server-side implementation of our in-progress memento visualization
*  Mat Kelly <mkelly@cs.odu.edu> 
* 
*  20131220 - MAT Init
******************************* */
/* Run this with:
*  > node mViz.js
*  Then send a request for a URI and Accept-Datetime, e.g.,
*  > curl -H "Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT" localhost:15421/?URI-R=http://matkelly.com
*  The expected return value is the resolved Accept-Datetime
*/
var http = require("http");
//var http = require('http').http;
var url = require("url");

// And now for something completely different: phantomjs dependencies!
var phantom = require('node-phantom');
//https://github.com/alexscheelmeyer/node-phantom

var timegate_host = "mementoproxy.lanl.gov";
var timegate_path = "/aggr/timegate/";
//var timemap;



//curl -H "Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT" localhost:15421/?URI-R=http://matkelly.com
//curl -I -H "Accept-Datetime: Thu, 01 Apr 2010 00:00:00 GMT" http://mementoproxy.lanl.gov/aggr/timegate/http://matkelly.com

function start(){
	function respond(request, response) {
	  var pathname = url.parse(request.url).pathname;

	  response.writeHead(200, {"Content-Type": "text/plain"});
	  var query = url.parse(request.url, true).query;
	  var uri_r = query['URI-R'];
	  getTimemap(uri_r,request.headers['accept-datetime']);
	  getMementoDateTime(uri_r,request.headers['accept-datetime'],timegate_host,timegate_path,true);
	  
	  response.end();
	}
	
	http.createServer(respond).listen(15421);
}

function getMementoDateTime(uri,date,host,path,appendURItoFetch){
	
	var pathToFetch = path;
	if(appendURItoFetch){
		pathToFetch += uri;
	}
	console.log("Trying for "+host+pathToFetch);
	
 	var options_gmdt = {
	  		host: host,
	  		path: pathToFetch,
	  		port: 80,
	  		method: 'HEAD',
	  	 	headers: {"Accept-Datetime": date}
	  };
	var locationHeader = "";  
	var req_gmdt = http.request(options_gmdt, function(res_gmdt) {
		if(res_gmdt.headers['location'] && res_gmdt.statusCode != 200){
			console.log("Received a "+res_gmdt.statusCode+" code, going to "+res_gmdt.headers['location']);
			var locationUrl = url.parse(res_gmdt.headers['location']);
			return getMementoDateTime(uri,date,locationUrl.host,locationUrl.pathname,false);
		}else {
			console.log("Memento-Datetime is "+res_gmdt.headers['memento-datetime']);
			return res_gmdt.headers['memento-datetime'];
		}
		//console.log(res_gmdt.headers);
	  });
	  
	req_gmdt.on('error', function(e) { // Houston...
	  console.log('problem with request: ' + e.message);
	  console.log(e);
	  console.log(req_gmdt);
	});
	req_gmdt.on('socket', function (socket) { // slow connection is slow
		socket.setTimeout(7000);  
		socket.on('timeout', function() {
			console.log("The server took too long to respond and we're only getting older so we aborted.");
			req_gmdt.abort();
		});
	});

	// write data to request body
	req_gmdt.write('data\n');
	req_gmdt.write('data\n');
	req_gmdt.end();
}

function getTimemap(uri,date){
  	var options = {
	  		host: 'mementoproxy.lanl.gov',
	  		path: '/aggr/timemap/link/1/' + uri,
	  		port: 80,
	  		method: 'GET',
	  	 	headers: {"Accept-Datetime": date}
	  };
	  
	var buffer = ""; // An out-of-scope string to save the Timemap string
	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (data) {
			buffer += data.toString();
		});
		res.on('end',function(d){
			if(buffer.length > 100){ 
				console.log("Timemap acquired for "+uri);
			}
		});
	  });
	  
	req.on('error', function(e) { // Houston...
	  console.log('problem with request: ' + e.message);
	  console.log(e);
	});
	req.on('socket', function (socket) { // slow connection is slow
		socket.setTimeout(3000);  
		socket.on('timeout', function() {
			console.log("The server took too long to respond and we're only getting older so we aborted.");
			req.abort();
		});
	});
	

	// write data to request body
	req.write('data\n');
	req.write('data\n');
	req.end();
}

exports.start = start;
start();
