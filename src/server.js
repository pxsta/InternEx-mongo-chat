//必要モジュール,クラスの読み込み
var MyApp={ config:{ServerHttpPort:8080
                   },
                   cleanSessionDBIntervalID:0
};
//chachされなかった例外の処理
//process.on('uncaughtException', function (err) {
//    console.log('uncaughtException');
//    console.dir(err);
//});

var fs = require('fs');
var path = require('path');
var express = require('express');
var mongoose = require('mongoose');
var crypto = require('crypto');
mongoose.connect('mongodb://localhost/regist');
var User = new mongoose.Schema({userID: String, password: String, name:String,UserStatus:[UserStatus]});
mongoose.model('User', User);
User = mongoose.model('User');
//UserIDとPasswordは半角英数字4〜10文字
User.schema.path('userID').validate(function (value) {
    return /^[a-zA-Z0-9]{4,10}$/.test(value);
  }, 'Invalid ID');
User.schema.path('password').validate(function (value) {
    return /^[a-zA-Z0-9]{4,10}$/.test(value);
  }, 'Invalid ID');

//ログイン判別スキーマ
var UserStatus = new mongoose.Schema({userID: String, sessionID: String,lastAccess:Number});
mongoose.model('UserStatus', UserStatus);
UserStatus = mongoose.model('UserStatus');

//投稿スキーマ
var UserPost = new mongoose.Schema({userID: String,postDate:Number,message:String,'deleted':Number});
mongoose.model('UserPost', UserPost);
UserPost = mongoose.model('UserPost');

var app=express();
//var MemoryStore = express.session.MemoryStore;
//var sessionStore = new MemoryStore();
//var mongoStore = require('connect-mongodb');
//var sessionStore = new mongoStore({url:"mongodb://localhost/session"});

app.configure(function(){
    app.use(express.bodyParser());
    app.use(express.cookieParser("pxsta"));
    app.use(express.session({ secret: "pxsta"
                             //,store: sessionStore
                             }
    ));
    //app.use(express.methodOverride());
});
app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
    app.use(express.errorHandler()); 
});

var writeResData = function(req,res,currentPath){
    console.log(currentPath);
    var extention = path.extname(currentPath);
    fs.readFile(__dirname + currentPath, function(err, data){
        if (err) {
            console.dir(err);
            return send404(res);
        }
                        
        if(extention=='.html'){ res.writeHead(200, {'Content-Type': 'text/html'});}
        else if(extention=='.js'){ res.writeHead(200, {'Content-Type': 'text/javascript'});}
           
        res.write(data, 'utf8');
        res.end();
    });
};
var send404 = function(res){
    res.writeHead(404);
    res.write('404');
    res.end();
};
app.get('/', function(req, res) {
    writeResData(req,res,'/../login.html');
});
app.get('/scripts/*.js', function(req, res) {
    writeResData(req,res,'/..'+req.url);
});
app.get('/src/util/*.js', function(req, res) {
    writeResData(req,res,'/..'+req.url);
});
app.get('/src/client/*.js', function(req, res) {
    writeResData(req,res,'/..'+req.url);
});
app.get('/chat.html', function(req, res){
    console.log('/chat.html');
//    if(!req.session.login){
//        res.redirect('/login.html');
//        return;
//    }
    if(UserStatus.findOne({sessionID:req.sessionID},function(err,val){
        console.dir(err);
        if(err){
            res.redirect('/login.html');
        }
        else if(val!=null){
            writeResData(req,res,'/../chat.html');
        }
        else{
            res.redirect('/login.html');
        }
    }));
});
app.get('/*.html', function(req, res){
    console.log(req.sessionID);
    writeResData(req,res,'/..'+req.url);
});
app.post('/regist/new',function(req,res){
    console.log('/regist/new');
    var inputData= {userID :req.body.userID, password: req.body.password};
    
    User.findOne(inputData, function(err, data){
        if(data===null){
            //DBに保存する
            new User(inputData).pre('save', function(next) {
                //ドキュメント保存前にフックして処理したいこと
                console.log('pre save');
                //デバッグ時は暗号化無効に
                //this.password = crypto.createHash('md5').(this.password).digest("hex");
                next();
                })
                .save(function(err){
                    if(err){
                        console.log("has error");
                        console.dir(err);
                        res.redirect("/regist.html#error");
                        return;
                        }
                    console.log('save done');
                    res.redirect('/login.html'); // 保存したら/loginページにリダイレクト
                    return;
                    });
            }else{
                console.log("既に登録済み:"+inputData.userID);
                res.redirect("/regist.html#duplication");
                return;
            }
        });
    });
app.post('/user/login',function(req,res){
    console.log('/user/login');
    var inputData= {userID :req.body.userID, password: req.body.password};
    

    User.findOne(inputData, function(err, data){
        if(data!==null){
            console.log("login success");
            //ログインフラグ付与
            UserStatus.update({sessionID:req.sessionID},{$set: { userID:inputData.userID,lastAccess:Date.now()}}, {upsert: true}, function(err){
                    if(err){
                        console.log("sessionState save error");
                        console.dir(err);
                        res.redirect("/login.html#error");
                        return;
                        }
                    console.log('sessionState save done');
                    res.redirect('/chat.html');
                    return;
            });
            //req.session.login = true;
            //req.session.userID = inputData.userID;
            //res.redirect('/chat.html');
            return;
        }else{
            console.log("login faild");
            res.redirect('/login.html#error');
            return;
        }
    });
});
app.post('/post/delete',function(req,res){
    console.log('/post/delete');
    if(typeof req.body!=='undefined' && req.body && typeof req.body.postID !=='undefined'){
        //UserIDの取得
        UserStatus.findOne({sessionID:req.sessionID},function(err,val){
            if(err){
                console.log("delete post error");
                console.dir(err);
                res.send(500, { err: 'something blew up' });
            }
            else if(!val||!val.userID){
                console.log("delete post error:user not found");
                res.send(401, 'Sorry, we cannot find that!');
            }
            else{
                UserPost.update({_id:req.body.postID,userID:val.userID}, { 'deleted': Date.now()}, null,function(err,numberAffected) {
                    if(err||numberAffected==0){
                        console.log("delete post error");
                        console.dir(err);
                        res.send(500, { err: 'something blew up' });
                    }
                    else{
                        console.log("delete:"+req.body.postID);
                        res.send(200);
                    }
                }); 
            }
        });
    }
});

//とりあえず最新10件を返す
app.get('/post/timeline',function(req,res){
    console.log('/post/timeline');
    //UserIDの取得
    UserStatus.findOne({sessionID:req.sessionID},function(err,status){
        if(err){
            console.log("find post error");
            console.dir(err);
            res.send(500, { err: 'something blew up' });
        }
        else if(!status||!status.userID){
            console.log("find post error");
            console.dir(err);
            res.send(403, 'Sorry, we cannot find that!');
        }
        else{
            UserPost.find({deleted:null}," userID postDate message _id", {sort:['postDate','ascending'],limit:10}, function(err,val){
                if(err){
                    console.log("find post error");
                    console.dir(err);
                    res.send(503, err);
                    }
                else{
                    //TODO: userIDからuserName取得 コストが大きすぎる　
                    var result=[];
                    var userIDs= [];
                    val.forEach(function(elem,index){
                        userIDs.push(elem.userID);
                        result.push({message:elem.message,postID:elem._id,postDate:elem.postDate,userID:elem.userID});
                    });
                    User.find({userID:{'$in':userIDs}},"userID name",null,function(err,val){
                            var userNameIDs = {};
                            val.forEach(function(userData){
                                userNameIDs[userData.userID] = userData.userID;
                                });
                            for(var i=0;i<result.length;i++){
                                result[i].name=userNameIDs[result[i].userID];
                                if(status.userID!=result[i].userID){
                                    result[i].isOthers=true;
                                }
                            }
                            res.send(200, result);
                       });
               }
            });
      }
   });
});
app.get('/user/logout',function(req,res){
    console.log('/user/logout');
    UserStatus.remove({sessionID:req.sessionID}, function(err,numberAffected) {
        if(err){
            console.log("logout error");
        }
        else{
            console.log("logout:"+numberAffected);
        }
        res.redirect('/login.html');
      });
});
app.get('*', function(req, res){
    res.send('Not found', 404);
});

var http = require('http').createServer(app).listen(MyApp.config.ServerHttpPort);
var io = require('socket.io').listen(http);
io.set('log level', 1);

var connect = require('connect');
var Session = connect.middleware.session.Session;
io.set('authorization', function (handshakeData, callback) {
    console.log("authorization");
    console.log(handshakeData.headers.sessionID);
    if(handshakeData.headers.cookie) {
        //cookieを取得
        var cookie = handshakeData.headers.cookie;
        var parseCookie = require('cookie').parse;
        var sessionID = connect.utils.parseSignedCookies(parseCookie(decodeURIComponent(cookie)),'pxsta')['connect.sid'];
        console.log(sessionID );
        // 必要なデータを格納
        handshakeData.cookie = cookie;
        handshakeData.sessionID = sessionID;
        //handshakeData.sessionStore = sessionStore;
        
        // セッションをストレージから取得
        //sessionStore.get(sessionID, function (err, session) {
        UserStatus.findOne({'sessionID':sessionID}, function (err, session){
            if (err) {
                // セッションが取得できなかったら
                console.log("authorization failed");
                callback(err.message, false);
            } 
            else {
                handshakeData.session = new Session(handshakeData, session);
                
                // 認証 OK
                //if(typeof session !=="undefined" &&session.login){
                if(typeof session !=="undefined"&&session!==null){
                    console.log("authorization success");
                    handshakeData.userID = session.userID;
                    callback(null, true);
                }
                else{
                    console.log("authorization failed");
                    callback("not logined", false);
                }
           }
      });
    } 
    else{
        //Cookieが見つからなかったとき
        return callback('Cookieが見つかりませんでした', false);
    }
 });

io.sockets.on('connection', function (socket) {
    var sessionReloadIntervalID =0;
    console.log("connect:"+socket.id+" sessionID:"+socket.handshake.sessionID);
    var handshake = socket.handshake;
    // 1 分ごとにセッションを更新するループ
    sessionReloadIntervalID = setInterval(function () {
       UserStatus.update({sessionID:socket.handshake.sessionID},{lastAccess:Date.now()},null,function(err,numberAffected){
           if(!err){
               console.log("updated:"+numberAffected);
           }
       });
    }, 1000 * 60);
    

    //新規ユーザーのログインを知らせる
    io.sockets.emit('userJoin',{
        name : socket.handshake.userID,
        userID : socket.handshake.userID,
    });
    
    //チャットメッセージを送受信する
    socket.on("chat",function(data){
        console.log("chat:"+socket.handshake.userID);
        console.log(data);
        
        //DBに格納する
        var chatData ={userID:socket.handshake.userID,postDate:Date.now(),message:data}; 
        new UserPost(chatData)
        .save(function(err,raw){
            if(!err){
               chatData.name=socket.handshake.userID;
               chatData.postID=raw. _id; 
               socket.emit("chatMessage", chatData);
               chatData.isOthers=true;
               socket.broadcast.emit("chatMessage", chatData);
            }
        });
     });
        
    //すでにログインしているユーザーの情報を送る
    socket.on("requestRoomData",function(data){
        console.log("requestRoomData:"+socket.handshake.userID);
        //sessionStore.getCollection().find().toArray(function(err, docs) {
        UserStatus.find(function(err, docs) {
            console.log("find aleady logined");
            if(!err){
                docs.forEach(function(val){
                    io.sockets.emit('userJoin',{
                        name : val.userID,
                        userID : val.userID,
                    });
                });
            }
        });
      });
          
    socket.on('disconnect', function () {
        io.sockets.emit('userLeave',{
            name : socket.handshake.userID,
            userID : socket.handshake.userID,
            });
        // セッションの更新を停止
        clearInterval(sessionReloadIntervalID);
        });
}); 

MyApp.cleanSessionDBIntervalID = setInterval(function(){
    UserStatus.remove({lastAccess:{'$lte':Date.now()-5*60*1000}}, function(err,numberAffected) {
        if(err){
            console.log("clean up error");
        }
        else{
            console.log("clean up:"+numberAffected);
        }
      });
},60*1000);
