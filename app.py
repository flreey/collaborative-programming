import pdb
import collections

from flask import Flask, render_template, request, Response, session
from socketio import socketio_manage
from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin
from gevent import monkey; monkey.patch_all()
from socketio.server import SocketIOServer

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html', project='test')

class Project(BaseNamespace, RoomsMixin):
    projects = collections.defaultdict(set)

    def on_join(self, project):
        self.room = project
        self.join(self.room)
        #self.sid = self.socket.sessid
        self.projects[self.room].add(self.sid)

    def recv_connect(self):
        self.sid = self.socket.sessid
        #self.emit('sid', self.sid)

    def recv_disconnect(self):
        try:
            self.disconnect(True)
            self.projects[self.room].remove(self.sid)
        except KeyError:
            pass

    def on_change(self, data):
        action, text = data.values()
        print action, text
        self.emit_to_room(self.room, action, text)
        return list()

    def on_change_selection(self, data):
        return (data, '')

@app.route('/socket.io/<path:remaining>', methods=['GET'])
def socketio(remaining):
    socketio_manage(request.environ, {'/project': Project},
            request)
    return Response()

def main():
    server = SocketIOServer(('', 5000), app, resource="socket.io")
    server.serve_forever()

    #app.run('localhost', debug=True)

if __name__ == '__main__':
    main()
