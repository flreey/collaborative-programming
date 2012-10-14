from flask import Flask, render_template

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/data', methods=['GET'])
def data():
    from flask import Response
    return Response('data')

#def websocket(wsgi_app):
    #def _wsig_app(environ, start_response):
        ##with self.request_context(environ):
        #upgrade = environ.get('HTTP_UPGRADE', '').lower()
        #if upgrade == 'websocket':
            #connection = environ.get('HTTP_CONNECTION', '').lower()

            #if connection == 'Upgrade':
                #ws_version = environ.get('HTTP_SEC_WEBSOCKET_VERSION', '').lower()
                #ws_key = environ.get('HTTP_SEC_WEBSOCKET_KEY', '').lower()
                #return wsgi_app(environ, start_response)
        #else:
            #return wsgi_app(environ, start_response)

    #return _wsig_app

def main():
    #from gevent import pywsgi
    #from geventwebsocket.handler import WebSocketHandler
    #server = pywsgi.WSGIServer(('', 5000), app,
            #handler_class=WebSocketHandler)
    #server.serve_forever()
    #app.wsgi_app = websocket(app.wsgi_app)
    app.run('localhost', debug=True)

if __name__ == '__main__':
    main()
