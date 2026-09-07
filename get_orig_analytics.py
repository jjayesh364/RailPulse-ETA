import json

log_path = r'C:/Users/HP/.gemini/antigravity/brain/b608c61e-26aa-4ef9-ac02-bfb014f950ed/.system_generated/logs/transcript_full.jsonl'
lines = []
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

d = json.loads(lines[1392])
for c in d.get('tool_calls', []):
    tc = c.get('args', {}).get('TargetContent')
    open('original_Analytics.tsx', 'w', encoding='utf-8').write(tc)
    print('Wrote original_Analytics.tsx! Length:', len(tc))
