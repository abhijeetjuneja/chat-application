var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var path = require ('path');
mongoose.Promise = require('bluebird');
var Schema = mongoose.Schema;


var chatSchema = new Schema({

	userName  			: {type:String,default:'',required:true},
	userMessage			: {type:String,default:'',required:true},
	created             : {type:Date,default:Date.now}	
});


mongoose.model('Chat',chatSchema);

var dbPath  = "mongodb://localhost/chitChatDb";

// command to connect with database
db = mongoose.connect(dbPath);

mongoose.connection.once('open', function() {

	console.log("database connection open success");

});

