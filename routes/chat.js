var app = require("../app.js");

exports.index = function(req, res) {
	console.log('/chat.html');
	var DB = app.DB;
	
	//ログイン済みか確認
	if (DB.isLogined(req.sessionID, function(val) {
		res.render('chat');
	},function(err){
		console.dir(err);
		if (err) {
			res.redirect('/login');
		}
		else {
			res.redirect('/login');
		}
	}));
};