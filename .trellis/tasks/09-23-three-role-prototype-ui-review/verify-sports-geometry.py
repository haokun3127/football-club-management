import json, xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parent
source=json.loads((root/'sports-visual-source-20260930.json').read_text())['nodes']
candidates=json.loads((root/'sports-visual-candidate-20260930.json').read_text())['nodes']
pairs=[('P01','213:348','401:1010'),('C01','214:2144','401:1106'),('C03','214:2203','401:1164'),('C11','214:2381','401:1212'),('D01','214:29','401:1262')]
def parse(v):
    return ET.fromstring(next(c['text'] for c in v['content'] if c.get('type')=='text' and c['text'].startswith('<frame')))
def index(n):
    out={}
    def visit(el,path,ax,ay,isroot=False):
        x=0 if isroot else float(el.get('x','0'))
        y=0 if isroot else float(el.get('y','0'))
        out[path]={'id':el.get('id'),'tag':el.tag,'name':el.get('name'),'x':ax+x,'y':ay+y,'width':float(el.get('width','0')),'height':float(el.get('height','0')),'hidden':el.get('hidden','false')}
        count={}
        for ch in el:
            key=(ch.tag,ch.get('name'))
            count[key]=count.get(key,0)+1
            visit(ch,path+((ch.tag,ch.get('name'),count[key]),),ax+x,ay+y)
    visit(n,(),0,0,True)
    return out
reports=[]
for name,s,c in pairs:
    si,ci=index(parse(source[s])),index(parse(candidates[c]))
    missing=[];changes=[]
    for path,a in si.items():
        if path not in ci:
            missing.append({'sourceId':a['id'],'path':path});continue
        b=ci[path]
        diff={k:[a[k],b[k]] for k in ['x','y','width','height','hidden'] if a[k]!=b[k]}
        if diff: changes.append({'sourceId':a['id'],'candidateId':b['id'],'name':a['name'],'diff':diff})
    reports.append({'screen':name,'source':s,'candidate':c,'sourceNodes':len(si),'candidateNodes':len(ci),'matched':len(si)-len(missing),'missing':missing,'geometryOrVisibilityChanges':changes,'addedCount':len(set(ci)-set(si))})
print(json.dumps({'method':'Match exposed nodes by hierarchical type/name/occurrence; compare frame-relative accumulated x/y, size and hidden state. Instance internals, actual text content and reactions are not exposed by metadata.','screens':reports},ensure_ascii=False,indent=2))

raise SystemExit(1 if any(r['missing'] or r['geometryOrVisibilityChanges'] for r in reports) else 0)
