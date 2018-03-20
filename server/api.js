// server/api.js
/*
 |--------------------------------------
 | Dependencies
 |--------------------------------------
 */

 const jwt = require('express-jwt');
 const jwks = require('jwks-rsa');


 const Event = require('./models/Event');
 const Rsvp = require('./models/Rsvp');

 /*
  |--------------------------------------
  | Authentication Middleware
  |--------------------------------------

  */

  module.exports = function(app,config){
      // Authentication middleware
      const jwtCheck = jwt({
          secret: jwks.expressJwtSecret({
              cache:true,
              rateLimit:true,
              jwksRequestsPerMinute:5,
              jwksUri:`https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`
          }),
          audience:config.AUTH0_API_AUDIENCE,
          issuer:`https://${config.AUTH0_DOMAIN}/`,
          algorithm:'RS256'
      });


      
  /*
  |-------------------------------
  | API Routes
  |-------------------------------
  */

  //Get api root
  app.get('/api/',(req,res)=>{
    res.send('API works');
    });


  // Check for an authenticatec admin user
  const adminCheck = (req, res, next) => {
      const roles = req.user[config.NAMESPACE] || [];
      if (roles.indexOf('admin') > -1) {
          next();
      } else {
          res.status(401).send({message:'Not authorized for admin acess'})
      }    
  }

  const _eventListProjection = 'title startDatetime endDatetime viewPublic';

  // Get list of public events starting in the future
  app.get('/api/events', (req, res) => {
      Event.find({viewPublic: true, startDatetime: { $gte: new Date() }}, _eventListProjection, (err, events) => {
          let eventsArr = [];
          if (err) {
              return res.status(500).send({message: err.message});
          }
          if (events) {
              events.forEach(event => {
                  eventsArr.pust(event);
              });
          }
          res.send(eventsArr);
      });
  });


  // Get list of all events, public and private (admin only)
  app.get('/api/events/admin', jwtCheck, adminCheck, (req, res) => {
      Event.find({}, _eventListProjection, (err, events) => {
          let eventsArr = [];
          if (err) {
              return res.status(500).send({message: err.message});
          }
          if (events) {
              events.forEach( event => {
                  eventsArr.pust(event);
              });
          }
          res.send(eventsArr);
      });
  });

  // Get event by event ID
  app.get('/api/event/:id', jwtCheck, (req, res) => {
      Event.findById(req.params.id, (err, event) => {
          if (err) {
          return res.status(500).send({message: err.message});
      }
      if (!event) {
          return res.status(400).send({message: 'Event not found.'});
      }
      res.send(event);
      });
  });


  // Get rsvps by event ID
  app.get('/api/event/:eventId/rsvps', jwtCheck, (req, res) => {
      Rsvp.find({eventId: req.params.eventId}, (err, rsvps) => {
          let rsvpsArr = [];
          if (err) {
              return res.status(500).send({message: err.message});
          }
          if (rsvps) {
              rsvps.forEach(rsvp => {
                  rsvpsArr.push(rsvp);
              });
          }
          res.send(rsvpsArr);
      });
  });

   
  }