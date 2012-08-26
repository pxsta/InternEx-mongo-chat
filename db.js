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
    var UserPost = new mongoose.Schema({userID: String,postDate:Number,message:String,'deleted':Number});
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
    //TODO: 他にもDBに直接アクセスしている部分をなくす
    
    return that;
};