import {use,init,registerPreprocessor,setPlatformAPI} from "echarts/core";
import {RadarChart} from "echarts/charts";
import {RadarComponent} from "echarts/components";
import {CanvasRenderer} from "echarts/renderers";
use([RadarChart,RadarComponent,CanvasRenderer]);
export {init,registerPreprocessor,setPlatformAPI};
