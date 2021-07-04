require("dotenv").config();
var db = require("./db.config");
const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuid } = require("uuid");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const { exec } = require("child_process");

var get_ip = require("ipware")().get_ip;
var requestCountry = require("request-country");

const port = process.env.PORT || 5001;
const UBUNTU_PASS = "marzie78";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.session());

var JWTstrategy = require("passport-jwt").Strategy,
  ExtractJWT = require("passport-jwt").ExtractJwt;
passport.use(
  new JWTstrategy(
    {
      secretOrKey: "TOP_SECRET",
      jwtFromRequest: ExtractJWT.fromUrlQueryParameter("secret_token"),
    },
    async (token, done) => {
      try {
        return done(null, token.user);
      } catch (error) {
        done(error);
      }
    }
  )
);

passport.use(
  new LocalStrategy(
    { usernameField: "username", passReqToCallback: true },
    (req, username, password, done) => {
      if (username) {
        return done(Error("Username is not provided"), null);
      }
      if (password) {
        return done(Error("Password is not provided"), null);
      }

      let logItem = [
        username,
        password,
        get_ip(req).clientIp,
        req.requestCountryCode,
        new Date(),
      ];

      db.serialize(function () {
        db.run(
          `INSERT INTO log (username,password,ip,country,date) VALUES (?,?,?,?,?)`,
          logItem,
          function (err) {
            if (err) {
              return console.log(err.message);
            }
          }
        );
      });

      exec(
        `echo ${UBUNTU_PASS} | sudo -S awk -F[:$] '$1 == "${username}" {new=$2"$"$3"$"$4"$"$5; print new}' /etc/shadow`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`);
            return done(
              Error("Error while loging in - " + error.message),
              null
            );
          }

          if (stderr) {
            console.log(stderr);
            return done(Error("Error while loging in - " + stderr), null);
          }

          const ubunntuHashedPass = stdout;

          exec(
            `echo ${UBUNTU_PASS} | sudo -S awk -F[:$] '$1 == "${username}" {print $4}' /etc/shadow`,
            (error, stdout, stderr) => {
              if (error) {
                console.log(`error: ${error.message}`);
                return done(
                  Error("Error while loging in - " + error.message),
                  null
                );
              }
              if (stderr) {
                console.log(stderr);
                return done(Error("Error while loging in - " + stderr), null);
              }

              const ubuntuSalt = stdout;

              exec(
                `mkpasswd -m sha-512 -S ${ubuntuSalt} -s ${password}`,
                (error, stdout, stderr) => {
                  if (stdout == ubunntuHashedPass) {
                    return done(null, { username: username });
                  } else {
                    return done(Error("Password is incorrect!"), null);
                  }
                }
              );
            }
          );
        }
      );
    }
  )
);

var Log = function (user) {
  this.username = user.username;
  this.password = user.password;
  this.ip = user.ip;
  this.country = user.country;
  this.date = new Date();
};

app.get("/create", (req, res) => {
  let logItem = [
    "username",
    "password",
    get_ip(req).clientIp,
    requestCountry(req),
    new Date(),
  ];

  db.serialize(function () {
    db.run(
      `INSERT INTO log (username,password,ip,country,date) VALUES (?,?,?,?,?)`,
      logItem,
      function (err) {
        if (err) {
          return console.log(err.message);
        }
        res.json({ data: logItem });
      }
    );
  });
});

app.get("/table", (req, res) => {
  db.serialize(function () {
    db.run(
      "CREATE TABLE log ('id' INTEGER PRIMARY KEY AUTOINCREMENT, 'username' VARCHAR(255) NOT NULL, 'password' VARCHAR(255) NOT NULL, 'ip' VARCHAR(255) NOT NULL, 'country' VARCHAR(255) NOT NULL, 'date' DATETIME(6) NOT NULL)",
      function (err) {
        if (err) {
          return console.log(err.message);
        }
        console.log(`added`);
        res.send("done");
      }
    );
  });
});

app.get("/", (req, res) => {
  db.serialize(function () {
    db.all("SELECT * FROM log", function (err, data) {
      res.json({ data: data });
    });
  });
  // res.send("Hello World");
  //   console.log(req.sessionID);
});

//listen for request on port 3000, and as a callback function have the port listened on logged

// db.run("CREATE TABLE lorem (info TEXT)");

// var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
// for (var i = 0; i < 10; i++) {
//   stmt.run("Ipsum " + i);
// }
// stmt.finalize();

// db.close();

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// db.serialize(function () {
//   db.run("CREATE TABLE lorem (info TEXT)");

//   var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
//   for (var i = 0; i < 10; i++) {
//     stmt.run("Ipsum " + i);
//   }
//   stmt.finalize();

//   db.each("SELECT rowid AS id, info FROM lorem", function (err, row) {
//     console.log(row.id + ": " + row.info);
//   });
// });

// db.close();
