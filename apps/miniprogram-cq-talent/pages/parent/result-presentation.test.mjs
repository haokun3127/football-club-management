import {expect,it} from "vitest";
import {parentResultUnit,parentResultValue} from "./result-presentation";
it.each([["score","分"],["count","次"],["s","秒"],["min","分钟"],["m","米"],["%","%"]])("localizes the declared %s unit without inferring from a project name",(unit,label)=>{
 const result={name:"1分钟颠球次数",value:{kind:"measurement",value:66,unit},unit};
 expect(parentResultValue(result)).toBe(`66 ${label}`);expect(parentResultUnit(result).known).toBe(true);
});
it("uses value-type semantics only when no explicit unit exists and preserves zero and decimals",()=>{
 expect(parentResultValue({value:{kind:"count",count:0},unit:null})).toBe("0 次");
 expect(parentResultValue({value:{kind:"measurement",value:4.2801,unit:"s"},unit:null})).toBe("4.2801 秒");
 expect(parentResultValue({value:{kind:"text",text:"优秀"},unit:null})).toBe("优秀");
});
it("marks unknown and missing units pending and never replaces an explicit unknown with an inferred unit",()=>{
 expect(parentResultValue({value:{kind:"count",count:0},unit:"unknown-code"})).toBe("0（单位待确认）");
 expect(parentResultValue({value:{kind:"measurement",value:66},unit:null})).toBe("66（单位待确认）");
 expect(parentResultUnit({value:{kind:"measurement",value:66},unit:"unknown-code"})).toMatchObject({known:false,raw:"unknown-code"});
});

it.each(["constructor","__proto__"])("does not treat the unknown unit %s as a known label",unit=>{expect(parentResultUnit({value:{kind:"measurement",value:1},unit}).known).toBe(false);});
