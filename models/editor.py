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
        return data

    def removeLines(self, data):
        return data

