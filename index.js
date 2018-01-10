'use strict';

/**
 * @author Larry Pavanery
 * Configure Webhook: https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup
 * Hello World from FB: https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start
 * Configure Messenger: https://developers.facebook.com/apps/1613109042076313/messenger/
 * Use NLP: https://developers.facebook.com/docs/messenger-platform/built-in-nlp
 * AI brain: https://wit.ai | https://wit.ai/larrypavanery/fb-bot-message/entities/math
 * Chat Bots Magazine: https://chatbotsmagazine.com
 */

// Imports dependencies and set up http server
const 
  express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  app = express().use(bodyParser.json()); // creates express http server

const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a FB chat bot. See: https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start')
})

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
    let body = req.body;
  
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
  
      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(function(entry) {
  
        // Gets the message. entry.messaging is an array, but 
        // will only ever contain one message, so we get index 0
        let webhookEvent = entry.messaging[0];
        console.log(webhookEvent);

        // Get the sender PSID
        let senderPsid = webhookEvent.sender.id;
        console.log('Sender PSID: ' + senderPsid);

         // Check if the event is a message or postback and
        // pass the event to the appropriate handler function
        if (webhookEvent.message) {
          handleMessage(senderPsid, webhookEvent);        
        } else if (webhookEvent.postback) {
          handlePostback(senderPsid, webhookEvent.postback);
        }
      });
  
      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  
  });

  // Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "VERIFY_TOKEN_LARRY_PAVANERY_XG_a"
      
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
      
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
    
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);      
      }
    }
  });


// Handles messages events
/**
 * - confidence é um valor entre 0 e 1 que indica a probabilidade do 
 * analisador achar que seu reconhecimento está correto.
 * - value é o resultado do analisador. Por exemplo, 2pm pode ser 
 * convertido em uma cadeia de caracteres ISO que pode ser usada no 
 * seu bot, como "2017-05-10T14:00:00.000-07:00".
 * See more: https://developers.facebook.com/docs/messenger-platform/built-in-nlp
 * @param {*} sender_psid 
 * @param {*} received_message 
 */
function handleMessage(sender_psid, webhookEvent) {
  console.log('[DEBUG][handleMessage]', sender_psid, webhookEvent);

  const received_message = webhookEvent.message;

  let response;
  // check greeting is here and is confident
  const greeting = firstEntity(received_message.nlp, 'greeting');
  const math = firstEntity(received_message.nlp, 'math');

  console.log('[DEBUG][handleMessage::firstEntity]', greeting, math);

  if (greeting && greeting.confidence > 0.8) {
    sendResponse('Hi there!');

  } else if (math && math.confidence > 0.8) {
    sendResponse(math.value);

  // Checks if the message contains text
  } else if (received_message.text) {    
    
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    response = {
      "text": `You sent the message: "${received_message.text}". Now send me an attachment!`
    }
  } else if (received_message.attachments) {
    // Get the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the right picture?",
            "subtitle": "Tap a button to answer.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Yes!",
                "payload": "yes",
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no",
              }
            ],
          }]
        }
      }
    }
  } 
  
  // Send the response message
  callSendAPI(sender_psid, response);    
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;
  // Get the payload for the postback
  let payload = received_postback.payload;
  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { "text": "Thanks!" }
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

function firstEntity(nlp, name) {
  return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}
