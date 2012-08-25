var MyApp = {
    sessionID : 0,
    ownData:{}
};

var connection = io.connect("/");

connection.on('connect', function() {
    console.log("Cliant-connect");
    MyApp.sessionID = connection.socket.sessionid;
    //ログイン済みのユーザーの情報を要求する
    connection.emit("requestRoomData");
});
connection.on('disconnect', function() {
    connection.disconnect();
    console.log("disconnect");
});


//新規ユーザーのログインを表示
connection.on('userJoin', function(data) {
    data = data || {};
    chatWindow.addMember({
        name : data.name,
        userID : data.userID,
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
                url: 'post/delete',
                data: {
                'postID':postID
                    },
                    success: function(data){
                        $("".Format("[data-postid={0}]",postID)).remove();
                        }
                    });
        });
        
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

var chatWindow = {
    makeLogHtml : function(postData) {
        return "".Format('<p data-postid="{0}"><span class="logName">{1}</span><span class="logMessage">{3}</span><span style="float:right;"><span class="logDate">{2}</span>{4}</span></p>', postData.postID, postData.name,moment(postData.postDate).format("YY/MM/DD HH:MM:ss"), postData.message.toString().escapeHtml(),
            postData.isOthers?"":"".Format(' <button class="logDeleatLink" data-postid="{0}">削除する</button>',postData.postID));
    },
    addLog : function(postData) {
        var html = chatWindow.makeLogHtml(postData);
        $('div#logArea').append(html);
        $("#logArea").scrollTop($("#logArea")[0].scrollHeight);
    },
    makeMenbersAreaLineHtml : function(menberData) {
        return "".Format('<p class="menbersArea_{0}"><span class="menberAreaName">{1}</span></p>', menberData.userID, menberData.name);
    },
    addMember:function(member){
        var html = chatWindow.makeMenbersAreaLineHtml(member);
        if( $("".Format("p.menbersArea_{0}",member.userID)).length==0){
        $("div#menbersArea").append(html);
        }
    },
    deleteMember:function(member){
        $("".Format("p.menbersArea_{0}",member.userID)).remove();
    }
};

