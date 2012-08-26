var express = require('express')
    , http = require('http')
    , path = require('path')
    , connect = require('connect')
    , url = require('url')
    , crypto = require('crypto')
    , util = require('util');

var DB = require("./db.js")();
module.exports = {
	'DB' : DB,
};

var MyApp = {
	cleanSessionDBIntervalID : 0,
};

var loginRoutes = require('./routes/login');
var registRoutes = require('./routes/regist');
var chatRoutes = require('./routes/chat');
var apiRoutes = require('./routes/api');

var app = express();
app.configure(function() {
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.set('secretKey', 'pxsta');
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.cookieParser(app.get('secretKey')));
	app.use(express.session({
		secret : app.get('secretKey')
	}));
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
	app.use(express.errorHandler());
});

app.get('/', loginRoutes.index);
app.get('/login', loginRoutes.index);
app.post('/user/login', loginRoutes.login);
app.get('/user/logout', loginRoutes.logout);
app.get('/post/timeline', apiRoutes.timeline);
app.post('/post/destroy', apiRoutes.destroy);
app.get('/regist', registRoutes.index);
app.post('/regist/new', registRoutes.regist);
app.get('/chat', chatRoutes.index);

var httpServer = http.createServer(app).listen(app.get('port'));
console.log("Express server listening on port " + app.get('port'));

var io = require('socket.io').listen(httpServer);
io.set('log level', 1);


/**
 * Scoket.ioの接続確立前にログインしているか確認する
 */
io.set('authorization',function(handshakeData, callback) {
	util.debug("authorization");
	util.debug(handshakeData.headers.sessionID);
	if (handshakeData.headers.cookie) {
		//cookieを取得
		var cookie = handshakeData.headers.cookie;
		var parseCookie = require('cookie').parse;
		var sessionID = connect.utils.parseSignedCookies(parseCookie(decodeURIComponent(cookie)),app.get('secretKey'))['connect.sid'];

		// 必要なデータを格納
		handshakeData.cookie = cookie;
		handshakeData.sessionID = sessionID;
		// セッションをDBから取得
		DB.isLogined(sessionID,function(session) {
				util.debug("authorization success");
				handshakeData.userID = session.userID;
				callback(null, true);
			},
			function(err){
				if (err) {
					//セッションが取得できなかったら
					util.log("authorization failed");
					console.dir(err);
					callback(err.message, false);
				}
				else {
					util.debug("authorization failed:not logined");
					callback("not logined", false);
				}
		});
	}
	else {
		//cookieが見つからなかった時
		return callback('cookie not found', false);
	}
});

/**
 * socket.io接続確立
 */
io.sockets.on('connection', function(socket) {
	var sessionReloadIntervalID = 0;
	util.debug("connect:" + socket.id + " sessionID:"+ socket.handshake.sessionID);
	
	//1分ごとにセッションを更新するループ
	sessionReloadIntervalID = setInterval(function() {
		DB.UserStatus.update({sessionID : socket.handshake.sessionID},{lastAccess : Date.now()}, null, function(err, numberAffected) {
			if (!err) {
				util.log(util.format("updated:%s",socket.handshake.sessionID));
			}
		});
	}, 1000 * 60);

	//新規ユーザーのログインを知らせる
	io.sockets.emit('userJoin', {
		name : socket.handshake.userID,
		userID : socket.handshake.userID,
	});

	//チャットメッセージを送受信する
	socket.on("chat", function(data) {
		util.debug(util.format("chat:%s %s",socket.handshake.userID,data));

		//DBに格納する
		var chatData = {
			userID : socket.handshake.userID,
			postDate : Date.now(),
			message : data
		};
		new DB.UserPost(chatData).save(function(err, raw) {
			if (!err) {
				chatData.name = socket.handshake.userID;
				chatData.postID = raw._id;
				socket.emit("chatMessage", chatData);
				chatData.isOthers = true;
				socket.broadcast.emit("chatMessage", chatData);
			}
		});
	});

	//すでにログインしているユーザーの情報を送る
	socket.on("requestRoomData", function(data) {
		util.debug("requestRoomData:" + socket.handshake.userID);
		DB.UserStatus.find(function(err, docs) {
			util.debug("find aleady logined");
			if (!err) {
				var userArray = [];
				docs.forEach(function(val) {
					userArray.push({
						name : val.userID,
						userID : val.userID
					});
				});
				io.sockets.emit('roomData', userArray);
			}
		});
	});
	socket.on('disconnect', function() {
		util.debug("disconnedt:"+socket.handshake.userID);
		io.sockets.emit('userLeave', {
			name : socket.handshake.userID,
			userID : socket.handshake.userID,
		});
		// セッションの更新を停止
		clearInterval(sessionReloadIntervalID);
	});
});

 
/**
 * アクセスのないユーザーのセッション情報をDBから削除する
 */
MyApp.cleanSessionDBIntervalID = setInterval(function() {
	DB.UserStatus.remove({
		lastAccess : {
			'$lte' : Date.now() - 2 * 60 * 1000
		}
	}, function(err, numberAffected,raw) {
		if (err) {
			console.dir(err);			
		} else {
			util.log("clean up:" + numberAffected);
		}
	});
}, 60 * 1000);