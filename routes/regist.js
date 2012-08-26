var app = require("../app.js");
var errorMessage = {1:"validation error : ID/passは4〜15文字",2:"そのIDは既に使用済み"};
var url = require('url'),
    crypto = require('crypto');
    

exports.index = function(req, res){
    var query = url.parse(req.url,true).query;
    
    if(typeof query !=='undefined'&&typeof query.errorid!=='undefined' && typeof errorMessage[query.errorid]!=='undefined'){
        res.render('regist', { info: errorMessage[query.errorid] });
    }
    else{
        res.render('regist', { info: '' });
    }
};

exports.regist = function(req, res){
    console.log('/regist/new');
    var DB = app.DB;
    var inputData= {userID :req.body.userID, password: req.body.password};
    
    DB.User.findOne(inputData, function(err, data){
        if(data===null){
            //DBに保存する
            new DB.User(inputData).pre('save', function(next) {
                console.log('pre save');
                //デバッグ時は暗号化無効に
                //this.password = crypto.createHash('md5').(this.password).digest("hex");
                next();
                })
                .save(function(err){
                    if(err){
                        console.log("has error");
                        console.dir(err);
                        res.redirect("/regist?errorid=1");
                        return;
                        }
                    console.log('save done');
                    res.redirect('/login');
                    return;
                    });
            }else{
                console.log("既に登録済み:"+inputData.userID);
                res.redirect("/regist?errorid=2");
                return;
            }
        });
};