define((require, exports, module) ->
    init: (ace, io, project) ->
        @ace = ace
        @editor = @ace.edit('editor')
        @editor.setShowPrintMargin(true)
        @editor.setTheme("ace/theme/monokai")
        session = @editor.getSession()
        session.setMode("ace/mode/javascript")
        session.setUseWrapMode(true)

        @asyn_server(io, project)

    asyn_server: (io, project) ->
        #$ = require('$')
        io = io.connect("/project")
        io.on('connect', () =>
            editor = @editor
            editSession = editor.getSession()
            selection = editor.selection
            events_stack = []

            io.emit('join', project, (user)->
                console.log user
                if user == 'writer'
                    editSession.on('change', (o)->
                        console.log o
                        #io.emit('change', o)
                        events_stack.push(o)
                    )

                    editSession.selection.on('changeSelection', (o)->
                        events_stack.push(event)
                    )

                    editSession.selection.on('changeCursor', ()->
                        o = editor.getCursorPosition()
                        #event =
                            #data:
                                #action: 'changeCursor'
                                #pos: o
                        events_stack.push(o)
                    )

                    emit = ()->
                        if events_stack.length > 0
                            io.emit('change', events_stack)
                            events_stack = []

                    setInterval(emit, 100)

                else if user == 'reader'
                    io.on('insertText', (data) ->
                        #e.on('change', ()->)
                        editor.insert(data)
                        #e.on('change', message)
                    )
            )
        )
)
