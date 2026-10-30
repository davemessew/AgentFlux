import json
import os
import select
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

if not os.path.exists('/models/base/.ready'):
    shutil.copytree('/opt/models/base', '/models/base', dirs_exist_ok=True, ignore=shutil.ignore_patterns('.cache'))
    with open('/models/base/.ready', 'w', encoding='utf-8') as marker:
        marker.write('base\n')

slots = threading.BoundedSemaphore(2)

class Handler(BaseHTTPRequestHandler):
    def reply(self, code, value):
        payload = json.dumps(value).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        self.reply(200 if self.path == '/health' else 404, {'status': 'ok', 'model': 'base'})

    def do_POST(self):
        if self.path != '/v1/audio/transcriptions':
            self.reply(404, {'error': 'Not found'}); return
        if not slots.acquire(blocking=False):
            self.reply(429, {'error': 'Transcription is busy'}); return
        process = None
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 10 * 1024 * 1024:
                self.reply(413, {'error': 'Audio segments must be no larger than 10 MB'}); return
            self.connection.settimeout(30)
            body = self.rfile.read(length)
            message = BytesParser(policy=default).parsebytes(b'Content-Type: ' + self.headers.get('Content-Type', '').encode() + b'\r\nMIME-Version: 1.0\r\n\r\n' + body)
            fields = {part.get_param('name', header='content-disposition'): part.get_payload(decode=True) for part in message.iter_parts()}
            if fields.get('model', b'base').decode() != 'base' or not fields.get('file'):
                self.reply(400, {'error': 'Select the bundled base model and provide audio'}); return
            with tempfile.TemporaryDirectory(prefix='agentflux-speech-') as directory:
                audio = os.path.join(directory, 'audio.wav')
                with open(audio, 'wb') as target:
                    target.write(fields['file'])
                output = os.path.join(directory, 'result.json')
                errors = os.path.join(directory, 'worker.log')
                with open(output, 'wb') as stdout, open(errors, 'wb') as stderr:
                    process = subprocess.Popen([sys.executable, 'worker.py', audio], stdout=stdout, stderr=stderr)
                    deadline = time.monotonic() + 285
                    while process.poll() is None:
                        if time.monotonic() > deadline:
                            raise TimeoutError('Speech segment timed out')
                        readable, _, _ = select.select([self.connection], [], [], 0.25)
                        if readable and not self.connection.recv(1, socket.MSG_PEEK):
                            return
                    if process.returncode != 0:
                        raise RuntimeError('Speech decoding failed')
                with open(output, encoding='utf-8') as result:
                    self.reply(200, json.load(result))
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as error:
            self.reply(400, {'error': str(error)[:300]})
        finally:
            if process is not None and process.poll() is None:
                process.kill(); process.wait()
            slots.release()

    def log_message(self, format, *args):
        # Do not log recording names or transcript text.
        return

ThreadingHTTPServer(('0.0.0.0', 8090), Handler).serve_forever()
