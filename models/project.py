from collections import defaultdict

from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin

from models.editor import Editor

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
