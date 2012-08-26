module.exports = function(){
    var that= {};
    var mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost/regist');

    //ユーザー情報スキーマ
    var User = new mongoose.Schema({userID: String, password: String, name:String});
    mongoose.model('User', User);
    that.User = mongoose.model('User');
    
    //UserIDとPasswordは半角英数字4〜15文字
    that.User.schema.path('userID').validate(function (value) {
        return /^[a-zA-Z0-9]{4,15}$/.test(value);
      }, 'Invalid ID : UserIDは半角英数字4〜15文字');
    that.User.schema.path('password').validate(function (value) {
        return /^[a-zA-Z0-9]{4,15}$/.test(value);
     }, 'Invalid password : Passwordは半角英数字4〜15文字');

    //ログイン判別スキーマ
    var UserStatus = new mongoose.Schema({userID: String, sessionID: String,lastAccess:Number});
    mongoose.model('UserStatus', UserStatus);
    that.UserStatus = mongoose.model('UserStatus');
    
    //投稿スキーマ
    var UserPost = new mongoose.Schema({userID: String,postDate:Number,message:String,'deleted':Number,messageType:String});
    mongoose.model('UserPost', UserPost);
    that.UserPost = mongoose.model('UserPost');
    
        
    /**
     * sessionIDがログイン済みのものか確かめる
     * @param sessionID sessionID
     * @param successCallBack ログイン済みであった場合のコールバック関数
     * @param errCallBack エラーまたは未ログインであった場合のコールバック関数
     */
    that.isLogined = function(sessionID,successCallBack,errCallBack){
        that.UserStatus.findOne({'sessionID' : sessionID}, function(err, session) {
			if (err) {
			    errCallBack(err);
			}
			else {
				if (typeof session !== "undefined" && session !== null) {
				    successCallBack(session);
				}
				else {
				    errCallBack(null);
				}
			}
		});
    };
    
    /**
     * 過去の投稿を取得する
     * @param config.limit 最大取得数
     * @param config.sessionID 接続中のセッションID
     * @param config.authed socket.ioからの要求など既にログイン済みのとき
     */
    that.getTimeLine = function(config,successCallBack,errCallBack){
        config= config||{};
        config.limit = config.limit||10;
        if(config.limit<1)config.limit=10;
        if(config.limit>15)config.limit=10;
        
        //実際にDBにアクセスする処理
        var action = function(){
            that.UserPost.find({deleted:null}," userID postDate message _id messageType", {sort:{'postDate':-1},'limit':config.limit}, function(err,val){
                if(err){
                    errCallBack(err);
                }
                else{
                    //TODO: userIDからuserName取得 コストが大きすぎる　
                    var result=[];
                    var userIDs= [];
                    for(var i=val.length-1;i>0;i--){
                        var elem = val[i];
                        userIDs.push(elem.userID);
                        result.push({message:elem.message,postID:elem._id,postDate:elem.postDate,userID:elem.userID,messageType:elem.messageType});
                    }
                    that.User.find({userID:{'$in':userIDs}},"userID name",null,function(err,val){
                        if(err){
                            errCallBack(err);
                            return;
                        }
                         var userNameIDs = {};
                         val.forEach(function(userData){
                             userNameIDs[userData.userID] = userData.userID;
                         });
                         for(var i=0;i<result.length;i++){
                             result[i].name=userNameIDs[result[i].userID];
                             if(config.userID!=result[i].userID){
                                 result[i].isOthers=true;
                             }
                         }
                         successCallBack(result);
                     });
                }
            },
            function(err){
                if(err){
                    errCallBack(err);
                }
                else{
                    errCallBack("post find error");
                }
            });
        };
        
        //ログイン済みの時
        if(typeof config.authed!=='undefined' && config.authed){
            action();
        }
        //ログインしているセッションIDか確かめる
        else{
            that.isLogined(config.sessionID,function(status){
                    config.userID = status.userID;
                    action();
                }
                ,function(err){
                    if(err){
                        errCallBack(err);
                    }
                    else{
                        errCallBack("not logined");
                    }
            });
        }
    };
    
    /**
     * 過去の投稿をDBから削除する
     * @param config.sessionID 接続中のセッションID
     * @param config.postID 削除する投稿のpostID
     * @param config.userID 削除する投稿のuserID
     * @param config.authed socket.ioからの要求など既にログイン済みのとき
     */
    that.destroy = function(config,successCallBack,errCallBack){
        var action = function(){
            that.UserPost.update({_id:config.postID,userID:config.userID}, { 'deleted': Date.now()}, null,function(err,numberAffected) {
                if(err||numberAffected==0){
                    errCallBack(err);
                }
                else{
                    successCallBack({});
                }
            }); 
       };
       
       if(typeof config.authed !=='undefined' && config.authed && typeof config.userID!=='undefined' && config.userID){
           action();
       }
       else{
           that.isLogined(config.sessionID,function(status){
               config.userID = status.userID;
               action();
           }
           ,function(err){
               if(err){
                   errCallBack(err);
               }
               else{
                   errCallBack("not logined");
               }
           });
       }
    };
    //TODO: 他にもDBに直接アクセスしている部分をなくす
    return that;
};