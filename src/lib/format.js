'use strict';

const
	epic = require('epic.util');

const
	slice = Array.prototype.slice,
	reduce = Array.prototype.reduce,
	cache = new Map(),
	regex = /(:[\w]+)/g;


class UrlFormat
{
	constructor(url)
	{
		this.fragment = [];
		this.original = url;
		this.analyzer(url);
	}

	analyzer(url)
	{
		let match, index = 0;
		while(match = regex.exec(url))
		{
			this.fragment.push({key:match[0].substr(1), txt: url.substring(index, match.index)});
			index = match.index + match[0].length;
		}
	}

	format(args)
	{
		switch(epic.typeof(args))
		{
			case 'string':
				return this.formatArray([args]);
				break;
			case 'array':
				return this.formatArray(args);
				break;
			case 'object':
				return this.formatObject(args);
				break;
			default:
				return this.empty();
				break;
		}
	}

	empty()
	{
		return this.fragment.map(e => e.txt).join('');
	}

	// array[string]
	formatArray(args)
	{
		let result = '', len = args.length;

		this.fragment.forEach((val, i) =>
		{
			if (len > i)
				result += val.txt + args[i];
			else
				result += val.txt;
		});
		return result;
	}

	// object
	formatObject(args)
	{
		let result = '';
		this.fragment.forEach((val, i) =>
		{
			if (args.hasOwnProperty(val.key))
				result += val.txt + args[val.key];
			else
				result += val.txt;
		});
		return result;
	}

	static parse(url, args)
	{
		if (arguments.length === 1)
		{
			switch(epic.typeof(url))
			{
				case 'string':
					return url;
					break;
				case 'array':
					return this.parse(arguments[0], slice.call(arguments, 1));
					break;
				default:
					throw new Error('unsupport format: ', epic.typeof(url));
					break;
			}
		}


		if (arguments.length > 2)
			return this.parse(url, slice.call(arguments, 1));


		if (!cache.has(url))
			cache.set(url, new UrlFormat(url));

		return cache.get(url).format(args);
	}

	static combine()
	{
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

exports.parse = UrlFormat.parse;
exports.combine = UrlFormat.combine;



/*

console.log(UrlFormat.combine('http://locahost:6712/', '/base/', 'test', 'id'));

console.log(UrlFormat.parse('/api/1/:id/:name:val', 'id1', 'name1'));
console.log(UrlFormat.parse('/api/1/:id/:name:val', ['id2', 'name2']));

console.log(UrlFormat.parse('/api/1/:id/:name:val', {id:'id3', name:'name3'}));
*/
