var MyApp={sessionID:0,requestRoomDataIntervalID:0};
var connection = io.connect("/");
connection.on('connect', function() {
    console.log("Cliant-connect");
    MyApp.sessionID = connection.socket.sessionid;
    
    //ログイン済みのユーザーの情報を要求する
    connection.emit('requestRoomData');
    MyApp.requestRoomDataIntervalID = setInterval(function(){
        connection.emit('requestRoomData');},60*1000);
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
            $.ajax({
                type: 'post',
                url: 'post/destroy',
                data: {
                'postID':postID
                    },
                    success: function(data){
                        $("".Format("[data-postid={0}]",postID)).remove();
                        }
                    });
        });
        //最新10件の投稿を取得する
        $.ajax({url: 'post/timeline',
            success: function(data){
                if(data){
                    data.forEach(function(elem){
                        //時系列は無視 
                        chatWindow.addLog(elem);
                    });
                }
          }
        });
    });
};


//発言を行う
var sendMessage = function(message) {
    connection.emit("chat", message);
};

var onClickMainButton = function() {
    var message = $("#messageBox").attr('value').replace('\n', '').replace('\r', '');
    if(message && message.length > 0) {
        sendMessage(message);
    }
    $("#messageBox").attr('value', '');

};


//とりあえず
var chatWindow = {
    makeLogHtml : function(postData) {
        return "".Format('<p data-postid="{0}"><span class="logName">{1}</span><span class="logMessage">{3}</span><span style="float:right;"><span class="logDate">{2}</span>{4}</span></p>', postData.postID, postData.name,moment(postData.postDate).format("YY/MM/DD HH:MM"), postData.message.toString().escapeHtml(),
            postData.isOthers?"":"".Format(' <button class="logDeleatLink" data-postid="{0}">削除する</button>',postData.postID));
    },
    addLog : function(postData) {
        var html = chatWindow.makeLogHtml(postData);
        $('div#logArea').append(html);
        $("#logArea").scrollTop($("#logArea")[0].scrollHeight);
    },
    makeMenbersAreaLineHtml : function(menberData) {
        return "".Format('<p class = "membername" data-name="{0}"><span class="menberAreaName">{1}</span></p>', menberData.userID, menberData.name);
    },
    addMember:function(member){
        var html = chatWindow.makeMenbersAreaLineHtml(member);
        if( $("".Format('div#menbersArea p[data-name="{0}"]',member.userID)).length==0){
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

