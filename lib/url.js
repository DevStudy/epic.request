'use strict';

const
	epic = require('epic.util');

const
	slice = Array.prototype.slice,
	reduce = Array.prototype.reduce,
	cache = new Map(),
	regex = /(:[\w]+)/g;



class Formatter
{
	static mix(fragment, args)
	{
		epic.each(args, (e, i) =>
		{
			if (epic.typeof(e) === 'object')
			{

			}

		});
	}

	static object(map, context, arg)
	{
		Object.keys(arg).forEach(e =>
		{
			if (this.key(context, map.get(e), e, arg[e]))
				delete arg[e];
		});

	}


	static key(context, indexs, key, val)
	{
		if (!indexs) return false;
		indexs.forEach(e => context[e] = context[e].txt + val);
		return true;
	}

}

class Url
{
	constructor(url)
	{
		this.context = {url: url, fragment: [], key: new Map()};
		this.analyzer(url);
	}

	keyInit()
	{
		this.context.fragment.forEach((e, i) =>
		{
			if (!e.key || !e.key.length) return;
			this.context.key.has(e.key) && this.context.key.get(e.key).push(i) || this.context.key.set(e.key, [i]);
		});
	}

	analyzer(url)
	{
		let match, index = 0;
		while(match = regex.exec(url))
		{
			this.context.fragment.push({key:match[0].substr(1), txt: url.substring(index, match.index)});
			index = match.index + match[0].length;
		}

		if (index === 0) return;
		

		if (index !== url.length)
			this.context.fragment.push({txt: url.substr(index)});

		this.keyInit();
	}

	// object 有限匹配, 然后匹配 数组
	format(args, isDelete)
	{
		if (this.context.fragment.length === 0) return this.context.original;
		if (args === undefined || args === null) return this.empty();
		if (Array.isArray(args) && args.length === 0) return this.empty();

		let
			result = slice.call(this.context.fragment),
			// 命名对象
			named = [],
			// 顺序对象
			sequence = [];

		epic.each(args, e =>
		{
			if (e === undefined || e === null) return;
			(epic.typeof(e) === 'object' ? named : sequence).push(e)
		});

		let matchs;
		named.forEach(e =>
		{
			for(let key in e)
			{
				matchs = this.context.key.get(key);
				if (!matchs) continue;
				matchs.forEach(i => result[i] = result[i].txt + encodeURIComponent(e[key]));
				if (isDelete)
					delete e[key];
			}
		});

		let index = 0;
		result.forEach((e, i) =>
		{
			if (!e.hasOwnProperty('txt')) return;
			if (sequence.length > 0 && index < sequence.length)
			{
				if (e.key)
					this.context.key.get(e.key).forEach(i => result[i].txt && (result[i] = result[i].txt + encodeURIComponent(sequence[index])));
				else
					result[i] = e.txt + sequence[index];
				
				index++;
			}
			else
				result[i] = e.txt;
		});


		return Url.combine(result);
	}


	empty()
	{
		if (!this.context.empty)
			this.context.empty = this.fragment.map(e => e.txt).join('');
		return this.context.empty;
	}

	static parseRef(url, args)
	{
		if (arguments.length === 1 && Array.isArray(url))
			this.parseref(arguments[0], slice.call(arguments, 1));

		if (arguments.length > 2)
				return this.parseref(url, slice.call(arguments, 1));

	if (url.lastIndexOf(':') === -1)
		return url;

		if (!cache.has(url))
			cache.set(url, new Url(url));

		return cache.get(url).format(args, true);
	}

	static parse(url, args)
	{
		if (arguments.length === 1 && Array.isArray(url))
			this.parse(arguments[0], slice.call(arguments, 1));

		if (arguments.length > 2)
				return this.parse(url, slice.call(arguments, 1));

	if (url.lastIndexOf(':') === -1)
		return url;

		if (!cache.has(url))
			cache.set(url, new Url(url));

		return cache.get(url).format(args);
	}

	static combine()
	{
		if (arguments.length === 1 && Array.isArray(arguments[0]))
			return this.combine.apply(null, arguments[0]);

		return reduce.call(arguments, (previous, current) =>
		{
			if (previous === undefined || previous === null) return current || '';
			if (current === undefined || current === null) return previous || '';

			let left = previous[previous.length -1] === '/', right = current[0] === '/';
			if (left && right)
				return previous + current.substr(1);

			if (left || right)
				return previous + current;

			return previous +'/'+ current;
		});
	}
}



// url: /users/:id/login/:id
/*
let context = [{key:'id', txt:'/user/'}, {key:'id', txt:'/login/'}];

let f = new Url('/users/:id/login/:userid/noop');

let a = {id:2};
console.log(f.format(a));
*/
exports.parseRef = Url.parseRef;
exports.parse = Url.parse;
exports.combine = Url.combine;


//console.log(Url.parse('/login/:id', [ undefined, {} ]));

/*

console.log(UrlFormat.combine('http://locahost:6712/', '/base/', 'test', 'id'));

console.log(UrlFormat.parse('/api/1/:id/:name:val', 'id1', 'name1'));
console.log(UrlFormat.parse('/api/1/:id/:name:val', ['id2', 'name2']));

console.log(UrlFormat.parse('/api/1/:id/:name:val', {id:'id3', name:'name3'}));
*/
