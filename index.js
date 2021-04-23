const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const open = require('open');
const fetch = require('node-fetch');

const SCOPES = [ 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events' ];

const TOKEN_PATH = 'token.json';

fs.readFile('credentials.json', (err, content) => {
	if (err) return console.log('Error loading client secret file:', err);
	authorize(JSON.parse(content), createEvent);
});

function authorize(credentials, callback) {
	const { client_secret, client_id, redirect_uris, response_type } = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0], response_type);
	//look for email in firestore tokens collection
	//if email is there get the token, set the token, callback
	
	fs.readFile(TOKEN_PATH, (err, token) => {
		if (err) return getAccessToken(oAuth2Client, callback);
		oAuth2Client.setCredentials(JSON.parse(token));
		callback(oAuth2Client);
	});
}

function getAccessToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'online',
		scope: SCOPES,
		response_type: 'code'
	});
	open(authUrl)
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question('Enter the code from that page here: ', (code) => {
		rl.close();
		oAuth2Client.getToken(code, (err, token) => {
			if (err) return console.error('Error retrieving access token', err);
			oAuth2Client.setCredentials(token);
			// Store the token to disk for later program executions
			fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
				if (err) return console.error(err);
				console.log('Token stored to', TOKEN_PATH);
			});
			callback(oAuth2Client);
		});
	});
}

async function createEvent(auth) {
	var event = {
		end: {
			dateTime: '2021-04-19T15:00:00+05:30'
		},
		start: {
			dateTime: '2021-04-19T14:00:00+05:30'
		},

		conferenceData: {
			createRequest: {
				conferenceSolutionKey: {
					type: 'hangoutsMeet'
				},
				requestId: 'anything'
			}
		},
		summary: 'title',
		description: 'mnot a doctor'
	};
	const calendar = google.calendar({ version: 'v3', auth });
	await calendar.events.insert(
		{
			calendarId: 'primary',
			conferenceDataVersion: '1',
			resource: event
		},
		function(err, event) {
			if (err) {
				console.log('There was an error contacting the Calendar service: ' + err);
				return;
			}
			console.log('Event created: %s', event.data.hangoutLink);
		}
	);
}

function listEvents(auth) {
	const calendar = google.calendar({ version: 'v3', auth });
	calendar.events.list(
		{
			calendarId: 'primary',
			timeMin: new Date().toISOString(),
			maxResults: 16,
			singleEvents: true,
			orderBy: 'startTime'
		},
		(err, res) => {
			if (err) return console.log('The API returned an error: ' + err);
			const events = res.data.items;
			if (events.length) {
				console.log('Upcoming 10 events:');
				events.map((event, i) => {
					const start = event.start.dateTime || event.start.date;
					console.log(`${start} - ${event.summary}`);
				});
			} else {
				console.log('No upcoming events found.');
			}
		}
	);
}

module.exports = {
	SCOPES,
	listEvents
};
