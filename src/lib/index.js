'use strict';

const
	querystring = require('querystring'),
	url = require('url'),
	http = require('http'),
	Stream = require('stream');

const
	debug = require('debug')('epic.request:request'),
	co = require('co'),
	epic = require('epic.util'),
	format = require('./format'),
	UrlDeafultFields = ['hostname','port','path','method','headers','agent'];



const copy = function(source, target, fields)
{
	if (fields)
		return fields.forEach(e => source.hasOwnProperty(e) && epic.typeof(source[e]) === 'object' ? copy(source[e], target[e] = {}) : (target[e] = source[e]));

	Object.keys(source).forEach(e => epic.typeof(source[e]) === 'object'? copy(source[e], target[e] = {}) : target[e] = source[e]);
};


const parseUrl = function(context, uri)
{
	let result = url.parse(uri, true);
	for(let key in result)
		context[key] = result[key];
};
const parseQueryString = function(context)
{
	if (context.querystring)
		context.path = format.parse(context.path, context.querystring);
	else if(context.query)
		context.path = format.parse(context.path, context.query);

	console.log(context.path);
};

const parseFormData = function(context)
{
	if (!context.form) return;

	context.headers || (context.headers = {});
	if (context.form.file && context.form.stream)
	{

	}
	else
	{
		let result;
		if (context.form.json)
		{
			result = context.form.json.map(e => epic.typeof(e) === 'string' ? e : JSON.stringify(e));
			if (result.length === 1)
				result = result[0];
			else
				result = '['+ result.join(',') +']';

			context.headers['Content-Type'] = 'application/json';
		}
		else
		{
			context.form.default.map(e => epic.typeof(e) === 'string' ? e : querystring.stringify(e));
			if (result.length === 1)
				result = result[0];
			else
				result = result.join('&');

			context.headers['Content-Type'] = 'application/x-www-form-urlencoded';
		}
		context.headers['Content-Length'] = result.length;
		return result;
	}
	
};


class RequestContent extends Stream
{
	constructor(context, method, path, qs, form)
	{
		super();
		this.opts = {};
		copy(context, this.opts, UrlDeafultFields);
		this.opts.method = method;
		this.path(path);
		this.qs(qs);
		this.form(form);
	}

	headers(data)
	{
		if (data)
		{
			this.opts.headers || (this.opts.headers = {});
			copy(data, this.opts.headers);
		}
		return this;
	}

	path(data)
	{
		if (data)
			this.opts.path = format.combine(this.opts.path, data)

		return this;
	}

	querystring(data)
	{
		if (data)
		{
			this.opts.querystring || (this.opts.querystring = []);
			epic.each(data, e =>
			{
				if (epic.typeof(data) === 'string')
					this.opts.querystring.push(e);
				else
					copy(data, this.opts.query);
			});
		}
		
		return this;
	}

	form(data, type)
	{
		if (data)
		{
			this.opts.form || (this.opts.form = {});
			if (type === 'json')
			{
				this.opts.form.json || (this.opts.form.json = []);
				this.opts.form.json.push(data);
			}
			else
			{
				this.opts.form.default || (this.opts.form.default = []);
				this.opts.form.default.push(data);
			}
		}
		return this;
	}

	formJSON(data)
	{
		return this.form(data, 'json');
	}

	attach(data)
	{
		if (data)
		{
			this.opts.form || (this.opts.form = {});

			epic.each(data, e =>
			{
				if (epic.typeof(e) === 'string')
				{
					this.opts.form.file || (this.opts.form.file = []);
					this.opts.form.file(data);
				}
				else
				{
					this.opts.form.stream || (this.opts.form.stream = []);
					this.opts.form.stream(data);
				}
			});
			
		}
		return this;
	}

	result()
	{
		return done =>
		{

			parseQueryString(this.opts);

			let formData = parseFormData(this.opts);



			let req = http.request(this.opts, res =>
			{
				let data = '';
				res.setEncoding('utf8');
				res.on('data', chunk =>
				{
					data += chunk;
				});
				res.on('end', () =>
				{
					done && done(null, {url:res.url, statusCode:res.statusCode, statusMessage:res.statusMessage, data:data})
				});
			});

			req.on('error', e => done && done(null, {error: e}));

			if (formData)
				req.write(formData);
			req.end();
		};
	}

	xml()
	{

	}

	*json()
	{
		let result = yield this.result();
		if (result.data)
			result.data = JSON.parse(result.data);
		return result;
	}

	string()
	{

	}

}
RequestContent.prototype.qs = RequestContent.prototype.querystring;

// request.get().qs().;
class Request
{
	constructor(opts)
	{
		if (epic.typeof(opts) === 'string')
			opts = {url: opts};

		this.method = opts.method || 'GET';
		opts.url && parseUrl(this, opts.url);
		this.headers ={};

	}


	get(path)
	{
		return new RequestContent(this, 'get', path);
	}

	post(path)
	{
		return new RequestContent(this, 'post', path);
	}

	post(path)
	{
		return new RequestContent(this, 'post', path);
	}
}

Request.format = format;

module.exports = Request;
