//主程序
var app={
    tool:{},
    store:{}
};
app.tool={
    $:function(selector,node){
        return (node || document).querySelector(selector);
    },
    time:function(ms,T){
        var t=new Date(ms);//将毫秒数转为日期格式
        var timebase=function(s){//转换时间格式
            if(s.toString().length===1) s="0"+s;
            return s;
        };
        var year=t.getFullYear();
        var month=t.getMonth()+1;
        var day=t.getDate();
        var hour=t.getHours();
        var minte=t.getMinutes();
        if(!T) T=' ';
        return year+"-"+timebase(month)+"-"+timebase(day)+T+timebase(hour)+":"+timebase(minte);
    }
};
app.store={
    key:'-key-',
    set:function(id,content){
        var notes=this.getNotes();
        if(notes[id]) Object.assign(notes[id],content);
        else notes[id]=content;
        localStorage[this.key]=JSON.stringify(notes);//更新存储
        //console.log('saved note: id: ' + id + ' content: ' + JSON.stringify(notes[id]));
    },
    get:function(id){//获得id 没有就返回{}
        var notes=this.getNotes();
        return notes[id] || {};
    },
    remove:function(id){
        var notes=this.getNotes();
        delete notes[id];
        localStorage[this.key]=JSON.stringify(notes);
    },
    getNotes:function(){
        return JSON.parse(localStorage[this.key] || '{}');
    }
};
(function(tool,store){
 var $=tool.$;
 var notifyMe;
 var moveEle=null,startX,startY;
 var MaxZindex=0;
 var note_html=`<i class="close"></i>
        <div class="note-title" contenteditable="true"></div>
        <div class="edite" contenteditable="true"></div>
        <div class="note-time">
        <div class="deadline">提醒时间：</div>
            <input type="datetime-local" class="finish-time">
            <div class="create-time">
                <span>更新:</span>
                <span class="time"></span>
            </div>
        </div>`;
 class Note{
   constructor(option){
     var note=document.createElement('div');
     note.className='note';
     note.id=option.id || 'note-'+ Date.now();//初始化id
     note.innerHTML=note_html;
     $('.note-title',note).innerHTML=option.title||'title';//初始化标题
     $('.edite',note).innerHTML=option.content || ''; //初始化内容
     var notice=tool.time(option.noticetime,'T');
     $('.finish-time',note).value=notice;//将毫秒数=>格式：2017-01-01T00:00
     note.style.left=option.left+"px";
     note.style.top=option.top+"px";
     note.style.zIndex=option.zIndex;
     note.style.backgroundColor=option.bgColor;
     this.note=note;
     //保存note的各种属性 left top zindex
     $('#container').appendChild(note);
     this.updatetime(option.updatetime);
     this.event();
  }

  //保存note的一些方法
  updatetime(ms){
    var notetime=$('.time',this.note);
    ms=ms || Date.now() ;
    notetime.innerHTML=tool.time(ms);
    this.updatetimeInstorage=ms;  //将ms保存在原型中
  };
  down(e){//被按下
   moveEle=this.note;//记录被按下的元素
   startX = e.clientX - this.note.offsetLeft;//保存移动之前鼠标的位置及note距离窗口x
   startY = e.clientY - this.note.offsetTop;//保存移动之前鼠标的位置及note距离窗口y
   if(parseInt(this.note.style.zIndex)!==MaxZindex-1){
        this.note.style.zIndex=MaxZindex++;
    }
   //保存zindex
   store.set(this.note.id,{
       zIndex:MaxZindex-1
   })
  };
  move(e){//被移动
    if(!moveEle) return;//如果没有按下就不执行移动操作
      else{
        moveEle.style.left=e.clientX-startX+'px';//计算鼠标前后差值并加上之前note与父元素的距离
        moveEle.style.top=e.clientY-startY+'px';
  }
  };
  close(){//被关闭
           $('#container').removeChild(this.note);//移除note
            this.note.removeEventListener('mousedown',this.down.bind(this));//移除自己的mousedown事件
           store.remove(this.note.id); //移除note id
        };
  input(){//输入
   var timer=null;
   clearTimeout(timer);
   timer=setTimeout(function(){
       console.log(1);
      var title=$('.note-title',this.note).textContent;
      var content=$('.edite',this.note).textContent;
      var noticetime=$('.finish-time',this.note).value;
      var noticems=new Date(noticetime).getTime();
      var time=Date.now();
      store.set(this.note.id,{
          title:title,
          content:content,
          noticetime:noticems,
          updatetime:time
      });
      this.updatetime(time);
      var nt=noticems-time;//提醒日期与现在时间毫秒差
      if(nt>0&&nt<86400000){
          var timer1=setTimeout(function(){
              console.log('输入定时');
              var title=$('.note-title',this.note).textContent;
              var content=$('.edite',this.note).textContent;
              notifyMe(title,content);
          }.bind(this),nt)
      }else{ clearTimeout(timer1);timer1=null}
   }.bind(this),1000);
  };
  up(){//松开
      if(!moveEle) return;
       else{
          //先记录当前位置
          store.set(moveEle.id,{
              left:moveEle.offsetLeft,
              top:moveEle.offsetTop
          });
      }
      moveEle=null;
  };
  event(){//所有事件集合
   this.note.addEventListener('mousedown',this.down.bind(this));
   $('.close',this.note).addEventListener('click',this.close.bind(this));
   var arr= this.note.querySelectorAll('.edite,.note-title,.finish-time');
   for(var v of arr){
          v.addEventListener("input",this.input.bind(this))
   }
   this.note.addEventListener('mousemove',this.move.bind(this));
   this.note.addEventListener('mouseup',this.up.bind(this));
  };
  save(){
      store.set(this.note.id,{
          left:this.note.offsetLeft,
          top:this.note.offsetTop,
          zIndex:parseInt(this.note.style.zIndex),
          bgColor:getComputedStyle(this.note).backgroundColor,
          title:$('.note-title',this.note).textContent,
          content:$('.edite',this.note).textContent,
          updatetime:this.updatetimeInstorage
      })
  }
 }
//notice模块
notifyMe=function(title,content) {
        //获取便签的标题
        var title = title;
        var options = {
            body: content,
            icon:'img/1.jpg',
            tag:"tag0"
        };
        var audio=new Audio("audio/4082.wav");
        audio.play();
        function notificate(title,options){
            var notification = new Notification(title, options);
            notification.onshow = function() {
                setTimeout(function() {
                    notification.close();
                },5000);
            };
        }
        //检查是否支持插件
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notification");
        }
        // 检查权限是否开启
        else if (Notification.permission === "granted") {
            //ok就创建一个对象
            notificate(title,options);
        }
        //否则就询问是否开启权限
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                if (permission === "granted") {
                    notificate(title,options);
                }
            });
        }
    };

 document.addEventListener("DOMContentLoaded",function(){
    $('#add').onclick=function(){
        var note=new Note({
           left:parseInt(Math.random()*(window.innerWidth-220)),
           top:parseInt(Math.random()*(window.innerHeight-320)),
           zIndex:MaxZindex++,
           bgColor:"rgb(255,210,"+parseInt(Math.random()*255)+")"
        });//待传入option对象
        note.save();
    };
     var notes = store.getNotes();
     //将存储的东西还原
     Object.keys(notes).forEach(function (id) {//将notes中可枚举的属性和方法转为数组
         var options = notes[id];
         if (MaxZindex< options.zIndex) {
            MaxZindex= options.zIndex;
         }
         new Note(Object.assign(options, {
             id: id
         }));
     });
     MaxZindex+= 1;

     var nowms=new Date().getTime();
//     取出localstorage['-key-']的值
     var keyvalue=localStorage['-key-'];
//     json.parse()转为对象
     var keyobj=JSON.parse(keyvalue);
//     遍历对象（key value）
    for(let key in keyobj){
        if(keyobj[key].noticetime){
            var nt=keyobj[key].noticetime-nowms;
            if(nt>100&&nt<=86400000){
                   setTimeout(function(){
                        notifyMe(keyobj[key].title,keyobj[key].content);
                    },nt);
            }
        }
    }
 });
})(app.tool,app.store);






