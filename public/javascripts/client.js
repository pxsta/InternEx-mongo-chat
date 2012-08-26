var MyApp={sessionID:0};
var connection = io.connect("/");
connection.on('connect', function() {
    console.log("Cliant-connect");
    $('#mainButton').text("投稿");
    MyApp.sessionID = connection.socket.sessionid;    
});

connection.on('disconnect', function() {
    connection.disconnect();
    console.log("disconnect");
});

//新規ユーザーのログインを受信
connection.on('userJoin', function(data) {
    data = data || {};
    chatWindow.addMember({
        name : data.name,
        userID : data.userID,
    }); 
});

//ユーザー一覧の受信
connection.on('roomData', function(data) {
    data = data || {};
    chatWindow.clearMamber();
    data.forEach(function(elem){
        chatWindow.addMember(elem); 
    }); 
});

//ユーザーのログアウト
connection.on('userLeave', function(data) {
    data = data || {};
    chatWindow.deleteMember({
        name : data.name,
        userID : data.userID,
    }); 
});

//ユーザーの発言を受信して表示する
connection.on('chatMessage', function(data) {
    data = data || {};
    chatWindow.addLog(data);
});

//ユーザーの発言が削除された時
connection.on('destroy',function(data){
    chatWindow.deleteLog(data);
});

connection.on('disconnect',function(){
    $('#mainButton').text("再接続");
});

window.onload = function() {
    $('body').css('height', document.documentElement.clientHeight);    
    $(function() {
        $("#messageBox").bind("keydown", function(e) {
            var code = (e.keyCode ? e.keyCode : e.which);
            if(code == 13) {
                onClickMainButton();
            }
        });
        $("button.logDeleatLink").live("click",function(e){
            var postID = $(this).attr("data-postid");
            connection.emit("destroy", {'postID':postID});
        });
        if(typeof FileReader!=='undefined'){
            $("input#read-button").bind("change",function(e){
                //ファイル読み込み
                var file = e.target.files[0];
                var reader = new FileReader();
                reader.onload = function(e) {
                    sendImage(e.target.result);
                };
                reader.readAsDataURL(file);
           });
        }
        else{
            $(".readfile").remove();
        }
    });
};


//発言を行う
var sendMessage = function(message) {
    connection.emit("chat", message);
};
var sendImage = function(data){
    connection.emit("chat_image", data);
}

var onClickMainButton = function() {
    if(connection.socket.connected){
        var message = $("#messageBox").attr('value').replace('\n', '').replace('\r', '');
        if(message && message.length > 0) {
            sendMessage(message);
        }
        $("#messageBox").attr('value', '');
    }
    else{
        location.reload();
    }
};


//とりあえず
var chatWindow = {
    makeLogHtml : function(postData) {
        return "".Format('<p data-postid="{0}"><span class="logName">{1}</span><span class="logMessage">{3}</span><span style="float:right;"><span class="logDate">{2}</span>{4}</span></p>', postData.postID, postData.name,moment(postData.postDate).format("YY/MM/DD HH:MM"), postData.message.toString().escapeHtml(),
            postData.isOthers?"":"".Format(' <button class="logDeleatLink" data-postid="{0}">削除する</button>',postData.postID));
    },
    makeLogImageHtml : function(postData) {
        return "".Format('<p data-postid="{0}"><span class="logName">{1}</span><img class="logImage" src="{3}"></img><span style="float:right;"><span class="logDate">{2}</span>{4}</span></p>', postData.postID, postData.name,moment(postData.postDate).format("YY/MM/DD HH:MM"), postData.message.toString().escapeHtml(),
            postData.isOthers?"":"".Format(' <button class="logDeleatLink" data-postid="{0}">削除する</button>',postData.postID));
    },
    addLog : function(postData) {
        if($("".Format('div#logArea p[data-postid="{0}"]',postData.postID)).length==0){
            var html;
            if(typeof postData.messageType!=='undefined' && postData.messageType=='image'){
                html = chatWindow.makeLogImageHtml(postData);
            }
            else{
                html = chatWindow.makeLogHtml(postData);
            }
            $('div#logArea').append(html);
            $("#logArea").scrollTop($("#logArea")[0].scrollHeight);
        }
    },
    deleteLog:function(postData){
        $("".Format('div#logArea p[data-postid="{0}"]',postData.postID)).remove();
    },
    makeMenbersAreaLineHtml : function(menberData) {
        return "".Format('<p class = "membername" data-name="{0}"><span class="menberAreaName">{1}</span></p>', menberData.userID, menberData.name);
    },
    addMember:function(member){
        var html = chatWindow.makeMenbersAreaLineHtml(member);
        if($("".Format('div#menbersArea p[data-name="{0}"]',member.userID)).length==0){
            $("div#menbersArea").append(html);
        }
    },
    deleteMember:function(member){
        $("".Format('div#menbersArea p[data-name="{0}"]',member.userID)).remove();
    },
    clearMamber:function(){
        $("div#menbersArea p.membername").remove();
    }
};

