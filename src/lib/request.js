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
	urlFormat = require('./url'),
	UrlDeafultFields = ['hostname','port','path','method','headers', 'query', 'format'];




const copy = function(source, target, fields)
{
	if (fields)
		return fields.forEach(e => source.hasOwnProperty(e) && epic.typeof(source[e]) === 'object' ? copy(source[e], target[e] = {}) : (target[e] = source[e]));

	Object.keys(source).forEach(e => epic.typeof(source[e]) === 'object'? copy(source[e], target[e] = {}) : target[e] = source[e]);
};


const parseUrl = function(context, uri)
{
	epic.with(url.parse(uri, true), e => Object.keys(e).forEach(key => context[key] = e[key]));
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
			result = context.form.default.map(e => epic.typeof(e) === 'string' ? e : querystring.stringify(e));
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
	constructor(opts, method, path, qs, form)
	{
		super();
		this.context = {};
		copy(opts, this.context, UrlDeafultFields);
		this.context.method = method;
		if (path)
			this.context.unpath = path;
		this.qs(qs);
		this.form(form);
	}

	headers(data)
	{
		if (data)
		{
			this.context.headers || (this.context.headers = {});
			copy(data, this.context.headers);
		}
		return this;
	}


	path(data)
	{
		if (this.context.unpath)
		{
			this.context.path = urlFormat.combine(this.context.path, urlFormat.parseRef(this.context.unpath, [this.context.qs, this.context.query]));
			this.context.unpath = '';

		}

		if (data)
			this.context.unpath = data;

		return this;
	}

	querystring(data)
	{
		if (data)
		{
			this.context.qs || (this.context.qs = []);
			epic.each(data, e =>
			{
				if (epic.typeof(data) === 'string')
					this.context.qs.push(e);
				else
					copy(data, this.context.query);
			});
		}
		
		return this;
	}

	form(data, type)
	{
		if (data)
		{
			this.context.form || (this.context.form = {});
			if (type === 'json' || (!type && this.context.format === 'json'))
			{
				this.context.form.json || (this.context.form.json = []);
				this.context.form.json.push(data);
			}
			else
			{
				this.context.form.default || (this.context.form.default = []);
				this.context.form.default.push(data);
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
			this.context.form || (this.context.form = {});

			epic.each(data, e =>
			{
				if (epic.typeof(e) === 'string')
				{
					this.context.form.file || (this.context.form.file = []);
					this.context.form.file(data);
				}
				else
				{
					this.context.form.stream || (this.context.form.stream = []);
					this.context.form.stream(data);
				}
			});
			
		}
		return this;
	}

	result()
	{
		return done =>
		{

			this.path();

			let data = parseFormData(this.context);

			let req = http.request(this.context, res =>
			{
				let ret = '';
				res.setEncoding('utf8');
				res.on('data', chunk => ret += chunk);
				res.on('end', () => done && done(null, {statusCode:res.statusCode, statusMessage:res.statusMessage, data:ret}));
			});

			req.on('error', e => done && done(null, {statusCode: res.statusCode, error: e}));

			if (data)
				req.write(data);
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
		{
			try
			{
				return [JSON.parse(result.data), result.statusCode === 200 ? null : result.statusCode];
			}
			catch(e)
			{
				if (result.error)
					result.error.inner = e
				else
					result.error = e;

				// 415 Unsupported Media Type
				return [null, result.statusCode === 200 ? 415 : result.statusCode, result]

			}
		}

		return [result, result.statusCode === 200 ? null : result.statusCode];
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

		this.context = {};
		copy(opts, this.context);

		this.method = opts.method || 'GET';
		opts.url && parseUrl(this.context, opts.url);

	}


	headers(key, value)
	{
		if (!value)
		{
			this.context.headers || (this.context.headers = {});
			//if (key === 'json')
			//	this.context.headers['content-type'] = 'application/json';
		}

		return this;
	}


}


// attach http method
http.METHODS.forEach(e =>
{
	let method = e.toLowerCase();
	Request.prototype[method] = function(path)
	{
		return new RequestContent(this.context, method, path);
	}
});


module.exports = Request;
