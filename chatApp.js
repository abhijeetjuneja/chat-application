var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Chat=require('./chatLog.js');
var mongoose=require('mongoose');
var colorPicker=require('pick-random');
var responseGenerator = require('./libs/responseGenerator');
var chatModel=mongoose.model('Chat');
var users=[];
var colors=['#9D1313','#9D136A','#98139D','#58139D','#1C139D','#13619D','#139D8A','#138649','#138617','#7E8613','#866013','#861313'];
var userColorMapping=[];
var chatMessage="";
var flag;
var oldMessages=[];


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


//Application level middleware
app.use(function(req,res,next){
  var logs = {'Time of Request': Date.now(),
        'Requested Url'  : req.originalUrl,
        'Base Url'       : req.baseUrl,
        'Ip address'     : req.ip,
        'Method'         :req.method
  };
  console.log(logs);
  next();
});


//Function to save each chat message
var saveMessage=function(message,userName){
  var newMessage = new chatModel({userName : userName,userMessage: message});
  newMessage.save(function(err){
      if(err){

          var myResponse = responseGenerator.generate(true,"some error"+err,500,null);
          console.log(myResponse);
      }
      else{

          var myResponse = responseGenerator.generate(false,"Saved Message",200,newMessage);
          console.log(myResponse);
      }

  });//end new mesage save
};

//Function to load history
var loadHistory = function(id){

    //Find all chats in the chat model
    chatModel.find({},function(err,history){
      if(err){
                var myResponse = responseGenerator.generate(true,"Some error"+err,500,null);                
                console.log(myResponse);
            }
            else{

                //Save chat messages array in oldMessages variable
                oldMessages=history;
            }
    });
};



//Function to get color from color user mapping
var getColorAndMessage =function(user,msg,flag){
    var color;
    for(var i in userColorMapping)
    {
      if(userColorMapping[i].user==user)
      {
        color=userColorMapping[i].color;
        break;
      }
    }
    //Check if it is a chat message
    if(flag==1)
      chatMessage="<li style='color:"+color+"!important;'>"+user+" : "+msg+"</li>";

    //Check if it is a online offline notification
    if(flag==0)
      chatMessage="<li style='color:"+color+"!important;'>"+msg+"</li>";
};



//Function to delete color user mapping entry for user who disconnected
var deleteColorUserMapping = function(user){
    for(var i in userColorMapping)
    {
      if(userColorMapping[i].user==user)
      {
        userColorMapping.splice(i,1);
        break;
      }
    }
};


//Function to delete history if required
var deleteHistory = function(id){
    chatModel.remove({},function(err,history){
      if(err){
                var myResponse = responseGenerator.generate(true,"Some error"+err,500,null);                
                console.log(myResponse);
            }
            else{
                console.log("Deleted");
            }
    });
};


//Check if new user joined
io.on('connection', function(socket){

  //Listener for new user
  socket.on('user',function(enteredName,sendUnique){

    //Check if username is taken from users array
    if(users.indexOf(enteredName)==-1)
    {
      console.log(enteredName+" just joined.");
      var msg=enteredName+ " came online";
      //Set flag for online offline notification
      flag=0;

      //Call for assigning color theme for user
      getColorAndMessage(enteredName,msg,flag);

      //Broadcast that user joined
      socket.broadcast.emit('chat message', chatMessage);

      //Emit already online users
      io.to(socket.id).emit('already-online',users); 

      //Set socket.user as current user
      socket.user = enteredName;

      //Load history
      loadHistory(socket.id);

      //Push user into the users array
      users.push(enteredName);

      console.log("No. of Connected Users - "+users.length);

      //Broadcast to client to add a new online user
      socket.broadcast.emit('add-online', enteredName);

      //Callback to client indicating username is available
      sendUnique(true);      
    }
    else
    {
      //Callback to client indicating username is not available
      sendUnique(false);
    }
    


  });


  //Listener for chat messages from the clients
  socket.on('chat message', function(msg){
    //Set flag for chat messages
    flag=1;

    //Get color from color user mapping table and message
    getColorAndMessage(socket.user,msg,flag);

    //Emit the chat message with theme to users
    io.emit('chat message',chatMessage);

    //Save the message in mongodb
    saveMessage(msg,socket.user);

  });


  //Listener for laoding history
  socket.on('load-history',function(userName){
    console.log(userName+" is requesting history");

    //Emit history to the current client
    io.to(socket.id).emit('show-history',oldMessages);
  });


  //Listener for typing events
  socket.on('typing', function(msg){

    //Broadcast to clients if user is typing
    socket.broadcast.emit('user is typing', socket.user+" is typing");
  });


  //Listener to clear typing event
  socket.on('clear typing', function(msg){

    //Broadcast to clients that user isn't typing
    socket.broadcast.emit('clear user is typing',socket.user);
  });


  //Listener for setting colors for users
  socket.on('setColor',function(){

    //Pick a color from pick random module
    var color=colorPicker(colors,{count:1})[0];

    //Map user to color
    var map={user:socket.user,color:color};

    //Add mapping to user color mapping array
    userColorMapping.push(map);
  });



  //Listener for disconnection
  socket.on('disconnect',function(){

     console.log(socket.user+" left.");

     //Remove user from users array
     users.splice(users.indexOf(socket.user), 1);
     console.log("No. of Connected Users - "+users.length);

     //delete color user mapping for this user
     deleteColorUserMapping(socket.user);

     //Set message that user is logged out
     var msg=socket.user+" has logged out";

     //Set flag for offline notification
     flag=0;

     //Get color and message
     getColorAndMessage(socket.user,msg,flag);

     //Emit to client as a chat message
     socket.broadcast.emit('chat message',chatMessage);

     //Emit to client to remove user from online users
     socket.broadcast.emit('remove-online', socket.user);


  }); //end socket disconnected


});


//Other routes
app.get('*',function(req,res,next){
    res.status=404;
    next("Path not Found !");
});

//Error handler
app.use(function(err,req,res,next){
  console.log(err);
    if(res.status==404){
        var myResponse = responseGenerator.generate(true,"Page not Found",404,null);
        res.sendFile(__dirname + '/error404.html');
    }
    else
    {
        var myResponse = responseGenerator.generate(true,"Internal Server Error",500,null);
        res.sendFile(__dirname + '/error.html');
    }
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});
