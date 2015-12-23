const Request = require('../index');


co(function*()
{
	let request = new Request('http://127.0.0.1:6712/api/1/');


	let result = yield request.get('users/login/:id').qs('1000%2B001E67070740-jj_xuzhou').formJSON({test:'1'}).json();

	console.log(result);

})
.catch(e => console.log(e.stack));