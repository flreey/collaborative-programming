define((require, exports, module) ->
    init: (ace, io) ->
        @ace = ace
        @editor = @ace.edit('editor')
        @editor.setShowPrintMargin(true)
        @editor.setTheme("ace/theme/monokai")
        session = @editor.getSession()
        session.setMode("ace/mode/javascript")
        session.setUseWrapMode(true)

        @asyn_server(io)

    asyn_server: (io) ->
        io = io.connect('http://localhost:3000')
        io.on('connect', () =>
            e = @editor
            s = e.getSession()
            sl = e.selection

            e.on('change', (e)->
                io.send(e)
                #console.log e
            )
            e.on('changeSelection', (e)->
                io.send(sl.anchor)
                io.send(sl.lead)
            )
        )
)
