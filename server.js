const express = require('express')
const AWS = require('aws-sdk')
const multer = require('multer')
const cors = require('cors')
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const mysql = require('mysql2');
require('dotenv').config()


const connection = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PW,
  database : process.env.DB_NAME
});

connection.connect();

connection.query('SELECT * from users', (error, rows, fields) => {
  if (error) throw error;
  console.log('User info is: ', rows);
});

connection.end();





const upload = multer({})
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region : process.env.AWS_REGION
});


const app = express();

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors({
    origin:'*'
}))


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        store: new MemoryStore({
            checkPeriod: 600000
        }),
        cookie: { maxAge: 600000 },
    })
);


app.post('/login', (req,res) => {
  console.log(req.session,"this")
  let id = process.env.ADMIN_ID;
  let pw = process.env.ADMIN_PW;

  if(req.body.id === id && req.body.pw === pw){
    req.session.role = 'admin'
  }else{
    req.session.role = 'denied'
  }

  if(!req.session.role === 'undefined'){
      res.status(403).send();
      return;
  }
  res.status(200).send();
})


app.post('/change', (req,res) => {
  
})

// app.use('/', (req,res) => {
//   if(req.session.role !== 'admin'){
//     res.status(403).send();
//     return;
//   }
// })

app.post('/api/image',upload.single('image'), (req,res) => {
    if(req.session.role !== 'admin'){
        req.session.destroy();
        res.status(403).send('/');
        return;
    }

//   console.log(new Date().toISOString(),"날짜")
//   console.log(req.session.cookie._expires)
  
//   let nowDate = new Date().toString();
//   let prevDate = req.session.cookie._expires.toString();
  
//   console.log(nowDate - prevDate,"this")



  const param = {
    'Bucket':'onlyimagebucket',
    'Key': `${Date.now().toString()}${req.file.originalname}`,
    'ACL':'public-read',
    'Body':req.file.buffer,
    // 'ContentType':'image/png'
  }

    s3.upload(param,(err,result)=>{
      if(err){
          console.log(err)
          return;
      }

      console.log(result,"success 200")
    })
    res.status(200).send("success");
})



app.listen(8080,()=>{
    console.log('server on 8080')
})