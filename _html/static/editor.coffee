define((require, exports, module) ->
    ace = ''
    editor = ''
    Range = ''

    init: (_ace, io, project) ->
        ace = _ace
        editor = ace.edit('editor')
        Range = ace.require('ace/range').Range
        #require('vim')
        #@editor.setKeyboardHandler(ace.require('ace/keyboard/vim').handler)
        editor.setShowPrintMargin(true)
        editor.setTheme("ace/theme/monokai")
        session = editor.getSession()
        session.setMode("")
        session.setUseWrapMode(true)

        @asyn_server(io, project)

    asyn_server: (io, project) ->
        #$ = require('$')
        io = io.connect("/project")
        io.on('connect', () =>
            editor = editor
            window.t = editor
            editSession = editor.getSession()
            selection = editor.selection
            events_stack = []

            io.emit('join', project, (user)->
                console.log user
                if user == 'writer'

                    editSession.on('change', (o)->
                        events_stack.push(o.data)
                    )

                    editSession.selection.on('changeSelection', (o)->
                        range = editSession.selection.getRange()
                        range.action = 'changeSelection'
                        events_stack.push(range)
                    )

                    editSession.selection.on('changeCursor', ()->
                        o = editor.getCursorPosition()
                        o.action = 'changeCursor'
                        events_stack.push(o)
                    )

                    emit = ()->
                        if events_stack.length > 0
                            io.emit('change', events_stack)
                            events_stack = []

                    setInterval(emit, 100)

                else if user == 'reader'
                    #editSession.setMode("")
                   #editSession._eventRegistry.change = ''
                    io.on('insertText', (data) ->
                        start = data.range.start
                        #editSession.insert(start, data.text)
                        #editor.moveCursorTo(start.row, start.column)
                        #r = data.range
                        #range = new Range(r.start.row, r.start.column, r.end.row, r.end.column)
                        #editSession.replace(range, data.text)
                        editor.insert(data.text)
                    )

                    io.on('changeCursor', (data)->
                        editor.moveCursorTo(data.row, data.column)
                    )

                    io.on('changeSelection', (data)->
                        selection.setRange(data)
                        #editor.fromPoints(data.start, data.end)
                    )

                    io.on('removeText', (data)->
                        removeText(data)
                    )

                    io.on('removeLines', (data)->
                        removeText(data)
                    )

                    removeText = (data)->
                        r = data.range
                        range = new Range(r.start.row, r.start.column, r.end.row, r.end.column)
                        editSession.remove(range)

            )
        )
)
