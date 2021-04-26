const fs = require('fs');
const { google } = require('googleapis');
const open = require('open');
const express = require('express');

var cors = require('cors');
const app = express();

app.use(cors());

// middleware
app.use(express.json());
app.use(express.urlencoded());

const SCOPES = [ 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events' ];

var admin = require('firebase-admin');

var serviceAccount = require('./firebasecreds.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

app.post('/create-event', (req, res) => {
	fs.readFile('credentials.json', (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
		authorize(JSON.parse(content), createEvent, req.body.email);
		res.end('hmmmm');
	});
});

app.post('/create-user', (req, res) => {
	fs.readFile('credentials.json', (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
		let result = createUser(JSON.parse(content));
		res.send({url : result});
	});
});

app.post('/set-token', (req, res) => {
	fs.readFile('credentials.json', (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
		setToken(JSON.parse(content), req.body.authcode, req.body.email);
		res.end('hmmmm');
	});
});

function authorize(credentials, call, email) {
	const { client_secret, client_id, redirect_uris, response_type } = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0], response_type);

	const usersRef = db.collection('tokens').doc(email);

	usersRef.get().then((docSnapshot) => {
		if (docSnapshot.exists) {
			usersRef.onSnapshot((doc) => {
				oAuth2Client.setCredentials(doc.data());
				call(oAuth2Client);
			});
		} else {
			res.send('doesnt exist');
		}
	});
}

function createUser(credentials, call, email) {
	const { client_secret, client_id, redirect_uris, response_type } = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0], response_type);
	return getAccessToken(oAuth2Client).toString();
}

function getAccessToken(oAuth2Client) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'online',
		scope: SCOPES,
		response_type: 'code'
	});
	return authUrl.toString();
}

function setToken(credentials, code, email) {
	const { client_secret, client_id, redirect_uris, response_type } = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0], response_type);
	oAuth2Client.getToken(code, (err, token) => {
		if (err) return console.error('Error retrieving access token', err);
		oAuth2Client.setCredentials(token);
		docRef = db.collection('tokens').doc(email);

		docRef.set(token);
	});
}

async function createEvent(auth) {
	var event = {
		end: {
			dateTime: '2021-05-27T15:00:00+05:30'
		},
		start: {
			dateTime: '2021-05-27T14:00:00+05:30'
		},

		conferenceData: {
			createRequest: {
				conferenceSolutionKey: {
					type: 'hangoutsMeet'
				},
				requestId: 'anything'
			}
		},
		summary: 'React native se aaye h',
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

const port = process.env.PORT || 8000;
app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});
module.exports = app;

// function listEvents(auth) {
// 	const calendar = google.calendar({ version: 'v3', auth });
// 	calendar.events.list(
// 		{
// 			calendarId: 'primary',
// 			timeMin: new Date().toISOString(),
// 			maxResults: 16,
// 			singleEvents: true,
// 			orderBy: 'startTime'
// 		},
// 		(err, res) => {
// 			if (err) return console.log('The API returned an error: ' + err);
// 			const events = res.data.items;
// 			if (events.length) {
// 				console.log('Upcoming 10 events:');
// 				events.map((event, i) => {
// 					const start = event.start.dateTime || event.start.date;
// 					console.log(`${start} - ${event.summary}`);
// 				});
// 			} else {
// 				console.log('No upcoming events found.');
// 			}
// 		}
// 	);
// }
