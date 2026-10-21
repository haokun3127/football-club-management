import { currentLocalDate } from "../../utils/date";
Component({
  properties: { value:{type:String,value:""},mode:{type:String,value:"date"},disabled:{type:Boolean,value:false},start:{type:String,value:""},end:{type:String,value:""} },
  data: {pickerValue:"",visible:false,pickerMode:"date" as string | string[],format:"YYYY-MM-DD",boundaryStart:"1900-01-01 00:00:00",boundaryEnd:"2100-12-31 23:59:59"},
  observers:{"mode, start, end, value"(){this.configure();}},
  lifetimes:{attached(){this.configure();}},
  methods:{
    configure(){
      const time=this.data.mode === "time";
      this.setData({pickerValue:this.data.value || (time ? new Date(Date.now()+8*3600000).toISOString().slice(11,16) : currentLocalDate()),pickerMode:time ? ["hour","minute"] : "date",format:time ? "HH:mm" : "YYYY-MM-DD",
        boundaryStart:time ? `2000-01-01 ${this.data.start || "00:00"}:00` : `${this.data.start || "1900-01-01"} 00:00:00`,
        boundaryEnd:time ? `2000-01-01 ${this.data.end || "23:59"}:59` : `${this.data.end || "2100-12-31"} 23:59:59`});
    },
    open(){if(!this.data.disabled)this.setData({visible:true});},
    close(){this.setData({visible:false});},
    confirm(event:{detail:{value:string}}){
      if(this.data.disabled){this.close();return;}
      this.setData({visible:false});this.triggerEvent("change",{value:event.detail.value});
    },
  },
});
