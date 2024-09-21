const sql = require("mysql2");
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require('dotenv').config();
const port = process.env.PORT;
const JWTSecretKey = process.env.JWT_SECRET;
app.use(express.json());
app.use(cors());

const db = sql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
})
db.connect(err => {
  if (err) {
    console.log("Cant Connect to DB " + err);
  }
  else {
    console.log("Connected to DB");
  }
})

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post("/signup", (req, res) => {
  const query = "insert into users(`name`, `password`, `email`) values(?)";
  const values = [
    req.body.name,
    req.body.password,
    req.body.email
  ];
  db.query(query, [values], (err, result) => {
    if (err) {
      console.log("Failed To Add Data " + err.message);
      return res.status(403).send({ message: err.message });
    }
    else {
      console.log("Data Added Successfully " + result);
      return res.status(200).send({ message: "Account Registered Successfully..." });
    }
  })
})

app.post("/signin", (req, res) => {
  console.log("Try Signing In");
  const query = "select * from users where name = ? and password = ?"   //
  const values = [req.body.name, req.body.password];
  db.query(query, values, (err, result) => {
    if (err) {
      console.log("Wrong Credentials!");
      return res.status(403).send({ message: err.message });
    }
    else {
      if (result.length > 0) {
        console.log("User Found!");
        return res.status(200).send({ message: "User Found" });
      }
      else {
        console.log("No User Record!");
        return res.send({ message: "No User Record Found!" });
      }
    }
  })
})

app.get("/developerdata", (req, res) => {
  db.query(`select * from  developers`, (err, result) => {
    if (err) {
      console.log("Developer Data Failed To Get " + err.message);
    }
    else {
      if (result.length > 0) {
        return res.send(result);
      }
    }
  })
})

app.get("/clientdata", (req, res) => {
  db.query(`select * from  clients`, (err, result) => {
    if (err) {
      console.log("Client Data Failed To Get " + err.message);
    }
    else {
      if (result.length > 0) {
        return res.send(result);
      }
    }
  })
})

app.get("/paymentdata", (req, res) => {
  db.query(`select * from  payments`, (err, result) => {
    if (err) {
      console.log("Payment Data Failed To Get " + err.message);
    }
    else {
      if (result.length > 0) {
        return res.send(result);
      }
    }
  })
})

app.get("/projectdata", (req, res) => {
  db.query(`select * from  projects`, (err, result) => {
    if (err) {
      console.log("Project Data Failed To Get " + err.message);
    }
    else {
      if (result.length > 0) {
        return res.send(result);
      }
    }
  })
})

const transporter = nodemailer.createTransport({  // Creating Transporter Details
  service: "gmail",
  auth: {
    user: "banerjeeindra06@gmail.com",
    pass: "upoz otzl txtd ltia" // Gmail App Password   
  }
})

app.post("/request-otptoken", (req, res) => {
  const query = "select * from users where email = ?";
  const email = req.body.email;
  console.log("Email Is " + email);
  db.query(query, email, (err, result) => {
    if (err) {
      console.log("Err " + err.message);
      return res.status(404).send({ message: "Not Found" });
    } else {
      if (result.length > 0) {
        
        const otp = crypto.randomInt(1000, 9999).toString();
        const otptoken = jwt.sign({ email, otp }, JWTSecretKey, {expiresIn: "1m"});
        const decodedToken = jwt.decode(otptoken);
        const mailoptions = {
          from: "banerjeeindra06@gmail.com",
          to: email,
          subject: 'Password Reset OTP',
          text: `Your OTP for password reset is: ${otp}`,
        }
        transporter.sendMail(mailoptions, (err, result) => {
          if (err) {
            console.log("Error " + err.message);
            return res.status(500).send({message: err.message});
          } else {
            console.log("Send " + result);
            return res.status(200).send({ message: "Mail Send", decodedToken});
          }
        })
      }
      else {
        console.log("User Not Found");
      }
    }
  })
})

app.post("/verify-otptoken", (req, res)=>{
  const {otp, otpToken} = req.body;
  console.log("OTP "+otp+ " & "+ "TokenOTP "+otpToken.otp);
  if(otpToken.otp !== otp){
    console.log("Invalid OTP");
    return res.status(404).send({message: "Invalid OTP"});
  }
  else{
    return res.status(200).send({message: "Valid OTP"});
  }
})

app.post("/save-password", (req, res)=>{
  const {email, password} = req.body;
  db.query("update users set password = ? where email = ?", [password,email], (err, result)=>{
    if(err){
      console.log("Error "+err.message);
      res.send({message: err.message});
    }else{
      if(result.affectedRows>0){
        console.log("Result "+result);
        res.send({message: "Password Chnaged"});
      }else{
        console.log("User Not Found");
        res.send({message: "User Not Found"});
      }
    }
  })
})

app.listen(port, () => {
  console.log("Listening on ", port);
})

// sql.connect(sqlConfig)
// .then(res => res.request().query("insert into clients (name,email) values(ABC, abc@gmail.com)"))
// .then(data => data.recordset.forEach(row=>console.log(row)))
// .catch(err => console.log("err "+err))