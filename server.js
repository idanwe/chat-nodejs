var app = require('http').createServer(handleRquest),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    io = require('socket.io').listen(app, { log: false });

app.listen(6543);

function handleRquest(request, response) {
  var uri = url.parse(request.url).pathname,
      filename = path.join(process.cwd(), uri);

  var contentTypesByExtension = {
    '.html': "text/html",
    '.css':  "text/css",
    '.js':   "text/javascript",
    '.json': "text/json"
  };

  if(uri === '/index.json') {
    headers = { "Content-Type": "text/json" }
    response.writeHead(200, headers);
    var json = JSON.stringify({ message: messages, users: users });
    response.end(json);
  }
  else {
    fs.exists(filename, function(exists) {
      if(!exists) {
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write("404 Not Found\n");
        response.end();
        return;
      }

      fs.readFile(__dirname + request.url,function (err, data) {
        headers = {};
        var contentType = contentTypesByExtension[path.extname(filename)];
        if (contentType) headers["Content-Type"] = contentType;
        response.writeHead(200, headers);
        response.end(data);
      });
    });
  }
};
console.log('server listening on 6543...');

var users = {};
var messages = [];

io.sockets.on('connection', function(client) {
  client.on('join', function(nickname) {
    client.set('nickname', nickname);

    messages.forEach(function(message) {
      client.emit('message', message);
    });

    client.emit('log', nickname + ' wellcom the ChatJS');
    for(var user in users) {
      client.emit('joined', user);
    };
    client.broadcast.emit('joined', nickname);

    client.broadcast.emit('log', nickname + ' has been joined the chat');
    users[nickname] = nickname;
  });

  client.on('message', function(message) {
    client.get('nickname', function(err, nickname) {
      message.nickname = nickname;
      messages.push(message);
      client.broadcast.emit('message', message);
    });
  });

  client.on('disconnect', function() {
    client.get('nickname', function(err, nickname) {
      client.broadcast.emit('left', nickname);
      client.broadcast.emit('log', nickname + ' has been left the chat');
      delete(users[nickname]);
    });
  });
});
