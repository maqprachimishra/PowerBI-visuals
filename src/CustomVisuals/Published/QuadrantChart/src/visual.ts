/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ''Software''), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */
module powerbi.extensibility.visual {
    import IColorPalette = powerbi.extensibility.IColorPalette;
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    const legendValues: {} = {};
    const legendValuesTorender: {} = {};
    import ILegend = powerbi.extensibility.utils.chart.legend.ILegend;
    import LegendData = powerbi.extensibility.utils.chart.legend.LegendData;
    import createLegend = powerbi.extensibility.utils.chart.legend.createLegend;
    import legend = powerbi.extensibility.utils.chart.legend;
    import LegendPosition = powerbi.extensibility.utils.chart.legend.LegendPosition;
    import LegendIcon = powerbi.extensibility.utils.chart.legend.LegendIcon;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;
    import appendClearCatcher = powerbi.extensibility.utils.interactivity.appendClearCatcher;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;
    import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;

    let series: any[] = [];
    let THIS : any ;
    interface IQuadrantChartViewModel {
        legendData: LegendData;
        dataPoints: IQuadrantChartDataPoint[];
    }

    interface IQuadrantChartDataPoint extends SelectableDataPoint {
        category: string;
        color: string;
        identity: any;
    }

    function findLegend(array: any, n: number, x: any): number {
        let i: number;
        for (i = 0; i < n; i++) {
            if (array[i].name === x) {
                return i;
            }
        }

        return -1;
    }

    function visualTransform(options: VisualUpdateOptions, host: IVisualHost, context: any): IQuadrantChartViewModel {
        if (!options.dataViews) {
            return;
        }
        if (!options.dataViews[0]) {
            return;
        }
        if (!options.dataViews[0].categorical) {
            return;
        }
        const dataViews: DataView = options.dataViews[0];
        const categorical: DataViewCategorical = options.dataViews[0].categorical;
        let category: any;
        if (categorical.categories) {
            category = categorical.categories[0];
        } else {
            category = categorical.values[0];
        }
        const quadrantChartDataPoints: IQuadrantChartDataPoint[] = [];
        const colorPalette: IColorPalette = host.colorPalette;
        const objects: DataView = options.dataViews[0];
        for (let iIterator: number = 0; iIterator < series.length; iIterator++) {
            const defaultColor: Fill = {
                solid: {
                    color: colorPalette.getColor(series[iIterator].name).value
                }
            };

            if (categorical.values[0].values[iIterator] !== null && categorical.values[1].values[iIterator] !== null) {
                quadrantChartDataPoints.push({
                    category: series[iIterator].name,
                    color: getCategoricalObjectValue<Fill>(category, iIterator, 'legendColors', 'legendColor', defaultColor).solid.color,
                    identity: host.createSelectionIdBuilder().withCategory(category, iIterator).createSelectionId(),
                    selected: false
                });
            }
        }

        return {
            legendData: context.getLegendData(dataViews, quadrantChartDataPoints, host),
            dataPoints: quadrantChartDataPoints
        };
    }

    export class Visual implements IVisual {
       
        private bubbleChartWithAxis: any;
        public host: IVisualHost;
        private svg: d3.Selection<SVGElement>;
       
        private settings: any;
       
        public dataView: any;
        private quadrantChartPoints: IQuadrantChartDataPoint[];
        // workaround temp variable because the PBI SDK doesn't correctly identify style changes. See getSettings method.
        private prevDataViewObjects: {} = {};
        private selectionManager: ISelectionManager;
        private legend: ILegend;
        private legendObjectProperties: DataViewObject;
        public groupLegends: d3.Selection<SVGElement>;
       
        private currentViewport: IViewport;
       
        private rootElement: any;
        private interactivityService: IInteractivityService;
        private behavior: QuadrantBehavior;
        private eventService: IVisualEventService ;

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.eventService = options.host.eventService;
            this.selectionManager = options.host.createSelectionManager();
            this.interactivityService = createInteractivityService(options.host);
            this.behavior = new QuadrantBehavior();
            this.rootElement = d3.select(options.element);
            const svg: any = this.svg = this.rootElement.append('div').classed('container', true);
            svg.attr('id', 'container');
            const oElement = document.getElementsByTagName('div')[0];
            this.legend = createLegend(oElement, options.host && false, this.interactivityService, true);
            this.rootElement.select('.legend').style('top', 0);
            this.rootElement.select('.clearCatcher').remove();
        }

        public getLegendData(dataView: DataView, quadrantChartDataPoints: any, host: IVisualHost): LegendData {
            let sTitle: string = '';
            if (dataView && dataView.categorical && dataView.categorical.categories
                && dataView.categorical.categories[0] && dataView.categorical.categories[0].source) {
                sTitle = dataView.categorical.categories[0].source.displayName;
            }
            const legendData: LegendData = {
                fontSize: 8,
                dataPoints: [],
                title: sTitle
            };
            for (let iterator: number = 0, quadrantIterator: number = 0; iterator < dataView.categorical.categories[0].values.length
                && quadrantIterator < quadrantChartDataPoints.length; ++iterator) {
                if (dataView.categorical.values[0].values[iterator] !== null && dataView.categorical.values[1].values[iterator] !== null) {
                    legendData.dataPoints.push({
                        label: quadrantChartDataPoints[quadrantIterator].category,
                        color: quadrantChartDataPoints[quadrantIterator].color,
                        icon: powerbi.extensibility.utils.chart.legend.LegendIcon.Box,
                        selected: false,
                        identity: host.createSelectionIdBuilder().
                            withCategory(dataView.categorical.categories[0], iterator).createSelectionId()
                    });
                    legendValues[quadrantIterator] = quadrantChartDataPoints[quadrantIterator].category;
                    quadrantIterator++;
                }

            }

            return legendData;
        }
        public update(options: VisualUpdateOptions): void {
            try{
                this.eventService.renderingStarted(options);
                THIS = this;
                this.currentViewport = {
                    height: Math.max(0, options.viewport.height),
                    width: Math.max(0, options.viewport.width)
                };
                this.rootElement.select('.MAQChartsSvgRoot').remove();
                d3.select('.errorMessage').remove();
                d3.select('#legendGroup').selectAll('g').remove();
                const width: number = options.viewport.width;
                const height: number = options.viewport.height;
                this.svg.attr({
                    width: width,
                    height: height
                });
                //here call
                // data binding:start
                const assignData: number[] = this.dataBind(options);
                const dataViewObject: any = this.dataView.categorical;
                let isRadius: boolean = true,isLegends: boolean = true;
                if(!this.plotXAndY(assignData,width,height)){
                    return;}
                if(!this.checkValues(dataViewObject,assignData,width,height)){
                    return;
                }
                // check for all nulls in y-axis
                if(!this.checkNullability(dataViewObject,assignData,width,height)){
                    return;
                }
            if(-1===assignData[2]){
                isRadius=false;
            }else{
                    if(!this.nullCheckForRadius(dataViewObject,assignData,width,height)){
                        return;
                    }
            }
                if (-1 === assignData[3]) {
                    isLegends = false;
                } else {
                    if(!this.nullInLegendAxis(dataViewObject,assignData,width,height)){
                        return;
                    }
                }
                
                if(!this.dataAvailability(dataViewObject,assignData,width,height)){
                    return;
                }

                this.populateSeries(dataViewObject,options,assignData,isRadius);
                // data binding: end
                const viewModel: IQuadrantChartViewModel = visualTransform(options, this.host, THIS);

                if (!viewModel) {
                    return;
                }
                if (series.length <= 0) {
                    $('#container').removeAttr('style');
                    d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                    d3.select('svg')
                        .append('text')
                        .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                        .text('No data available');

                    return;
                }
                this.quadrantChartPoints = viewModel.dataPoints;
                const settingsChanged: boolean = this.getSettings(this.dataView.metadata.objects);
                // workaround because of sdk bug that doesn't notify when only style has changed
                this.interactivityService.applySelectionStateToData(this.quadrantChartPoints);
                this.renderLegend(viewModel);
                if (!this.bubbleChartWithAxis || settingsChanged
                    || ((options.type & VisualUpdateType.Resize) || options.type & VisualUpdateType.ResizeEnd)) {
                    this.svg.selectAll('*').remove();
                    this.bubbleChartWithAxis =
                        MAQDrawChart(this.dataView, this.settings, viewModel, series, assignData, valueFormatter, textMeasurementService);
                }
                this.addSelection(this.quadrantChartPoints);
                this.svg.on('contextmenu', () => {
                    const mouseEvent: MouseEvent = <MouseEvent>d3.event;
                    const eventTarget: EventTarget = mouseEvent.target;
                   
                    const dataPoint : any = d3.select(eventTarget).datum();
                    if (dataPoint !== undefined) {
                        this.selectionManager.showContextMenu(dataPoint ? dataPoint.identity : {}, {
                            x: mouseEvent.clientX,
                            y: mouseEvent.clientY
                        });
                        mouseEvent.preventDefault();
                    }
                });
                this.eventService.renderingFinished(options);
            }catch(exeption){
                this.eventService.renderingFailed(options, exeption);
            }
        }

        //starts data binding
        private dataBind(options: VisualUpdateOptions) : number[]{
            // Grab the dataview object
            if (!options.dataViews || 0 === options.dataViews.length || !options.dataViews[0].categorical) {
                return;
            }
            this.dataView = options.dataViews[0];

            // data binding:start
            let assignData: number[] = [-1, -1, -1, -1];
            let iCounter: number;
            for (iCounter = 0; iCounter < this.dataView.categorical.values.length; iCounter++) {
                if (this.dataView.categorical.values[iCounter].source.roles.xAxis) {
                    assignData[0] = iCounter;
                } else if (this.dataView.categorical.values[iCounter].source.roles.yAxis) {
                    assignData[1] = iCounter;
                } else if (this.dataView.categorical.values[iCounter].source.roles.radialAxis) {
                    assignData[2] = iCounter;
                }
            }
            if (this.dataView.categorical.categories !== undefined) {
                assignData[3] = 0;
            }
            return assignData;
        }

        //plots x and y axis
        private plotXAndY(assignData: number[],width:number,height:number):boolean{

            if (-1 === assignData[0] || -1 === assignData[1]) {
                this.rootElement.select('.legend #legendGroup').selectAll('*').style('visibility', 'hidden');
                $('#container').removeAttr('style');
                d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                d3.select('svg')
                    .append('text')
                    .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                    .text('Please select both x-axis and y-axis values');

                return false;
            } else {
                this.rootElement.selectAll('.legend #legendGroup').selectAll('*').style('visibility', 'visible');
                $('#container').removeAttr('style');
                return true;
            }

        }

        //checks for nullability of the column
        //checks and vacant visual if negative values are present in the column
        private checkValues(dataViewObject:any,assignData:number[],width:number,height:number):boolean{
            let loopctr1: number = 0,loopctr2: number = 0,iColLength: number,loopctr: number = 0;
            iColLength = dataViewObject.values[assignData[0]].values.length;
            while (loopctr1 < iColLength) {
                if (dataViewObject.values[assignData[0]].values[loopctr1] !== null) {
                    break;
                }
                loopctr1++;
            }
            while (loopctr2 < iColLength) {
                if (dataViewObject.values[assignData[0]].values[loopctr2] !== '') {
                    break;
                }
                loopctr2++;
            }
            if (loopctr1 === iColLength || loopctr2 === iColLength) {
                $('#container').removeAttr('style');
                d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                d3.select('svg')
                    .append('text')
                    .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                    .text('Only null values present for X axis');

                return false;
            }
            // vacant the visual if x-axis contains negative values.
            loopctr = 0;
            while (loopctr < iColLength && (dataViewObject.values[assignData[0]].values[loopctr] === null
                || dataViewObject.values[assignData[0]].values[loopctr] === ''
                || (typeof (dataViewObject.values[assignData[0]].values[loopctr]) === 'number'
                    && (dataViewObject.values[assignData[0]].values[loopctr] >= 0)))) {

                loopctr++;
            }

            if (loopctr !== iColLength) {
                $('#container').removeAttr('style');
                d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                d3.select('svg')
                    .append('text')
                    .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                    .text('Data not supported');

                return false;
            }
            return true;

        }

        //checks all the null values in y axis
        // checks and vacant the visual if y axis contains negativ values
        private checkNullability(dataViewObject:any,assignData:number[],width:number,height:number):boolean{
            let loopctr1: number = 0,loopctr2: number = 0,iColLength: number,loopctr: number = 0;

            loopctr1 = 0, loopctr2 = 0;
            iColLength = dataViewObject.values[assignData[1]].values.length;
            while (loopctr1 < iColLength) {
                if (dataViewObject.values[assignData[1]].values[loopctr1] !== null) {
                    break;
                }
                loopctr1++;
            }
            while (loopctr2 < iColLength) {
                if (dataViewObject.values[assignData[1]].values[loopctr2] !== '') {
                    break;
                }
                loopctr2++;
            }
            if (loopctr1 === iColLength || loopctr2 === iColLength) {
                $('#container').removeAttr('style');
                d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                d3.select('svg')
                    .append('text')
                    .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                    .text('Only null values present for Y axis');

                return false;
            }

            // vacant the visual if y-axis contains negative values.
            loopctr = 0;
            while (loopctr < iColLength && (dataViewObject.values[assignData[1]].values[loopctr] === null
                || dataViewObject.values[assignData[1]].values[loopctr] === ''
                || (typeof (dataViewObject.values[assignData[1]].values[loopctr]) === 'number'
                    && (dataViewObject.values[assignData[1]].values[loopctr] >= 0)))) {
                loopctr++;
            }
            if (loopctr !== iColLength) {
                $('#container').removeAttr('style');
                d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                d3.select('svg')
                    .append('text')
                    .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                    .text('Data not supported');

                return false;
            }
            return true;
        }

        // if we have radius axis, check for negative numbers, or all nulls
        // check for all null
        private nullCheckForRadius(dataViewObject:any,assignData:number[],width:number,height:number):boolean{
            let loopctr1: number = 0,loopctr2: number = 0,iColLength: number,loopctr: number = 0;

            // if we have radius axis, check for negative numbers, or all nulls
            // check for all null
            loopctr1 = 0, loopctr2 = 0;
            iColLength = dataViewObject.values[assignData[2]].values.length;
            while (loopctr1 < iColLength) {
                if (dataViewObject.values[assignData[2]].values[loopctr1] !== null) {
                    break;
                }
                loopctr1++;
            }
            while (loopctr2 < iColLength) {
                if (dataViewObject.values[assignData[2]].values[loopctr2] !== '') {
                    break;
                }
                loopctr2++;
            }
            if (loopctr1 === iColLength || loopctr2 === iColLength) {
                $('#container').removeAttr('style');
                d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                d3.select('svg')
                    .append('text')
                    .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                    .text('Only null values present for Radius axis');

                return false;
            }
            // check for negative numbers
            loopctr = 0;
            while (loopctr < iColLength && (dataViewObject.values[assignData[2]].values[loopctr] === ''
                || dataViewObject.values[assignData[2]].values[loopctr] === null
                || (typeof (dataViewObject.values[assignData[2]].values[loopctr]) === 'number'
                    && (dataViewObject.values[assignData[2]].values[loopctr] >= 0)))) {
                loopctr++;
            }
            if (loopctr !== iColLength) {
                $('#container').removeAttr('style');
                d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                d3.select('svg')
                    .append('text')
                    .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                    .text('Data not supported');

                return false;
            }
            return true;
          
        }

        // check for all nulls in legend-axis
        private nullInLegendAxis(dataViewObject :any,assignData:number[],width:number,height:number):boolean{

            let loopctr1: number = 0,loopctr2: number = 0,iColLength: number,loopctr: number = 0;
            // check for all nulls in legend-axis
            loopctr1 = 0, loopctr2 = 0;
            iColLength = dataViewObject.categories[assignData[3]].values.length;
            while (loopctr1 < iColLength) {
                if (dataViewObject.categories[assignData[3]].values[loopctr1] !== null) {
                    break;
                }
                loopctr1++;
            }
            while (loopctr2 < iColLength) {
                if (dataViewObject.categories[assignData[3]].values[loopctr2] !== '') {
                    break;
                }
                loopctr2++;
            }
            if (loopctr1 === iColLength || loopctr2 === iColLength) {
                $('#container').removeAttr('style');
                d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                d3.select('svg')
                    .append('text')
                    .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                    .text('Only null values present for Legend axis');

                return false;
            }

            return true;
        }

        //check for data availability
        private dataAvailability(dataViewObject:any,assignData:number[],width:number,height:number){

            let loopctr:number = 0,skipFlag:number=0;
           
            const length1: any = dataViewObject.values[assignData[0]].values.length; skipFlag = 0;
            while (loopctr < length1) {
                if (dataViewObject.values[assignData[0]].values[loopctr] === null
                    || dataViewObject.values[assignData[0]].values[loopctr] === ''
                    || dataViewObject.values[assignData[1]].values[loopctr] === null
                    || dataViewObject.values[assignData[1]].values[loopctr] === ''
                    || (assignData[2] !== -1
                        && (dataViewObject.values[assignData[2]].values[loopctr] === null
                            || dataViewObject.values[assignData[2]].values[loopctr] === ''))
                    || (assignData[3] !== -1
                        && (dataViewObject.categories[assignData[3]].values[loopctr] === null
                            || dataViewObject.categories[assignData[3]].values[loopctr] === ''))) {
                    skipFlag++;
                }
                loopctr++;
            }
            if (skipFlag === length1) {
                $('#container').removeAttr('style');
                d3.select('#container').append('svg').classed('errorMessage', true).attr({ width: width, height: height });
                d3.select('svg')
                    .append('text')
                    .attr({ x: width / 2, y: height / 2, 'font-size': '20px', 'text-anchor': 'middle' })
                    .text('No data available');

                return false;
            }
            return true;

        }

        //populat the series array with data
        private populateSeries(dataViewObject:any,options: VisualUpdateOptions,assignData:number[],isRadius:boolean):void{
            series = [];
            let jCounter:number=0,legendNumbers:number=0,isLegends:boolean=true;
            for (jCounter = 0; jCounter < dataViewObject.values[0].values.length; jCounter++) {
                const objSeries: {
                    'name': string;
                    'data': {
                       
                        'scaleX': any[];
                       
                        'scaleY': any[];
                       
                        'radius': any[];
                    };
                } = {
                    name: '',
                    data: {
                        scaleX: [],
                        scaleY: [],
                        radius: []
                    }
                };
                let legendIndex: number;
                if (options.dataViews[0].categorical.categories !== undefined) {
                    if (dataViewObject.categories[0].values[jCounter] !== null && dataViewObject.categories[0].values[jCounter] !== '') {

                        legendIndex = findLegend(series, legendNumbers,
                                                 (isLegends ? dataViewObject.categories[0].values[jCounter] : 'NA'));

                        if (legendIndex === -1) {
                            objSeries.name = (isLegends ? dataViewObject.categories[0].values[jCounter] : 'NA');
                            series[legendNumbers] = objSeries;
                            legendIndex = legendNumbers;
                            legendNumbers++;
                        }
                        series[legendIndex].data.scaleX.push(dataViewObject.values[assignData[0]].values[jCounter]);
                        series[legendIndex].data.scaleY.push(dataViewObject.values[assignData[1]].values[jCounter]);
                        series[legendIndex].data.radius.push((isRadius ? dataViewObject.values[assignData[2]].values[jCounter] : 4));
                    }
                } else {
                    legendIndex = findLegend(series, legendNumbers, (isLegends ? dataViewObject.categories[0].values[jCounter] : 'NA'));

                    if (legendIndex === -1) {
                        objSeries.name = (isLegends ? dataViewObject.categories[0].values[jCounter] : 'NA');
                        series[legendNumbers] = objSeries;
                        legendIndex = legendNumbers;
                        legendNumbers++;
                    }
                    series[legendIndex].data.scaleX.push(dataViewObject.values[assignData[0]].values[jCounter]);
                    series[legendIndex].data.scaleY.push(dataViewObject.values[assignData[1]].values[jCounter]);
                    series[legendIndex].data.radius.push((isRadius ? dataViewObject.values[assignData[2]].values[jCounter] : 4));

                }
            }
        }

       
        private addSelection(dataPoints: any): void {
            const behaviorOptions: IQuadrantBehaviorOptions = {
                clearCatcher: d3.selectAll('svg').data(dataPoints),
                bubbleSelection: d3.selectAll('svg .MAQCharts-plotArea circle').data(dataPoints),
                legendSelection: d3.selectAll('.legendItem'),
                interactivityService: this.interactivityService
            };
            this.interactivityService.bind(
                this.quadrantChartPoints,
                this.behavior,
                behaviorOptions,
                {
                });
        }
        private renderLegend(viewModel: IQuadrantChartViewModel): void {

            if (!viewModel || !viewModel.legendData) {
                return;
            }
            if (this.dataView && this.dataView.metadata) {
                this.legendObjectProperties = powerbi.extensibility.utils.dataview.DataViewObjects
                    .getObject(this.dataView.metadata.objects, 'legend', {});
            }
            const legendData: LegendData = viewModel.legendData;
            const legendDataTorender: LegendData = {
                fontSize: 8,
                dataPoints: [],
                title: legendData.title
            };
            for (let j: number = 0; j < legendData.dataPoints.length; j++) {

                legendDataTorender.dataPoints.push({
                    label: legendData.dataPoints[j].label,
                    color: legendData.dataPoints[j].color,
                    icon: powerbi.extensibility.utils.chart.legend.LegendIcon.Box,
                    selected: false,
                    identity: legendData.dataPoints[j].identity
                });
                legendValuesTorender[j] = legendValues[j];
            }
            if (this.legendObjectProperties) {
                powerbi.extensibility.utils.chart.legend.data.update(legendDataTorender, this.legendObjectProperties);
                const position: string = <string>this.legendObjectProperties[powerbi.extensibility.utils.chart.legend.legendProps.position];
                if (position) {
                    this.legend.changeOrientation(LegendPosition[position]);
                }
            }
            this.legend.drawLegend(legendDataTorender, _.clone(this.currentViewport));
            powerbi.extensibility.utils.chart.legend.positionChartArea(this.svg, this.legend);
           
            $('.legend #legendGroup').on('click.load', '.navArrow',  (): any=> {
                THIS.addSelection(THIS.quadrantChartPoints);
              });

        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            const objectName: string = options.objectName;
            const objectEnumeration: VisualObjectInstance[] = [];
            switch (objectName) {
                case 'legendColors':
                    for (const quadrantChartPoint of this.quadrantChartPoints) {
                        objectEnumeration.push({
                            objectName: objectName,
                            displayName: quadrantChartPoint.category,
                            properties: {
                                legendColor: {
                                    solid: {
                                        color: quadrantChartPoint.color
                                    }
                                }
                            },
                            selector: quadrantChartPoint.identity.getSelector()
                        });
                    }
                    break;
                case 'legend':
                    objectEnumeration.push({
                        objectName: 'legend',
                        displayName: 'Legend',
                        selector: null,
                        properties: {
                            show: this.settings.showLegend,
                            position: LegendPosition[this.legend.getOrientation()],
                            showTitle: powerbi.extensibility.utils.dataview.DataViewObject
                                .getValue(this.legendObjectProperties, powerbi.extensibility.utils.chart.legend.legendProps.showTitle, true),
                            labelColor: powerbi.extensibility.utils.dataview.DataViewObject
                                .getValue(this.legendObjectProperties,
                                          powerbi.extensibility.utils.chart.legend.legendProps.labelColor, null),
                            fontSize: powerbi.extensibility.utils.dataview.DataViewObject
                                .getValue(this.legendObjectProperties, powerbi.extensibility.utils.chart.legend.legendProps.fontSize, 8)
                        }
                    });
                    break;
                case 'quadrantNames':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            show: this.settings.showQuadrants,
                            quadrant1: this.settings.quadrant1,
                            quadrant2: this.settings.quadrant2,
                            quadrant3: this.settings.quadrant3,
                            quadrant4: this.settings.quadrant4,
                            quadrantDivisionX: this.settings.quadrantDivisionX,
                            quadrantDivisionY: this.settings.quadrantDivisionY,
                            type: this.settings.type
                        },
                        selector: null
                    });
                    break;
                case 'xAxis':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            show: this.settings.showxAxis,
                            start: this.settings.startxAxis,
                            end: this.settings.endxAxis,
                            interval: this.settings.intervalxAxis,
                            titleEnable: this.settings.showxAxisTitle,
                            titleText: this.settings.xTitleText,
                            label: this.settings.showxAxisLabel,
                            displayUnits: this.settings.xDisplayUnits,
                            textPrecision: this.settings.xTextPrecision
                        },
                        selector: null
                    });
                    break;
                case 'yAxis':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            show: this.settings.showyAxis,
                            start: this.settings.startyAxis,
                            end: this.settings.endyAxis,
                            interval: this.settings.intervalyAxis,
                            titleEnable: this.settings.showyAxisTitle,
                            titleText: this.settings.yTitleText,
                            label: this.settings.showyAxisLabel,
                            displayUnits: this.settings.yDisplayUnits,
                            textPrecision: this.settings.yTextPrecision
                        },
                        selector: null
                    });
                    break;
                default:
            }

            return objectEnumeration;
        }

        private getSettings(objects: DataViewObjects): boolean {
            let settingsChanged: boolean = false;
            let assignZero : number = 0;
            let limitPrecision: number = 4;
            let lowerLimitIntervalAxis: number = 15;
            let modOne = 1;
            let greaterLimitInterval = 1;
            if (typeof this.settings === undefined || (JSON.stringify(objects) !== JSON.stringify(this.prevDataViewObjects))) {
                this.settings = {
                    // Quadrant
                    showLegend: getValue<boolean>(objects, 'legend', 'show', true),
                    showQuadrants: getValue<boolean>(objects, 'quadrantNames', 'show', true),
                    type: getValue<boolean>(objects, 'quadrantNames', 'type', false),
                    quadrant1: getValue<string>(objects, 'quadrantNames', 'quadrant1', 'Quadrant1'),
                    quadrant2: getValue<string>(objects, 'quadrantNames', 'quadrant2', 'Quadrant2'),
                    quadrant3: getValue<string>(objects, 'quadrantNames', 'quadrant3', 'Quadrant3'),
                    quadrant4: getValue<string>(objects, 'quadrantNames', 'quadrant4', 'Quadrant4'),
                    // X-Axis and Y-Axis
                    showxAxis: getValue<boolean>(objects, 'xAxis', 'show', true),
                    showyAxis: getValue<boolean>(objects, 'yAxis', 'show', true),
                    startxAxis: getValue<number>(objects, 'xAxis', 'start', null),
                    startyAxis: getValue<number>(objects, 'yAxis', 'start', null),
                    endxAxis: getValue<number>(objects, 'xAxis', 'end', null),
                    endyAxis: getValue<number>(objects, 'yAxis', 'end', null),

                    intervalxAxis: (getValue<number>(objects, 'xAxis', 'interval', null) < greaterLimitInterval
                        &&
                        getValue<number>(objects, 'xAxis', 'interval', null) !== null)
                        ? 1
                        : getValue<number>(objects, 'xAxis', 'interval', null) > lowerLimitIntervalAxis ? lowerLimitIntervalAxis
                            : getValue<number>(objects, 'xAxis', 'interval', null),
                    intervalyAxis: (getValue<number>(objects, 'yAxis', 'interval', null) < greaterLimitInterval
                        &&
                        getValue<number>(objects, 'yAxis', 'interval', null) !== null) ? greaterLimitInterval
                        : getValue<number>(objects, 'yAxis', 'interval', null) > lowerLimitIntervalAxis ? lowerLimitIntervalAxis
                            : getValue<number>(objects, 'yAxis', 'interval', null),

                    showxAxisTitle: getValue<boolean>(objects, 'xAxis', 'titleEnable', true),
                    showyAxisTitle: getValue<boolean>(objects, 'yAxis', 'titleEnable', true),
                    showxAxisLabel: getValue<boolean>(objects, 'xAxis', 'label', true),
                    showyAxisLabel: getValue<boolean>(objects, 'yAxis', 'label', true),
                    xTitleText: getValue<string>(objects, 'xAxis', 'titleText', 'X'),
                    yTitleText: getValue<string>(objects, 'yAxis', 'titleText', 'Y'),
                    xDisplayUnits: getValue<number>(objects, 'xAxis', 'displayUnits', assignZero),
                    yDisplayUnits: getValue<number>(objects, 'yAxis', 'displayUnits', assignZero),
                    xTextPrecision: getValue<number>(objects, 'xAxis', 'textPrecision', assignZero) < assignZero ? assignZero
                        : getValue<number>(objects, 'xAxis', 'textPrecision', assignZero) > limitPrecision ? limitPrecision
                            : getValue<number>(objects, 'xAxis', 'textPrecision', assignZero) % modOne !== assignZero?
                                getValue<number>(objects, 'xAxis', 'textPrecision', assignZero)
                                - getValue<number>(objects, 'xAxis', 'textPrecision', assignZero) % modOne
                                : getValue<number>(objects, 'xAxis', 'textPrecision', assignZero),
                    yTextPrecision: getValue<number>(objects, 'yAxis', 'textPrecision', assignZero) < assignZero ? assignZero
                        : getValue<number>(objects, 'yAxis', 'textPrecision', assignZero) > limitPrecision ? limitPrecision
                            : getValue<number>(objects, 'yAxis', 'textPrecision', assignZero) % modOne !==assignZero ?
                                getValue<number>(objects, 'yAxis', 'textPrecision', assignZero)
                                - getValue<number>(objects, 'yAxis', 'textPrecision', assignZero) % modOne
                                : getValue<number>(objects, 'yAxis', 'textPrecision', assignZero),
                    // Quadrant division lines
                    quadrantDivisionX: getValue<number>(objects, 'quadrantNames', 'quadrantDivisionX', -1),
                    quadrantDivisionY: getValue<number>(objects, 'quadrantNames', 'quadrantDivisionY', -1)
                };
                settingsChanged = true;
            }
            this.prevDataViewObjects = objects;

            return settingsChanged;
        }
    }
    interface IQuadrantBehaviorOptions {
       
        clearCatcher: any;
       
        bubbleSelection: any;
       
        legendSelection: any;
        interactivityService: IInteractivityService;
    }
    class QuadrantBehavior implements IInteractiveBehavior {
        private options: IQuadrantBehaviorOptions;
        public bindEvents(options: IQuadrantBehaviorOptions, selectionHandler: ISelectionHandler): void {
            this.options = options;
           
            const clearCatcher: any = options.clearCatcher;
            const interactivityService: IInteractivityService = options.interactivityService;
            options.bubbleSelection.on('click', (d: SelectableDataPoint) => {
                selectionHandler.handleSelection(d, false);
                (<Event>d3.event).stopPropagation();
            });
            clearCatcher.on('click', () => {
                selectionHandler.handleClearSelection();
            });
            options.legendSelection.on('click', (d: SelectableDataPoint) => {
                selectionHandler.handleSelection(d, false);
                (<Event>d3.event).stopPropagation();
            });
            this.renderSelection(interactivityService.hasSelection());
        }
       
        public renderSelection(hasSelection: boolean): any {
            this.options.bubbleSelection.style('opacity', (d: SelectableDataPoint) => {
                return (hasSelection && !d.selected) ? 0.5 : 1;
            });
            this.options.legendSelection.style('opacity', (d: SelectableDataPoint) => {
                return (hasSelection && !d.selected) ? 0.5 : 1;
            });
        }
    }
}
