export interface Chart {setOption(option:unknown,replace?:boolean):void;dispose():void;resize(options?:{width:number;height:number}):void;}
export function init(canvas:unknown,theme:unknown,options:{width:number;height:number;devicePixelRatio:number}):Chart;
