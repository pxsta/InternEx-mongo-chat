var app = require("../app.js");
var errorMessage = {1:"internal error",2:"ID/PASSの組み合わせが不正"};
var url = require('url');

exports.index = function(req, res){
  var query = url.parse(req.url,true).query;
  
  if(typeof query !=='undefined'&&typeof query.errorid!=='undefined' && typeof errorMessage[query.errorid]!=='undefined'){
      res.render('login', { info: errorMessage[query.errorid] });
  }
  else{
      res.render('login', { info: '' });
  }
};

exports.login = function(req, res){
    console.log('/user/login');
    var DB = app.DB;
    var inputData= {userID :req.body.userID, password: req.body.password};
    
    DB.User.findOne(inputData, function(err, data){
        if(data!==null){
            console.log("login success");
            //ログイン済みとしてsessionIDとuserIDを紐付けて保存
            DB.UserStatus.update({sessionID:req.sessionID},{$set: { userID:inputData.userID,lastAccess:Date.now()}}, {upsert: true}, function(err){
                    if(err){
                        console.log("sessionState save error");
                        console.dir(err);
                        res.redirect("/login?errorid=1");
                        return;
                        }
                    console.log('sessionState save done');
                    res.redirect('/chat');
                    return;
            });
            return;
        }else{
            console.log("login faild");
            res.redirect('/login?errorid=2');
            return;
        }
    });
};

exports.logout = function(req, res){
    console.log('/user/logout');
    var DB = app.DB;
    DB.UserStatus.remove({sessionID:req.sessionID}, function(err,numberAffected) {
        if(err){
            console.log("logout error");
        }
        else{
            console.log("logout:"+numberAffected);
        }
        res.redirect('/login');
      });
};