import { currentLocalDate, shiftCalendarDate, shiftCalendarMonth } from "../../utils/date";
import { CALENDAR_WEEKDAYS, calendarDays, calendarGridHeight } from "../../utils/schedule-calendar";
import type { ScheduleEvent } from "../../utils/types";

type TouchPoint = { clientX: number; clientY: number };
const touches = new WeakMap<object, TouchPoint>();
const expandedStates = new WeakMap<object, boolean>();
const scrollAnchors = new WeakMap<object, number>();
Component({
  properties: { date: {type:String, value:""}, events:{type:Array, value:[]}, expanded:{type:Boolean,value:false}, topInset:{type:Number,value:88} },
  data: { days: [] as ReturnType<typeof calendarDays>, weekdays: CALENDAR_WEEKDAYS, monthLabel:"", gridHeight:48 },
  observers: { "date, events, expanded, topInset"() { this.rebuild(); } },
  lifetimes: { attached() { this.rebuild(); }, detached() { touches.delete(this); expandedStates.delete(this); scrollAnchors.delete(this); } },
  methods: {
    rebuild() {
      const date = this.data.date || currentLocalDate();
      const days = calendarDays(date, this.data.expanded, this.data.events as ScheduleEvent[]);
      const window = wx.getWindowInfo();
      const safeBottom = window.screenHeight - (window.safeArea?.bottom ?? window.screenHeight);
      const available = window.windowHeight - this.data.topInset - 56 - safeBottom;
      const wasExpanded = expandedStates.get(this) ?? false;
      expandedStates.set(this,this.data.expanded);
      this.setData({days, monthLabel:`${date.slice(0,4)}年${Number(date.slice(5,7))}月`, gridHeight:this.data.expanded ? calendarGridHeight(days.length,available) : 48}, () => {
        if(this.data.expanded && !wasExpanded) wx.nextTick(() => this.keepControlsVisible());
        if(!this.data.expanded && wasExpanded) {
          const anchor=scrollAnchors.get(this); scrollAnchors.delete(this);
          if(anchor !== undefined) wx.pageScrollTo({scrollTop:anchor,duration:0});
        }
      });
    },
    keepControlsVisible() {
      this.createSelectorQuery().select(".calendar").boundingClientRect().selectViewport().scrollOffset().exec((result) => {
        const rect=result[0] as WechatMiniprogram.BoundingClientRectCallbackResult | null;
        const scroll=result[1] as {scrollTop:number} | null;
        if(!rect || !scroll) return;
        const window=wx.getWindowInfo();
        const bottom=window.windowHeight - 56 - (window.screenHeight - (window.safeArea?.bottom ?? window.screenHeight));
        const overflow=rect.bottom-bottom;
        if(overflow>0 && rect.top>this.data.topInset) {
          scrollAnchors.set(this,scroll.scrollTop);
          wx.pageScrollTo({scrollTop:scroll.scrollTop+Math.min(overflow,rect.top-this.data.topInset),duration:0});
        }
      });
    },
    toggle() { this.triggerEvent("viewchange", {expanded:!this.data.expanded}); },
    choose(event: {currentTarget:{dataset:{date:string}}}) { this.triggerEvent("change",{date:event.currentTarget.dataset.date}); },
    today() { this.triggerEvent("change",{date:currentLocalDate()}); },
    shift(event: {currentTarget:{dataset:{offset:string | number}}}) {
      const offset = Number(event.currentTarget.dataset.offset);
      if (offset !== -1 && offset !== 1) return;
      this.move(offset);
    },
    move(offset: number) {
      const date = this.data.date || currentLocalDate();
      this.triggerEvent("change",{date:this.data.expanded ? shiftCalendarMonth(date,offset) : shiftCalendarDate(date,offset*7)});
    },
    touchStart(event:{touches:TouchPoint[]}) { if(event.touches[0]) touches.set(this,event.touches[0]); },
    touchEnd(event:{changedTouches:TouchPoint[]}) {
      const start=touches.get(this); const end=event.changedTouches[0]; touches.delete(this);
      if(!start || !end) return;
      const dx=end.clientX-start.clientX, dy=end.clientY-start.clientY;
      if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5) this.move(dx<0 ? 1 : -1);
    },
  },
});
