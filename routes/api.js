var app = require("../app.js");

//とりあえず最新10件を返す
exports.timeline = function(req, res){
    console.log('/post/timeline');
    var DB = app.DB;
  //UserIDの取得
  DB.UserStatus.findOne({sessionID:req.sessionID},function(err,status){
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
          DB.UserPost.find({deleted:null}," userID postDate message _id", {sort:['postDate','ascending'],limit:10}, function(err,val){
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
                  DB.User.find({userID:{'$in':userIDs}},"userID name",null,function(err,val){
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
};
exports.destroy = function(req, res){
    console.log('/post/destroy');
    var DB = app.DB;
    if(typeof req.body!=='undefined' && req.body && typeof req.body.postID !=='undefined'){
        //UserIDの取得
        DB.UserStatus.findOne({sessionID:req.sessionID},function(err,val){
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
                DB.UserPost.update({_id:req.body.postID,userID:val.userID}, { 'deleted': Date.now()}, null,function(err,numberAffected) {
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
};