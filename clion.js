#!/usr/bin/env node
const VERSION = "0.1.0",
	DESCRIPTION = "A command line interface for TJHSST Ion",
	WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	AUTHFILE = "/var/tmp/clion-auth";

const fs = require('fs'),
	program = require('gitlike-cli'),
	https = require('https'),
	prompt = require('prompt');

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

function ionCall(endpoint, success, fail, authRequired) {
	authRequired = (typeof authRequired === 'undefined') ? true : authRequired;

	var options = {
		hostname: 'ion.tjhsst.edu',
		path: `/api${endpoint}`,
		headers: {format: "json"}
	};

	if (authRequired) {
		if (fs.statSync(AUTHFILE).isFile()) {
			var data = fs.readFileSync(AUTHFILE, 'utf8');
			options.headers.Authorization = `Basic ${data}`;
		} else {
			console.log("Please login first");
			//login();
			return;
		}
	}

	https.get(options, res => {
		var body = '';
		res.on('data', chunk => {body += chunk;});
		res.on('end', () => {
			var object = JSON.parse(body);
			//console.log(object);
			success(object);
		});
	}).on('error', fail);
}

function profile(args, options) {
	var name = args.uname || "0000";
	getId(name, data => {
		var id = data || "";

		ionCall(`/profile/${id}/`, data => {
			console.log(data.full_name);
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
		console.log(day.date, `(${day.day_type.name})`);
		day.day_type.blocks.forEach(block =>
			console.log(block.name, `(${block.start} - ${block.end})`)
		);
	}, console.error, false);
}

function getId(searchTerm, success) {
	if (searchTerm == "0000") {
		success("");
		return;
	}

	ionCall(`/search/${searchTerm}/`, data => {
		if (data.count > 0) {
			var id = data.results[0].id;
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
			console.log(WEEKDAYS[today.getDay()], `(${data.results[i].date})`);
			console.log(data.results[i].block_letter, "Block");
			console.log("ID:", data.results[i].id);
			console.log("Locked:", data.results[i].locked);
			console.log();
		}
	}, console.error);
}

function viewActivity(args, options) {
	var bid = args.bid || "0";
	ionCall(`/activities/${args.aid}/`, data => {
		console.log(`${data.name}(${data.id})`);
		console.log(data.description);
		console.log();
		if (data.administrative) console.log("\tAdministrative");
		if (data.restricted) console.log("\tRestricted");
		if (data.presign) console.log("\tPresign");
		if (data.sticky) console.log("\tSticky");
		if (data.special) console.log("\tSpecial");
		console.log();

		console.log("Scheduled on: ");
		var first = true;
		for (var blockKey in data.scheduled_on) {
			if (first) {
				var said = data.scheduled_on[blockKey].roster.id;
				first = false;
			}
			block = data.scheduled_on[blockKey];
			console.log(`${block.date} ${block.block_letter} Block (${block.id})`);
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
	var block = args.bid || -1;

	if (block > -1) printActivities(block);
	else {
		var today = new Date();
		ionCall(`/blocks/?start_date=${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`, data => {
			printActivities(data.results[0].id);
		}, console.error);
	}
}

function printActivities(bid){
	ionCall("/blocks/" + bid + "/", data => {
		var dateAr = data.date.split("-"),
			date = new Date(dateAr[0], dateAr[1] - 1, dateAr[2]);
		console.log(`${WEEKDAYS[date.getDay()]} ${data.block_letter} Block  (${data.id})`);
		console.log(data.date);
		for (var akey in data.activities) {
			var act = data.activities[akey];
			console.log(`${act.name_with_flags_for_user} (${akey})`);
			console.log(`\tSponsors:${act.sponsors}\n\t${act.rooms}`)
		}
	}, console.error);
}

function listEighth(args, options) {
	console.log("Still have to figure this out");
	process.exit();
	var max = args.max || 5,
		date = new Date(),
		today = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
	console.log(today);

	ionCall("/signups/user/", data => {
		data.forEach(block => {
			if (cpgDates(today, block.block.date)) {
				var dateAr = block.block.date.split("-"),
					date = new Date(dateAr[0], dateAr[1]-1, dateAr[2]);
				console.log(`${WEEKDAYS[date.getDay()]} ${data.block_letter} Block  (${data.id})`);
			}
		});
	}, console.error);
}

function cpgDates(d1, d2) {
	var d1Ar = d1.split("-"), d2Ar = d2.split("-");
	return (parseInt(d1Ar[0]) >= parseInt(d2Ar[0])) || (parseInt(d1Ar[1]) >= parseInt(d2Ar[1])) || (parseInt(d1Ar[2]) >= parseInt(d2Ar[2]));
}

function signEighth(args, options) {
	
}
