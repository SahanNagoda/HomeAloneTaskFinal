const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const firebase = require("firebase-admin");

const axios = require("axios");
var bcrypt = require("bcryptjs");
const saltRounds = 4;
// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
var serviceAccount = require("./homealonebackend-firebase-adminsdk-ttk4u-d7ff5ddaa3");
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://homealonebackend.firebaseio.com"
});
let db = firebase.firestore();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.get("/timestamp", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(`${Date.now()}`);
});
app.use(function(req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});
app.post("/getHash", (req, res) => {
  console.log(JSON.stringify(req.body));
  if (req.body.token == null) {
    res.sendStatus(404);
    return;
  }
  db.collection("users")
    .get()
    .then(snapshot => {
      var data;
      snapshot.forEach(doc => {
        // console.log(doc);
        if (doc.id == req.body.token) {
          data = doc.data();
        }
      });
      if (data == null) {
        bcrypt.genSalt(saltRounds, function(err, salt) {
          var str = Date.now().toString();
          var reslut = str.substring(str.length - 5, str.length);
          bcrypt.hash(reslut, salt, function(err, hash) {
            let docRef = db.collection("users").doc(req.body.token.toString());
            let setDdata = docRef
              .set({
                token: req.body.token,
                hash: hash,
                timestamp: str,
                count: 0
              })
              .then(data => {
                res.setHeader("Content-Type", "application/json");

                res.end(
                  JSON.stringify({
                    hash: hash,
                    token: req.body.token
                  })
                );
              });

            //console.log(newUser);
          });
        });
        return;
      } else if (data.count != null && data.count == 0) {
        res.setHeader("Content-Type", "application/json");

        res.end(
          JSON.stringify({
            hash: data.hash,
            token: req.body.token
          })
        );
      } else {
        res.sendStatus(403);
        return;
      }
    })
    .catch(err => {
      console.log("Error getting documents", err);
      res.sendStatus(500);
      return;
    });

  // res.send(`${Date.now()}`);
});
app.post("/checkHash", (req, res) => {
  //   console.log(JSON.stringify(req.body.token));
  if (req.body.token == null && req.body.password) {
    res.sendStatus(404);
    return;
  }
  db.collection("users")
    .get()
    .then(snapshot => {
      var data;
      snapshot.forEach(doc => {
        // console.log(doc);
        if (
          doc.id == req.body.token &&
          (doc.data().count == null || doc.data().count == 0)
        ) {
          data = doc.data();
          // db.collection("users")
          //   .doc(doc.id)
          //   .update({ count: doc.count == null ? 1 : doc.count + 1 });
        }
      });
      if (data == null) {
        res.sendStatus(403);
        return;
      }
      bcrypt.compare(req.body.password, data.hash, function(err, isMatch) {
        if (err) {
          res.sendStatus(404);
          return;
        }
        if (isMatch) {
          console.log(decodeURIComponent(req.body.token));

          axios
            .post("https://avarjana.live/task/done/thadiya", {
              teamCode: decodeURIComponent(req.body.token),
              taskId: "ThadiSahan",
              marks: 100
            })
            .then(function(response) {
              // console.log(response);
              if (response.status == 200) {
                db.collection("users")
                  .doc(req.body.token)
                  .update({
                    status: "Finish",
                    count: data.count == null ? 1 : data.count + 1
                  });
                res.setHeader("Content-Type", "application/json");
                //   res.status(200);
                res.end(
                  JSON.stringify({
                    hash: data.hash,
                    password: req.body.password,
                    msg: "Task successfully completed !"
                  })
                );

                return;
              } else {
                res.sendStatus(500);
              }
            })
            .catch(function(error) {
              res.sendStatus(500);
              console.log(error);
            });
        } else {
          axios
            .post("https://avarjana.live/task/done/thadiya", {
              teamCode: decodeURIComponent(req.body.token),
              taskId: "ThadiSahan",
              marks: 0
            })
            .then(function(response) {
              // console.log(response);
              if (response.status == 200) {
                res.setHeader("Content-Type", "application/json");
                //   res.status(200);
                res.end(
                  JSON.stringify({
                    msg: "Sorry Password Not match"
                  })
                );
                db.collection("users")
                  .doc(req.body.token)
                  .update({
                    status: "Faild",
                    count: data.count == null ? 1 : data.count + 1
                  })
                  .catch(function(error) {
                    res.sendStatus(500);
                    console.log(error);
                  });
              } else {
                res.sendStatus(500);
                console.log(error);
              }
            })
            .catch(function(error) {
              res.sendStatus(500);
              console.log(error);
            });

          return;
        }
      });
    })
    .catch(err => {
      console.log("Error getting documents", err);
      res.sendStatus(500);
    });

  // res.send(`${Date.now()}`);
});
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
