const express = require('express')
const AWS = require('aws-sdk')
const multer = require('multer')
const cors = require('cors')
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const sha256 = require('crypto-js/sha256');
const mysql = require('mysql2');
const bodypaser= require('body-parser')
require('dotenv').config()


const connection = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PW,
  database : process.env.DB_NAME
});

connection.connect();



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


app.get('/admin', (req,res) => {
    if(req.session.role === 'admin'){
        res.status(200).send('/admin');
    }else{
        res.status(200).send('/login');
    }
})

app.post('/login', (req,res) => {
  console.log(req.session,"this")
  let id = process.env.ADMIN_ID;
  let pw = process.env.ADMIN_PW;
  console.log(req.body,"bodybody")
  let inputId = req.body.id;
  let inputPw = sha256(req.body.pw).toString();
  console.log(inputPw,"inputPW")
  
  let sql = { account:inputId }
  connection.query('SELECT * from user where ?',sql,(error,result) => {
    console.log(result)
    if(result){
        req.session.role = 'admin'
        console.log('admin')
    }else{
        req.session.role = 'denied'
        console.log('denied')
    }
  });
   
  if(req.session.role === 'admin'){
      res.status(200).send('/admin');
  }
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