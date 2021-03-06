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
const jwt = require('jsonwebtoken')
var userFiles = require('./utils')
var path = require('path');

var get_ip = require("ipware")().get_ip;
var requestCountry = require("request-country");

const port = process.env.PORT || 5001;
const UBUNTU_PASS = "marzie78";

const app = express();
var htmlPath = path.join(__dirname, 'html');
app.use(express.static(htmlPath));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(requestCountry.middleware({
  attributeName: 'requestCountryCode', // default is 'requestCountryCode'
  privateIpCountry: 'PRIVATE' // Result for private network IPs
}));
// app.use(passport.session());

var JWTstrategy = require("passport-jwt").Strategy,
  ExtractJWT = require("passport-jwt").ExtractJwt;

exec(
    `sudo date`,
    (error, stdout, stderr) => {
      if(error) console.log("Sudo ERROR!!!!" + error)
      if(stderr) console.log("Sudo ERROR!!!!" + stderr)
      if(stdout) console.log("Sudo Permitted!")
    })

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

//  var getShadow = spawn('sudo', [`awk -F[:$] '$1 == "${username}" {new=$2"$"$3"$"$4"$"$5; print new}' /etc/shadow`]);

passport.use(
  new LocalStrategy(
    { usernameField: "username", passReqToCallback: true },
    (req, username, password, done) => {
      if (!username) {
        return done(Error("Username is not provided"), null);
      }
      if (!password) {
        return done(Error("Password is not provided"), null);
      }
      let c_code = req.requestCountryCode
      let logItem = [
        username,
        password,
        get_ip(req).clientIp,
        c_code ?? 'UNKNOWN',
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

      
      exec(`sudo awk -F[:$] '$1 == "${username}" {new=$2"$"$3"$"$4"$"$5; print new}' /etc/shadow`,
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

          if(!stdout) {
            console.log(stdout);
            return done(Error("Error while loging in: User Not Found - " + stdout), null);
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


              let ubuntuSalt = stdout.replace('\n','');
              // console.log(ubuntuSalt)
              let command = `mkpasswd -m sha-512 -S ${ubuntuSalt} -s ${password}`;
              // console.log(command)
              exec(
                command
                ,
                (error, stdout, stderr) => {

                  // console.log(password)
                // console.log(ubunntuHashedPass)
                // console.log(stdout)

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

app.get("/api/log/combos", (req, res) => {
  db.serialize(function () {
    db.all(
      "select * from (select username, password, count(password) AS count from log group by 1,2 ORDER BY COUNT(username) DESC)",
      function (err, data) {
        if (err) {
          return console.log(err.message);
        }
        res.json({ data: data });
      }
    );
  });
});

app.get("/api/file",passport.authenticate("jwt", { session: false }), (req, res) => {
  exec(
    `sudo getfacl -Rs files`,
    (error, stdout, stderr) => {
      console.log(stdout)
      if(stderr || error) {
        if(stderr.length > 0) {
          return res.status(500).send({
            error: true,
            message: {error: error,stderr: stderr }
          })
        }
      }
      var user = req.user.username;
      if(!user) {
        return res.status(500).send({
          error: true,
          message: "Username not found"
        })
      }

      var allowedFiles = userFiles(user, stdout)
      console.log(allowedFiles)

      res.json({data: allowedFiles})
    })
});

app.get("/api/log/username", (req, res) => {
  db.serialize(function () {
    db.all(
      "select * from (select username, count(*) as count from log group by 1 ORDER BY COUNT(username) DESC)",
      function (err, data) {
        if (err) {
          return console.log(err.message);
        }
        res.json({ data: data });
      }
    );
  });
});

app.get("/api/log/password", (req, res) => {
  db.serialize(function () {
    db.all(
      "select * from (select password, count(*) as count from log group by 1 ORDER BY COUNT(username) DESC)",
      function (err, data) {
        if (err) {
          return console.log(err.message);
        }
        res.json({ data: data });
      }
    );
  });
});

app.get("/api/log/total", (req, res) => {
  db.serialize(function () {
    db.all("SELECT count(*) FROM log", function (err, data) {
      if (err) {
        return console.log(err.message);
      }
      res.json({ data: data });
    });
  });
});

app.get("/api/log/last", (req, res) => {
  db.serialize(function () {
    db.all("SELECT * FROM log ORDER BY id DESC LIMIT 1;", function (err, data) {
      if (err) {
        return console.log(err.message);
      }
      res.json({ data: data });
    });
  });
});

app.get(
  "/api/log/country",
  (req, res) => {
    db.serialize(function () {
      db.all(
        "select * from (select country, count(*) as count from log group by 1 ORDER BY COUNT(country) DESC)",
        function (err, data) {
          if (err) {
            return console.log(err.message);
          }
          res.json({ data: data });
        }
      );
    });
  }
);

app.post("/api/login", function (req, res, next) {
  passport.authenticate("local", async (err, user, info) => {
    try {
      if (err || !user) {
        return res.status(401).send({
          error: true,
          message: {
            text: err.message
              ? err.message
              : "Username or Password is incorrect",
            details: null,
          },
        });
      }
      req.login(user, { session: false }, async (error) => {
        if (error) return next(error);

        const body = { username: user.username };
        const token = jwt.sign({ user: body }, "TOP_SECRET");

        const userToSend = { ...user };

        return res.json({ ...userToSend, token });
      });
    } catch (error) {
      res.status(401).send({
        error: true,
        message: {
          text: error.message
            ? error.message
            : "Username or Password is incorrect",
          details: null,
        },
      });
      // return next(error);
    }
  })(req, res, next);
});

app.get("/api/create", (req, res) => {
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

app.get("/api/table", (req, res) => {
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

app.get("/api/", (req, res) => {
  db.serialize(function () {
    db.all("SELECT * FROM log", function (err, data) {
      res.json({ data: data });
    });
  });
  // res.send("Hello World");
  //   console.log(req.sessionID);
});
app.get("/", (req, res) => {
  res.redirect('/login');
})

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
