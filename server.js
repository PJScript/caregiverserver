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



// connection.end();





const upload = multer({})
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region : process.env.AWS_REGION
});


const app = express();


app.use(express.json({
    limit: '10mb'
  }))
  app.use(express.urlencoded({
    limit: '10mb',
    extended: false
  }))

  app.use(cors({
    // origin:"http://localhost:3000",
    origin:'http://kkyoyangedu.com',
    // origin:'http://localhost:3000',

    methods: ['GET', 'POST'],
    credentials: true,
}))

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        store: new MemoryStore({
            checkPeriod: 600000, // 24 hours (24*60*60 * 1000ms)
        }),
        cookie: { maxAge: 600000,
 
},
    })
);

  app.post('/api/image',upload.single('image'), async (req,res) => {
    await console.log(req.file,"this")
    let file = await req.file;

    if(!file){
        res.status(403).send('please select file')
        return;
    }
    if(!req.session.role && req.session.role !== 'admin'){  // admin 검증
        console.log("test")
        res.status(403).send('/')
        return;
    }


    
    const param = {
        'Bucket':'onlyimagebucket',
        'Key': `${Date.now().toString()}${req.file.originalname}`,
        'ACL':'public-read',
        'Body':req.file.buffer,
        // 'ContentType':'image/png'
      }
      let date = new Date()
        s3.upload(param,(err,result)=>{
            console.log("업로드 시작")
          if(err){
              console.log(err)
              return;
          }
          
          connection.query(`insert into gallery(img_url, user_idx, del_yn) values("${result.Location}",0,0)`, (err,result) => {

          })
          console.log(result,"success 200")
        })


    res.status(200).send("success");
})


app.post('/rm', (req,res) => {

    if(!req.session.role && req.session.role !== 'admin'){  // admin 검증
        res.status(403).send('/')
        return;
    }

    let uid = Number(req.query.uid);
    connection.query(`UPDATE gallery SET del_yn=1 WHERE uid=${uid}`,(err,result)=>{
        console.log(result)
        res.status(200).send('success')
    })
})







app.get('/', (req,res) => {

    res.status(200).send('Hello World !')
})

app.get('/gallery', (req,res) => {
    let num = Number(req.query.page)
    let lastNum = 12
    num = num - 1;
    console.log(num,typeof(num))
    
    if(num === 0){
        num = 0;
    }else{
        lastNum = lastNum * num
        num = num * 12;
    }
    

    // console.log(req.session,'세션')
        connection.query(`select * from gallery where del_yn=0 order by uid DESC limit ${num},${lastNum}`, (err, result) => {
            // console.log(result,"this")
            connection.query(`select COUNT(if(del_yn=0,del_yn,null)) from gallery`, (err, count) => {
                console.log(count,"count")
                res.status(200).send({result,count:count[0]['COUNT(if(del_yn=0,del_yn,null))']});
        return;

    
            })
    
          })
    })

app.get('/admin', (req,res) => {

    let num = Number(req.query.page)
    num = num - 1;

    if(num >= 0){
        num = 0;
    }else{
        num = num * 12;
    }

    

    console.log(req.session,'세션')
    if(req.session.role === 'admin'){
        connection.query(`select * from gallery where del_yn=0 order by uid DESC limit ${num},${num+12}`, (err, result) => {
            // console.log(result,"this")
            connection.query(`select COUNT(if(del_yn=0,del_yn,null)) from gallery`, (err, count) => {
                res.status(200).send({result,count:count[0]['COUNT(if(del_yn=0,del_yn,null))']});

            })
        return;
    
          })
        
      
    }else{
        req.session.destroy();
        res.status(403).send('/login');
    }
})

app.post('/login', (req,res) => {
  let inputId = req.body.id;
  let inputPw = sha256(req.body.pw).toString();
  
  let sql = { account:inputId }
  connection.query('SELECT * from users where ?',sql,(error,result) => {

    if(!result || result.length <= 0){
        res.status(403).send('/login');
        return;
    }
    if(result){
        if(result[0].password === inputPw){
            req.session.role = 'admin'
            res.status(200).send('/admin');
        }else{
            res.status(403).send('/login');
        }
    }else{
        req.session.role = 'denied'
        res.status(200).send('/login');
    }
  });
})


app.post('/change', (req,res) => {
  
})







app.listen(8080,()=>{
    console.log('server on 8080')
})