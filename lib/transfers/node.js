const
	querystring = require('querystring'),
	url = require('url'),
	http = require('http'),
	http = require('https');

const
	debug = require('debug')('epic.request:transfer.node'),
	epic = require('epic.util'),
	urlFormat = require('./url'),
	UrlDeafultFields = ['hostname','port','path','method','headers', 'query', 'format'];


module.exports = context => {

	let [headers, data] = [context.header, context.data];
	



};