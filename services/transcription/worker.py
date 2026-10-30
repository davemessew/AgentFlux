import json
import sys
from faster_whisper import WhisperModel

model = WhisperModel('/models/base', device='cpu', compute_type='int8', cpu_threads=4)
segments, info = model.transcribe(sys.argv[1], beam_size=3, vad_filter=True, condition_on_previous_text=False)
print(json.dumps({'language': info.language, 'duration': info.duration, 'segments': [
    {'start': segment.start, 'end': segment.end, 'text': segment.text}
    for segment in segments
]}))
