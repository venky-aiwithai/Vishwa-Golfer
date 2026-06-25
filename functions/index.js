/**
 * Firebase Cloud Function entry point.
 *
 * Wraps the existing Express app (server/index.js, copied here by the
 * "predeploy" step in firebase.json) so Firebase Hosting can route
 * /api/** requests to it.
 */
const functions = require('firebase-functions');
const app = require('./server/index.js');

exports.api = functions.https.onRequest(app);
