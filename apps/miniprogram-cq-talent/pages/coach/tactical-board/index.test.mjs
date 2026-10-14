import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({get:vi.fn(),save:vi.fn(),role:vi.fn()}));
vi.mock('../../../utils/api',()=>({getCoachTacticalBoard:mocks.get,saveCoachTacticalBoard:mocks.save}));
vi.mock('../../../utils/auth',()=>({requireRole:mocks.role}));
vi.mock('../../../utils/presentation',()=>({resolveMenuInset:()=>90,resolveNavInset:()=>20}));
let definition;
globalThis.Page=d=>{definition=d;};
const storage=new Map();
globalThis.wx={getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,structuredClone(value)),removeStorageSync:key=>storage.delete(key),navigateBack:vi.fn(),nextTick:fn=>fn(),createSelectorQuery:()=>({select:id=>({boundingClientRect:cb=>{cb(id==='#c7-pitch'?{left:10,top:100,width:320,height:400}:{left:10,top:520,width:320,height:140});return {exec(){}};}})})};
await import('./index.ts');
const players=[{studentId:'a',displayName:'旧姓名',role:'starter',x:.5,y:.5},{studentId:'b',displayName:'乙',role:'substitute',x:.5,y:.5}];
const response=()=>({event:{id:'event',title:'比赛'},board:{formationName:'4-3-3',players:structuredClone(players)},roster:[{studentId:'a',displayName:'甲'},{studentId:'b',displayName:'乙'},{studentId:'c',displayName:'丙'}],readOnly:false});
const page=()=>{const p={...definition,data:structuredClone(definition.data)};p.setData=d=>Object.assign(p.data,d);return p;};
const gesture=(id,x,y)=>({currentTarget:{dataset:{id}},touches:[{clientX:x,clientY:y}],changedTouches:[{clientX:x,clientY:y}]});
async function loaded(){const p=page();await p.onLoad({eventId:'event'});return p;}
describe('reviewed free tactical board',()=>{
 beforeEach(()=>{storage.clear();vi.useFakeTimers();mocks.role.mockReturnValue({role:'coach'});mocks.get.mockReset().mockImplementation(async()=>response());mocks.save.mockReset().mockImplementation(async()=>response());});
 afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
 it('requires authorized role and event, uses current roster names and preserves saved positions',async()=>{
  const empty=page();await empty.onLoad({});expect(mocks.get).not.toHaveBeenCalled();
  mocks.role.mockReturnValue(null);await page().onLoad({eventId:'event'});expect(mocks.get).not.toHaveBeenCalled();mocks.role.mockReturnValue({role:'coach'});
  const p=await loaded();expect(p.data.starters[0]).toMatchObject({displayName:'甲',x:.5});expect(p.data.rosterPlayers).toHaveLength(2);
 });
 it('drags a roster member onto the pitch without replacing an existing player, then autosaves',async()=>{
  const p=await loaded();p.startRosterDrag(gesture('b',100,570));p.finishDrag(gesture('b',170,300));expect(p.data.starters).toHaveLength(2);expect(p.data.rosterPlayers.map(x=>x.studentId)).not.toContain('b');
  await vi.advanceTimersByTimeAsync(401);expect(mocks.save).toHaveBeenCalledWith('event','free',expect.arrayContaining([expect.objectContaining({studentId:'b',role:'starter',x:.5,y:.5})]));expect(p.data.dirty).toBe(false);
 });
 it('invalid drops restore the original position; valid roster drops and undo restore membership',async()=>{
  const p=await loaded();p.startPlayerDrag(gesture('a',170,300));p.finishDrag(gesture('a',350,700));expect(p.data.dirty).toBe(false);
  p.startPlayerDrag(gesture('a',170,300));p.finishDrag(gesture('a',160,570));expect(p.data.starters).toHaveLength(0);p.undoMove();expect(p.data.starters).toHaveLength(1);expect(p.data.canUndo).toBe(false);
 });
 it('moves freely, cancels interrupted gestures and keeps names visible in the view state',async()=>{
  const p=await loaded();p.startPlayerDrag(gesture('a',170,300));p.movePlayer(gesture('a',210,250));expect(p.data.dragName).toBe('甲');p.cancelDrag();expect(p.data.players[0].x).toBe(.5);
  p.startPlayerDrag(gesture('a',170,300));p.finishDrag(gesture('a',250,400));expect(p.data.players[0]).toMatchObject({x:.75,y:.75});p.undoMove();expect(p.data.players[0]).toMatchObject({x:.5,y:.5});
 });
 it('clears to a valid empty pitch, automatically persists and keeps all roster members',async()=>{
  const p=await loaded();p.clearBoard();expect(p.data.starters).toHaveLength(0);expect(p.data.rosterPlayers).toHaveLength(3);await vi.advanceTimersByTimeAsync(401);expect(mocks.save.mock.calls[0][2].every(x=>x.role==='substitute')).toBe(true);
 });
 it('renders a blank saved board with the roster available for placement',async()=>{
  mocks.get.mockResolvedValue({...response(),board:{players:[]}});const p=await loaded();expect(p.data.state).toBe('ready');expect(p.data.starters).toHaveLength(0);expect(p.data.rosterPlayers).toHaveLength(3);
 });
 it('retains failed saves and retries without discarding current positions',async()=>{
  mocks.save.mockRejectedValueOnce(new Error('offline'));const p=await loaded();p.startPlayerDrag(gesture('a',170,300));p.finishDrag(gesture('a',250,400));await vi.advanceTimersByTimeAsync(401);expect(p.data.dirty).toBe(true);expect(p.data.saveError).toContain('已保留');expect(p.data.players[0].x).toBe(.75);await p.saveBoard();expect(p.data.dirty).toBe(false);
 });
 it('serializes saves and does not let an older response erase newer drag changes',async()=>{
  let resolve;mocks.save.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const p=await loaded();p.clearBoard();await vi.advanceTimersByTimeAsync(401);
  p.startRosterDrag(gesture('b',100,570));p.finishDrag(gesture('b',170,300));resolve(response());await Promise.resolve();await Promise.resolve();expect(p.data.starters.map(x=>x.studentId)).toEqual(['b']);await vi.advanceTimersByTimeAsync(401);expect(mocks.save).toHaveBeenCalledTimes(2);expect(mocks.save.mock.calls[1][2].find(x=>x.studentId==='b').role).toBe('starter');
 });
 it('restores an offline draft only for the same authorized account and match, without auto-overwriting the server',async()=>{
  mocks.role.mockReturnValue({role:'coach',userId:'coach-a',clubId:'club-a'});mocks.save.mockRejectedValue(new Error('offline'));
  const p=await loaded();p.clearBoard();await vi.advanceTimersByTimeAsync(401);p.onUnload();await Promise.resolve();
  const q=await loaded();expect(q.data.starters).toHaveLength(0);expect(q.data.dirty).toBe(true);expect(q.data.saveError).toContain('已恢复');
  mocks.save.mockClear();await vi.advanceTimersByTimeAsync(401);expect(mocks.save).not.toHaveBeenCalled();
  mocks.role.mockReturnValue({role:'coach',userId:'coach-b',clubId:'club-a'});expect((await loaded()).data.starters).toHaveLength(1);
  mocks.role.mockReturnValue({role:'coach',userId:'coach-a',clubId:'club-a'});mocks.save.mockResolvedValue(response());await q.saveBoard();expect(storage.size).toBe(0);
 });
 it('flushes the latest change after unloading while an earlier save is in flight',async()=>{
  let resolve;mocks.save.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const p=await loaded();p.clearBoard();await vi.advanceTimersByTimeAsync(401);
  p.startRosterDrag(gesture('b',100,570));p.finishDrag(gesture('b',170,300));p.onUnload();resolve(response());await Promise.resolve();await Promise.resolve();
  expect(mocks.save).toHaveBeenCalledTimes(2);expect(mocks.save.mock.calls[1][2].find(x=>x.studentId==='b').role).toBe('starter');
 });
 it('does not edit read-only matches or update an unloaded page after an outstanding load',async()=>{
  mocks.get.mockResolvedValue({...response(),readOnly:true});const p=await loaded();p.clearBoard();p.startPlayerDrag(gesture('a',170,300));expect(p.data.dragId).toBe('');expect(p.data.dirty).toBe(false);
  let done;mocks.get.mockImplementationOnce(()=>new Promise(r=>{done=r;}));const q=page();const loading=q.onLoad({eventId:'event'});q.onUnload();done(response());await loading;expect(q.data.state).toBe('loading');
 });
});
