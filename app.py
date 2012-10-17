import pdb
from collections import defaultdict

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

class Editor(object):
    def __init__(self):
        self.skip_cursor = False

    def changeCursor(self, data):
        if self.skip_cursor:
            self.skip_cursor = False
            #return
        data.pop('action')
        return data

    def insertText(self, data):
        text = data['text']
        if self.skip_cursor:
            self.skip_cursor = False
        if text == u'\n' or text == u'\r\n':
            self.skip_cursor = True
        data.pop('action')
        return data

    def changeSelection(self, data):
        data.pop('action')
        return data

    def insertLines(self, data):
        return data['lines']

    def removeText(self, data):
        return data['range']

    def removeLines(self, data):
        pass


class Project(BaseNamespace, RoomsMixin, Editor):
    projects = defaultdict(lambda:defaultdict(set))

    def recv_connect(self):
        self.sid = self.socket.sessid
        #self.emit('sid', self.sid)

    def recv_disconnect(self):
        try:
            self.disconnect(True)
            self.projects[self.room].pop(self.sid)
        except KeyError:
            pass

    def on_join(self, project):
        self.room = project
        self.join(self.room)

        return self.distribute_authority(project, self.sid), True

    def distribute_authority(self, project, sid):
        authority = 'reader'

        if 'writer' not in self.projects[project].values():
            authority = 'writer'
        self.projects[project][sid] = authority

        return authority

    def on_change(self, data):
        for d in data:
            print d
            action = d['action']
            args = getattr(self, action)(d)
            if args:
                self.emit_to_room(self.room, action, args)

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
