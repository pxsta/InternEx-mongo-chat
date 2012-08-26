var app = require("../app.js");

//とりあえず最新10件を返す
exports.timeline = function(req, res){
    console.log('/post/timeline');
    var DB = app.DB;
    //UserIDの取得
    DB.getTimeLine({sessionID:req.sessionID},function(val){
          res.send(200, val);
      },
      function(err){
          console.log("find post error");
          console.dir(err);
          res.send(503, err);
      });
};
exports.destroy = function(req, res){
    console.log('/post/destroy');
    var DB = app.DB;
    if(typeof req.body!=='undefined' && req.body && typeof req.body.postID !=='undefined'){
        DB.destroy({sessionID:req.sessionID,postID:req.body.postID},function(val){
            console.log("delete:"+req.body.postID);
            res.send(200);
        },
        function(err){
            console.log("delete post error");
            console.dir(err);
            res.send(500, err);
        });
    }
};