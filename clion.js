#!/usr/bin/env node
const VERSION = "0.1.0",
	DESCRIPTION = "A command line interface for TJHSST Ion",
	WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	AUTHFILE = require('path').join(__dirname, 'clion-auth');

const fs = require('fs'),
	program = require('gitlike-cli'),
	request = require('request'),
	query = require('querystring'),
	prompt = require('prompt'),
	colors = require('colors');

prompt.message = prompt.delimiter = "";

program
	.version(VERSION)
	.description(DESCRIPTION)
	.usage("clion")
	.command("login")
		.description("Login to Ion Account")
		.action(login)
		.on('help', cmd => {
			cmd.outputIndented('Examples', [
				'$ clion login'
			]);
		}).parent
	.command("logout")
		.description("Remove Login Credentials")
		.action(logout)
		.on('help', cmd => {
			cmd.outputIndented('Examples', [
				'$ clion logout'
			]);
		}).parent
	.command("profile [uname]")
		.description("View the profile of an Ion user. (Defaults to logged in user)")
		.action(profile)
		.on('help', cmd => {
			cmd.outputIndented('Examples', [
				'$ clion profile',
				'$ clion profile 2018nzhou',
				'$ clion profile "Naitian Zhou"',
			]);
		}).parent
	.command("bell [date]")
		.description("View bell schedule. (Defaults to current day)")
		.action(bell)
		.on('help', cmd => {
			cmd.outputIndented('Examples', [
				'$ clion bell',
				'$ clion bell 2015-11-19'
			]);
		}).parent
	.command("list-blocks [max]")
		.description("List eighth period blocks. (Defaults to 5 blocks)")
		.action(listBlocks)
		.on('help', cmd => {
			cmd.outputIndented('Examples', [
				'$ clion list-blocks',
				'$ clion list-blocks 10'
			]);
		}).parent
	.command("list-activities [bid]")
		.description("List activities for a given block. (Defaults to nearest block)")
		.action(listActivities)
		.on('help', cmd => {
			cmd.outputIndented('Examples', [
				'$ clion list-activities',
				'$ clion list-activities 3065'
			]);
		}).parent
	.command("view-activity <aid>")
		.description("View an activity listing.")
		.action(viewActivity)
		.option('-r, --roster', 'Include roster for nearest block')
		.on('help', cmd => {
			cmd.outputIndented('Examples', [
				'$ clion view-activity 115',
				'$ clion view-activity -r 115',
			]);
		}).parent
	.command("list-eighth [max]")
		.description("List your eighth period signups")
		.action(listEighth)
		.on('help', cmd => {
			cmd.outputIndented('Examples', [
				'$ clion list-eighth',
				'$ clion view-activity 8',
			]);
		}).parent
	.command("sign-eighth <aid> [bid]")
		.description("Sign up for an eighth period activity")
		.action(signEighth)
		.on('help', () => {
			cmd.outputIndented('Examples', [
				'$ clion sign-eighth 115',
				'$ clion sign-eighth 115 3030'
			]);
		}).parent
	.parse(process.argv);

function ionCall(endpoint, success, fail, authRequired, params) {

	if(typeof authRequired === "object") params = authRequired;
	else authRequired = (typeof authRequired === 'undefined') ? true : authRequired;

	var method = (typeof params === "undefined") ? 'GET' : 'POST';

	if(endpoint.lastIndexOf("/") == endpoint.length - 1){
		endpoint = endpoint.substring(0, endpoint.length - 1);
	}

	var options = {
		url: 'https://ion.tjhsst.edu/api' + endpoint,
		method: method,
		json: true,
		headers: {format: "json"}
	};

	if (authRequired) {
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
	}

	if(method == 'POST') {
		options.form = params;
	}

	request(options, (err, res, body) => {
		success(body);
	}).on('error', fail);
	
}

function profile(args, options) {
	var name = args.uname || "0000";
	getId(name, data => {
		var id = data || "";

		ionCall(`/profile/${id}/`, data => {
			console.log(data.full_name.bold);
			console.log(`${data.ion_username} (${data.id})`);
			var bday = data.birthday || "B-Day not public";
			var emails = data.emails || ["E-mails not public"];

			console.log("Birthday:", bday.split("T")[0]);

			console.log("Emails:");
			emails.forEach(email => console.log("\t" + email));
		}, console.error);
	});
}

function bell(args, options) {
	var date = args.date || "";

	ionCall(`/schedule/${date}`, data => {
		if (date !== "") day = data;
		else day = data.results[0];
		if(day.day_type.name.toLowerCase().indexOf("blue") != -1)
			console.log(day.date.blue.bold, `(${day.day_type.name})`.blue.bold);
		else if(day.day_type.name.toLowerCase().indexOf("red") != -1)
			console.log(day.date.red.bold, `(${day.day_type.name})`.red.bold);
		else
			console.log(day.date.bold, `(${day.day_type.name})`.bold);
		day.day_type.blocks.forEach(block => {
				if(checkTime(block.start, block.end, day.date)){
					console.log(block.name.bold, `(${block.start} - ${block.end})`.bold);
				}
				else
					console.log(block.name, `(${block.start} - ${block.end})`);
			}
		);
	}, console.error, false);
}

function checkTime(start, end, day) {
	var time = new Date();
	var startTime = new Date(day + " " + start);
	var endTime = new Date(day + " " + end);
	if(time.getTime() < endTime.getTime() && time.getTime() > startTime.getTime() && cpDates(`${time.getFullYear()}-${time.getMonth()+1}-${time.getDate()}`, day) === 0)
		return true;
	return false;
}

function getId(searchTerm, success) {
	if (searchTerm == "0000") {
		success("");
		return;
	}
	ionCall(`/search/${query.escape(searchTerm)}/`, data => {
		if (data.count > 0) {
			var id = data.results[0].id;
			// console.log(id);
			success(id);
		} else {
			console.error("No Such Profile");
			process.exit();
		}
	}, console.error);
}

function login() {
	const schema = {
		properties: {
			username: {
				description: "Username:",
				required: true
			},
			password: {
				description: "Password:",
				hidden: true
			}
		}
	};

	prompt.get(schema, (err, result) => {
		fs.writeFile(AUTHFILE, new Buffer(`${result.username}:${result.password}`).toString("base64"), err => {
			if (err) console.error("Could not write credentials to drive.");
		});

		ionCall("/profile/", data => {
			console.log("Successful Login");
			profile({username: ""});
		}, e => console.error("Login Failed"));
	});
}

function logout() {
	fs.unlink(AUTHFILE, () => console.log("Successful Logout"));
}

function listBlocks(args, options) {
	var today = new Date(),
		blocks = args.max || 5;
	ionCall(`/blocks/?start_date=${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`, data => {
		for (var i = 0; i < blocks; i++) {
			var dateAr = data.results[i].date.split("-");
			today.setFullYear(dateAr[0]);
			today.setDate(dateAr[2]);
			today.setMonth(dateAr[1] - 1);
			console.log(WEEKDAYS[today.getDay()].bold, `(${data.results[i].date})`.bold);
			console.log(data.results[i].block_letter, "Block");
			console.log("ID:", data.results[i].id);
			if(data.results[i].locked)
				console.log(("Locked:", data.results[i].locked).red.bold);
			console.log();
		}
	}, console.error);
}


function viewActivity(args, options) {
	ionCall(`/activities/${args.aid}/`, data => {
		console.log(`${data.name}(${data.id})`.bold + "\n");
		if(data.description.length > 0)
			console.log(data.description + "\n");
		if (data.administrative) console.log("\tAdministrative".bold);
		if (data.restricted) console.log("\tRestricted".blue.bold);
		if (data.presign) console.log("\tPresign".yellow.bold);
		if (data.sticky) console.log("\tSticky".green.bold);
		if (data.special) console.log("\tSpecial".bold);
		console.log();

		// console.log("Scheduled on (displaying nearest 5): ");
		var first = true;
		var ct = 0;
		for (var blockKey in data.scheduled_on) {
			if (first) {
				var said = data.scheduled_on[blockKey].roster.id;
				first = false;
			}
			if(ct >= 5)
				break;
			block = data.scheduled_on[blockKey];
			console.log(`\t${block.date} ${block.block_letter} Block (${block.id})`);
			ct++;
		}
		if (options.roster) {
			ionCall(`/signups/scheduled_activity/${said}/`, data => {
				console.log(`Signed Up (${data.signups.count}/${data.capacity}): `);
				data.signups.members.forEach(student => {
					console.log(`${student.full_name} (${student.username})`);
				});
			}, console.error);
		}
	}, e => console.error("Activity does not exist."));
}

function listActivities(args, options) {
	(typeof args.bid === "undefined") ? getNextBlock(printActivities) : printActivities(bid);
}

function printActivities(bid){
	ionCall("/blocks/" + bid + "/", data => {
		var dateAr = data.date.split("-"),
			date = new Date(dateAr[0], dateAr[1] - 1, dateAr[2]);
		console.log(`${WEEKDAYS[date.getDay()]} ${data.block_letter} Block  (${data.id})`.bold);
		console.log(data.date.bold + "\n\n");
		for (var akey in data.activities) {
			var act = data.activities[akey];
			console.log(`${act.name_with_flags_for_user} (${akey})`.bold);
			console.log(`\tSponsors:${act.sponsors}\n\t${act.rooms}`);
		}
	}, console.error);
}

function listEighth(args, options) {
	// process.exit();
	var max = args.max || 5,
		date = new Date(),
		today = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
	// console.log(today);

	ionCall("/signups/user/", data => {
		// console.log(data);
		data.forEach(block => {
			if (cpDates(block.block.date, today) <= 0 && max > 0) {
				max--;
				var dateAr = block.block.date.split("-"),
					date = new Date(dateAr[0], dateAr[1]-1, dateAr[2]);
				console.log(`${WEEKDAYS[date.getDay()]} ${block.block.block_letter} Block (${block.block.date})`.bold);
				console.log(`\tBlock ID: ${block.block.id}\n\t${block.activity.title}(${block.activity.id})`);
			}
		});
	}, console.error);
}

function cpDates(d1, d2) {
	var d1Ar = d1.split("-"), d2Ar = d2.split("-");
	if(parseInt(d1Ar[0]) < parseInt(d2Ar[0])) 
		return 1;
	else if(parseInt(d1Ar[1]) < parseInt(d2Ar[1]))
		return 1;
	else if(parseInt(d1Ar[2]) < parseInt(d2Ar[2]))
		return 1;
	else if(parseInt(d1Ar[2]) == parseInt(d2Ar[2]))
		return 0;
	else return -1;
}

function getNextBlock(callback, aid) {
	var today = new Date();
	var startDate = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate();
	if(typeof aid === "undefined"){
		ionCall(`/blocks/?start_date=${startDate}`, data => {
			callback(data.results[0].id);
		}, console.error);
	}
	else {
		ionCall(`/activities/${aid}`, data => {
			for (var bid in data.scheduled_on) {
				if (cpDates(data.scheduled_on[bid].date, startDate) <= 0) {
					callback(aid, bid);
				}
			}		
		}, console.error);
	}

}

function signEighth(args, options) {
	var aid = args.aid;
	(typeof bid === "undefined") ? getNextBlock(eighthSignCall, aid) : eighthSignCall(aid, bid);
}

function eighthSignCall(aid, bid) {
	ionCall('/signups/user', data => {
		console.log(`Signed up for ${data.name}`);
	}, err => {
		console.error;
	}, {"block": bid, "activity": aid, "use_scheduled_activity": false});
}
