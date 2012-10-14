var io = require('socket.io').listen(3000);

io.sockets.on('connection', function (socket) {
    socket.on('message', function (data) {
        console.log(data)
    });
    socket.on('disconnect', function () { });
});
