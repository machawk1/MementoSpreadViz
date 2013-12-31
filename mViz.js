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

var fs = require("fs");

var timegate_host = "mementoproxy.lanl.gov";
var timegate_path = "/aggr/timegate/";

var PORT = 15421;
//var timemap;



//curl -H "Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT" localhost:15421/?URI-R=http://matkelly.com
//curl -I -H "Accept-Datetime: Thu, 01 Apr 2010 00:00:00 GMT" http://mementoproxy.lanl.gov/aggr/timegate/http://matkelly.com

/**
* Initially called to invoke the server instance
*/
function main(){
	/**
	* Handle an HTTP request and respond appropriately
	* @param request  The request object from the client representing query information
	* @param response Currently active HTTP response to the client used to return information to the client based on the request
	*/
	function respond(request, response) {
	  var pathname = url.parse(request.url).pathname;

	  response.writeHead(200, {"Content-Type": "text/html"});
	  var query = url.parse(request.url, true).query;
	  var uri_r = query['URI-R'];
	  getTimemap(uri_r,request.headers['accept-datetime']);
	  var mementoDatetime = getMementoDateTime(uri_r,request.headers['accept-datetime'],timegate_host,timegate_path,true);
	  
	  if(!mementoDatetime){
	  	console.log("Serving an HTML form");
	  	
	  	var buffer = fs.readFileSync('./index.html');
		response.write(buffer.toString("utf8", 0, buffer.length));
	
	  	response.end();
	  }else {
	  	  console.log("Memento-Datetime was served. Done.");
		  response.end();
		}
	}
	
	// Initialize the server based and perform the "respond" call back when a client attempts to interact with the script
	http.createServer(respond).listen(PORT);
}

/**
* Based on a URI and an accept-datetime, return the closest Memento-Datetime
* @param uri  The URI-R to use as the basis of the request to the archive
* @param date The Accept-Datetime HTTP header value sent to the server in the memento request
* @param host The Memento Aggregator/proxy hostname
* @param path The Memento Aggregator/proxy path preceding the URI being requested
* @param appendURItoFetch A boolean value to allow the method to be called recursively in case of a forward to prevent multiply appending the URI-R on subsequent recursive calls
*/
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
	  });
	  
	req_gmdt.on('error', function(e) { // Houston, do we have an Internet connection?
	  console.log('problem with request: ' + e.message); 
	  //console.log(e);
	  //console.log(req_gmdt);
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

/**
* TODO document function
* @param param1
*/

function getTimemap(uri,date){
  	var options = {
	  		host: 'mementoproxy.lanl.gov',
	  		path: '/aggr/timemap/link/1/' + uri,
	  		port: 80,
	  		method: 'GET',
	  	 	headers: {"Accept-Datetime": date}
	  };
	  
	var buffer = ""; // An out-of-scope string to save the Timemap string, TODO: better documentation
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

exports.main = main;
main();
