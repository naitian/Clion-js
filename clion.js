#!/usr/bin/env node
var VERSION = "0.1.0";
var DESCRIPTION = "A command line interface for ion.tjhsst.edu";
var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	
var fs = require('fs');
var program = require('gitlike-cli');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var prompt = require('prompt');

prompt.message = "";
prompt.delimiter = "";


program
	.version(VERSION)
	.description(DESCRIPTION)
	.usage("clion")
	.command("login")
		.description("Login to Ion account")
		.action(login)
		.on('help', function(cmd){
			cmd.outputIndented('Examples', [
				'$ clion login'
			]);
		}).parent
	.command("profile [uname]")
		.description("View the profile of an Ion user. (Defaults to logged in user)")
		.action(profile)
		.on('help', function(cmd){
			cmd.outputIndented('Examples', [
				'$ clion profile 2018nzhou',
				'$ clion profile "Naitian Zhou',
				'$ clion profile'
			]);
		}).parent
	.command("bell [date]")
		.description("View bell schedule. (Defaults to current day)")
		.action(bell)
		.on('help', function(cmd){
			cmd.outputIndented('Examples', [
				'$ clion bell',
				'$ clion bell 2015-11-19'
			]);
		}).parent
	.command("list-blocks [max]")
                .description("List eighth period blocks. (Defaults to 5 blocks)")
                .action(listBlocks)
                .on('help', function(cmd){
                        cmd.outputIndented('Examples', [
                                '$ clion list-blocks',
                                '$ clion list-blocks 10'
                        ]);
                }).parent
	.command("list-activities [bid]")
                .description("List activities for a given block. (Defaults to nearest block)")
                .action(listActivities)
                .on('help', function(cmd){
                        cmd.outputIndented('Examples', [
                                '$ clion list-activities',
                                '$ clion list-activities 3065'
                        ]);
                }).parent
	.command("view-activity <aid>")
                .description("View an activity listing.")
                .action(viewActivity)
		.option('-r, --roster', 'Include roster for nearest block')
                .on('help', function(cmd){
                        cmd.outputIndented('Examples', [
                                '$ clion view-activity 115',
                                '$ clion view-activity -r 115',
                        ]);
                }).parent
	.command("list-eighth [max]")
                .description("List your eighth period signups")
                .action(listEighth)
                .on('help', function(cmd){
                        cmd.outputIndented('Examples', [
                                '$ clion list-eighth',
                                '$ clion view-activity 8',
                        ]);
                }).parent
	.command("sign-eighth <aid> [bid]")
		.description("Sign up for an eighth period activity")
		.action(signEighth)
		.on('help', function(){
			cmd.outputIndented('Examples', [
				'$ clion sign-eighth 115',
				'$ clion sign-eighth 115 3030'
			]);
		}).parent
	.parse(process.argv);

function ionCall(endpoint, success, fail) {
	fs.readFile('/var/tmp/clion-auth.json', 'utf8', function(err, data){
		if(err){        
			console.log("Please login first");
		//	login();
			return;
		}
		eval("var credentials = " + data);
		
		var url = `https://crossorigin.me/https://${credentials.uname}:${credentials.pword}@ion.tjhsst.edu/api${endpoint}`;
		if(url.slice(-1) == "/")
			url += "?format=json";
		else
			url += "&format=json";
		console.log(url);
		xmlhttp = new XMLHttpRequest();
		xmlhttp.open('GET', url);
		xmlhttp.send(null);
		xmlhttp.onload = function(e){
			if(xmlhttp.readyState === 4){
				if(xmlhttp.status === 200){
					var object = JSON.parse(xmlhttp.responseText);
//					console.log(object);
					success(object);
				}
				else if(xmlhttp.status == 401){
					fail("Authentication Failure (Try logging in again)");
					login();
				}
				else{
					fail(xmlhttp.status);
				}
			}
		}
	});  
}

function profile(args, options) {
	var name = args.uname || "0000";
	getId(name, function(data){
		var id = data || "";
	
		ionCall("/profile/" + id + "/", function(data){
			console.log(data.full_name);
			console.log(`${data.ion_username} (${data.id})`);
			var bday = data.birthday || "B-Day not public";
			var emails = data.emails || ["E-mails not public"];
			
			console.log("Birthday: " + bday.split("T")[0]);

			console.log("Emails:");
			emails.forEach(function(email){
				console.log("\t" + email)
			})
		}, function(e){
			console.log(e);
		});	
	});
}

function bell(args, options) {
	var date = args.date || "";
	ionCall("/schedule/" + date, function(data){
		if(date !== "")
			day = data;
		else
			day = data.results[0]	
		console.log(day.date + " (" + day.day_type.name + ")");
		day.day_type.blocks.forEach(function(block){
			console.log(block.name + " (" + block.start + " - " + block.end + ")");
		})
	}, function(e){
		console.log(e);
	});
}

function getId(searchTerm, success) {
	if(searchTerm == "0000"){
		success("");
		return;
	}

	ionCall("/search/" + searchTerm + "/", function(data){
		if(data.count > 0){
			var id = data.results[0].id;
			success(id);
		}
		else{
			console.log("No Such Profile");
			process.exit();
		}
	}, function(e){
		console.log(e);
	});
}

function login() {
	var schema = {
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
	}
	prompt.get(schema, function(err, result) {
		uname = result.username;
		pword = result.password;
		fs.writeFile("/var/tmp/clion-auth.json", "{uname: \"" + uname + "\", pword: \"" + pword + "\"}", function(err){if(err){console.log("Could not write credentials to drive.")}});
		ionCall("/profile/", function(data){
			console.log("Successful Login");
			profile({username:""});
		}, function(error){
			console.log("Login Failed");
		});
	});
}

function listBlocks(args, options){
	var today = new Date();
	var blocks = args.max || 5;
	ionCall("/blocks/?start_date=" + today.getFullYear() + "-"  + (today.getMonth() + 1) + "-"  + today.getDate(), 
	function(data){
		for(var i = 0; i < blocks; i++){
			var dateAr = data.results[i].date.split("-");
			today.setFullYear(dateAr[0]);
			today.setDate(dateAr[2]);
			today.setMonth(dateAr[1] - 1);
			console.log(WEEKDAYS[today.getDay()] + "(" + data.results[i].date + ")");
			console.log(data.results[i].block_letter + " Block");
			console.log("ID: " + data.results[i].id);
			console.log("Locked: " + data.results[i].locked);
			console.log();		
		}
	}, function(e){
		console.log(e)
	});
}

function listBlocks(args, options){
        var today = new Date();
        var blocks = args.max || 5;
        ionCall("/blocks/?start_date=" + today.getFullYear() + "-"  + (today.getMonth() + 1) + "-"  + today.getDate(),
                function(data){
                        for(var i = 0; i < blocks; i++){
                                var dateAr = data.results[i].date.split("-");
                                today.setFullYear(dateAr[0]);
                                today.setDate(dateAr[2]);
                                today.setMonth(dateAr[1] - 1);
                                console.log(WEEKDAYS[today.getDay()] + "(" + data.results[i].date + ")");
                                console.log(data.results[i].block_letter + " Block");
                                console.log("ID: " + data.results[i].id);
                                console.log("Locked: " + data.results[i].locked);
                                console.log();
                        }
                }, function(e){
                        console.log(e)
                });
}

function viewActivity(args, options){
	var bid = args.bid || "0";
	ionCall("/activities/" + args.aid + "/", function(data){
		console.log(`${data.name}(${data.id})`);
		console.log(`${data.description}`);
		console.log();
		if(data.administrative){
			console.log(`\tAdministrative`);
		}
		if(data.restricted){
                        console.log(`\tRestricted`);
                }
		if(data.presign){
                        console.log(`\tPresign`);
                }
		if(data.sticky){
                        console.log(`\tSticky`);
                }
		if(data.special){
                        console.log(`\tSpecial`);
                }
		console.log();
	
		console.log("Scheduled on: ");
		first = true;
		for(var blockKey in data.scheduled_on){
			if(first){
				var said = data.scheduled_on[blockKey].roster.id;
				first = false;
			}
			block = data.scheduled_on[blockKey];	
			console.log(`${block.date} ${block.block_letter} Block (${block.id})`);
		}
		if(options.roster){
			ionCall("/signups/scheduled_activity/" + said + "/",
			function(data){
				console.log(`Signed Up (${data.signups.count}/${data.capacity}): `);
				data.signups.members.forEach(function(student){
					console.log(`${student.full_name} (${student.username})`);
				})
			}, function(e){
				console.log(e);
			});	
		}
	
	}, function(e){
		if(e == "404"){
			console.log("Activity does not exist.");
		}
	})
	
}

function listActivities(args, options){
        var block = args.bid || -1;
        
	if(block > -1)
		printActivities(block);
	else {
		var today = new Date();
		ionCall("/blocks/?start_date=" + today.getFullYear() + "-"  + (today.getMonth() + 1) + "-"  + today.getDate(), 
		function(data){
			printActivities(data.results[0].id);	
		}, function(e){
			console.log(e);
		});
	}
}

function printActivities(bid){
	ionCall("/blocks/" + bid + "/", 
	function(data){
		var dateAr = data.date.split("-");
		var date = new Date(dateAr[0], dateAr[1] - 1, dateAr[2]);
		console.log(`${WEEKDAYS[date.getDay()]} ${data.block_letter} Block  (${data.id})`);
		console.log(data.date);
		for(var akey in data.activities){
			var act = data.activities[akey];
			console.log(`${act.name_with_flags_for_user} (${akey})`);
			console.log(`\tSponsors:${act.sponsors}\n\t${act.rooms}`)
		}
	}, function(e){
		console.log(e);
	});
}

function listEighth(args, options){
	console.log("Still have to figure this out");
	process.exit();
	var max = args.max || 5;
	var date = new Date();
	var today = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate();
	console.log(today);
	ionCall("/signups/user/", function(data){
		
		data.forEach(function(block){
			if(cpgDates(today, block.block.date)){
				var dateAr = block.block.date.split("-");
				var date = new Date(dateAr[0], dateAr[1] - 1, dateAr[2]);
				console.log(`${WEEKDAYS[date.getDay()]} ${data.block_letter} Block  (${data.id})`);
			}
		})
	}, function(e){


	});
}

function cpgDates(d1, d2){
	d1Ar = d1.split("-");
	d2Ar = d2.split("-");

	if(parseInt(d1Ar[0]) >= parseInt(d2.Ar[0]))
		return true;
	if(parseInt{d1Ar[1]) >= parseInt(d2.Ar[1[))
		return true;
	if(parseInt(d1Ar[2]) >= parseInt(d2.Ar[2]))
		return true;
	return false;
}

function signEighth(args, options){
	
}
