const AUTHFILE = require('path').join(__dirname, 'clion-auth');

const request = require('request'),
	cheerio = require('cheerio'),
	fs = require('fs');

module.exports = {
	people: (query) => {

	},
	activities: (query) => {

	},
	announcements: (query) => {

	},
	events: (query) => {

	},
	all: (query) => {

	}
}

function search(type, query) {
	var options = {
		url: 'https://ion.tjhsst.edu/search?q=' + query,
		method: "GET",
		headers: {format: "json"}
	};

	try {
		var data = fs.readFileSync(AUTHFILE, 'utf8');
		options.headers.Authorization = `Basic ${data}`;
	} catch(err) {
		if(err.code == "ENOENT"){
			console.log("Please login first");
		}
		else {
			console.error;
		}
		return;
	}

	// console.log(options.headers.Authorization)

	request(options, (err, res, html) => {
		if(!err) {
			var $ = cheerio.load(html);
			var up = new Buffer(data, "base64").toString().split(":");
			var uname = up[0];
			var pass = up [1];
			var csrf = $("[name=csrfmiddlewaretoken]").val()
			options.form = {
				"username": uname,
				"password": pass,
				"csrfmiddlewaretoken": csrf
			}
			options.method = "POST";
			options.url = "https://ion.tjhsst.edu/login?next=/search?q=" + query;
			options.headers.Referer = options.url;
			var cookie = "csrftoken=" + csrf + '; expires=Tue, 24-Jan-2017 22:39:57 GMT; Max-Age=31449600; Path=/; Secure';
			// console.log(cookie);
			options.headers.Cookie = cookie;

			request(options, (err, res, html) => {
				console.log(err);
				console.log(res);
				console.log(html);
			})
			// var $ = cheerio.load(html);
			// console.log(html);
			// var people, activities, announcements, events;
			// var uTable = $(".users-table");
			// // console.log(uTable);
			// uTable.children().first().children().each((index) => {
			// 	console.log("asghaklsfj")
			// 	console.log($(this).children().first().text());
			// })

			// var acHtml = $(".primary-content > .activities-table");
			// var anHtml = $(".primary-content > .announcements-table");
		}
	})
}

search("", "dev");