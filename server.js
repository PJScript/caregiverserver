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

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors({
    origin:'http://caretestbucket.s3-website.ap-northeast-2.amazonaws.com',
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
    sameSite: 'none' ,
    secure:false,
},
    })
);

app.get('/', (req,res) => {
    res.send(200).send('Hello World !')
})

app.get('/gallery', (req,res) => {
    let num = Number(req.query.page)
    num = num - 1;
    console.log(num,typeof(num))
    
    if(num === 0){
        num = 0;
    }else{
        num = num * 12;
    }
    

    // console.log(req.session,'세션')
        connection.query(`select * from gallery order by uid DESC limit ${num},${num*12}`, (err, result) => {
            // console.log(result,"this")
            connection.query(`SELECT COUNT(*) FROM gallery`, (err, count) => {
                console.log(count)
                res.status(200).send({result,count:count[0]['COUNT(*)']});
        return;

    
            })
    
          })
    })

app.get('/admin', (req,res) => {
    console.log('get요청')
    console.log(req.query)
    let num = Number(req.query.page)
    num = num - 1;

    if(num >= 0){
        num = 0;
    }else{
        num = num * 12;
    }

    

    console.log(req.session,'세션')
    if(1){
        connection.query(`select * from gallery order by uid DESC limit ${num},${num+12}`, (err, result) => {
            // console.log(result,"this")
            connection.query(`SELECT COUNT(*) FROM gallery`, (err, count) => {
                console.log(count)
                res.status(200).send({result,count:count[0]['COUNT(*)']});
    
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
  console.log(inputPw,"inputPW")
  
  let sql = { account:inputId }
  connection.query('SELECT * from users where ?',sql,(error,result) => {
    console.log(result)

    if(!result || result.length <= 0){
        res.status(403).send('/login');
        return;
    }
    if(result){
        if(result[0].password === inputPw){
            req.session.role = 'admin'
            console.log('admin')
            console.log(req.session.role,"role")
            res.status(200).send('/admin');

        }else{
            res.status(403).send('/login');
        }
    }else{
        req.session.role = 'denied'
        res.status(200).send('/login');
        console.log('denied')
    }
  });
})


app.post('/change', (req,res) => {
  
})



app.post('/api/image',upload.single('image'), async (req,res) => {
    await console.log(req.file,"this")
    let file = await req.file;


    // if(!req.session.role && req.session.role !== 'admin'){
    //     console.log("test")
    //     res.status(403).send('/')
    //     return;
    // }
    
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
            console.log(result,"디비 인설트");
          })
          console.log(result,"success 200")
        })


    res.status(200).send("success");
})



app.listen(8080,()=>{
    console.log('server on 8080')
})