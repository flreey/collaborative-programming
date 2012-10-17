from flask import Flask, render_template, request, Response
from socketio import socketio_manage
from gevent import monkey; monkey.patch_all()
from socketio.server import SocketIOServer

from models.project import Project

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html', project='test')

@app.route('/socket.io/<path:remaining>', methods=['GET'])
def socketio(remaining):
    socketio_manage(request.environ, {'/project': Project},
            request)
    return Response()

def main():
    print 'server run: http://localhost:5000'
    server = SocketIOServer(('', 5000), app, resource="socket.io")
    server.serve_forever()

    #app.run('localhost', debug=True)

if __name__ == '__main__':
    main()
