module powerbi.extensibility.visual {
    import IVisual = powerbi.extensibility.visual.IVisual;
    import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
    import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

    import ISelectionManager = powerbi.extensibility.ISelectionManager;
    import ClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.ClassAndSelector;
    import createClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.createClassAndSelector;
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;
    import ILegend = powerbi.extensibility.utils.chart.legend.ILegend;
    import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;
    import ISelectionId = powerbi.visuals.ISelectionId;
    import IColorPalette = powerbi.extensibility.IColorPalette;
    import IDataLabelSettings = powerbi.extensibility.utils.chart.dataLabel.IDataLabelSettings;
    import VisualDataLabelsSettings = powerbi.extensibility.utils.chart.dataLabel.VisualDataLabelsSettings;
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import DataViewObjects = powerbi.extensibility.utils.dataview.DataViewObjects;
    import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import tooltip = powerbi.extensibility.utils.tooltip;
    import utils = powerbi.extensibility.utils.chart.dataLabel.utils;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;

    export interface TooltipEventArgs<TData> {
        data: TData;
        coordinates: number[];
        elementCoordinates: number[];
        context: HTMLElement;
        isTouchEvent: boolean;
    }
    
    export let bowtieProps: any = {
        general: {
            ArcFillColor: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'ArcFillColor' }
        },
        show: { objectName: 'GMODonutTitle', propertyName: 'show' },
        titleText: { objectName: 'GMODonutTitle', propertyName: 'titleText' },
        titleFill: { objectName: 'GMODonutTitle', propertyName: 'fill1' },
        titleBackgroundColor: { objectName: 'GMODonutTitle', propertyName: 'backgroundColor' },
        titleFontSize: { objectName: 'GMODonutTitle', propertyName: 'fontSize' },
        tooltipText: { objectName: 'GMODonutTitle', propertyName: 'tooltipText' },
        labels: {
            color: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'color' },
            displayUnits: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'displayUnits' },
            textPrecision: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'textPrecision' },
            fontSize: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'fontSize' }
        },
        Aggregatelabels: {
            color: <DataViewObjectPropertyIdentifier>{ objectName: 'Aggregatelabels', propertyName: 'color' },
            displayUnits: <DataViewObjectPropertyIdentifier>{ objectName: 'Aggregatelabels', propertyName: 'displayUnits' },
            textPrecision: <DataViewObjectPropertyIdentifier>{ objectName: 'Aggregatelabels', propertyName: 'textPrecision' },
            fontSize: <DataViewObjectPropertyIdentifier>{ objectName: 'Aggregatelabels', propertyName: 'fontSize' },
            Indicator: <DataViewObjectPropertyIdentifier>{ objectName: 'Aggregatelabels', propertyName: 'Indicator' },
            signIndicator: <DataViewObjectPropertyIdentifier>{ objectName: 'Aggregatelabels', propertyName: 'signIndicator' },
            Threshold: <DataViewObjectPropertyIdentifier>{ objectName: 'Aggregatelabels', propertyName: 'Threshold' }
        }
    };

    interface ITooltipService {
        enabled(): boolean;
        show(options: TooltipShowOptions): void;
        move(options: TooltipMoveOptions): void;
        hide(options: TooltipHideOptions): void;
    }
    export interface ITooltipDataItem {
        displayName: string;
        value: string;
    }

    export interface IBowtieData {
        dataPoints: IBowtieDataPoint[];
        valueFormatter: IValueFormatter;
        legendObjectProps: DataViewObject;
        labelSettings: VisualDataLabelsSettings;
        AggregatelabelSettings: IAggregatelabelSettings;
        chartType: string;
        aggregatedSum: number;
        ArcFillColor: string;
    }

    export interface IBowtieDataPoint {
        color: string;
        DestCategoryLabel: string;
        SourceCategoryLabel: string;
        selector: ISelectionId;
        value: number;
        SourceArcWidth: number;
        DestCatArcWidth: number;
        srcValue: number;
        selectionId: ISelectionId[];
    }

    export interface IAggregatelabelSettings {
        color: string;
        displayUnits: number;
        textPrecision: number;
        Indicator: boolean;
        fontSize: number;
        Threshold: number;
        signIndicator: boolean;
    }
    export class BowtieChart implements IVisual {
        public host: IVisualHost;
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private svg: d3.Selection<SVGElement>;
        private bowtieMainContainer: d3.Selection<SVGElement>;
        private events: IVisualEventService;
        private bowtieChartAggregated: d3.Selection<SVGElement>;
        private bowtieChartDestination: d3.Selection<SVGElement>;
        private bowtieChartSVGDestination: d3.Selection<SVGElement>;
        private bowtieChartSVGSource: d3.Selection<SVGElement>;
        private bowtieChartSource: d3.Selection<SVGElement>;
        private bowtieChartError: d3.Selection<SVGElement>;
        private mainGroupElement: d3.Selection<SVGElement>;
        private bowtieChartHeadings: d3.Selection<SVGElement>;
        private centerText: d3.Selection<SVGElement>;
        private colors: IColorPalette;
        private dataView: DataView;
        private dataViews: DataView[];
        private legend: ILegend;
        private data: IBowtieData;
        private currentViewport: IViewport;
        private convertedData: IBowtieData;
        private metricName: string;
        private sourceName: string;
        private destinationName: string;
        private root: d3.Selection<SVGElement>;
        private titleSize: number = 12;
        private updateCount: number = 0;
        private prevIndicator: boolean = false;
        private isNegative: boolean = false;
        private formatString: string = '0';
        
        public thisObj: any;
        public flagliteral: number;
        public categoryLabel: string;
        public flag: boolean = true;
        public maxValNew: number;
        private percentageLiteral: string;
        private numberOfValues: number;
        private numberOfValuesHeight: number;
        private divisionHeight: number;
        private aggregatedValue: d3.Selection<SVGElement>;
        private fBranchHeight: number;
        private fBranchHeight1: number;
        private fStartY: number;
        private fEndX: number;
        private fEndY: number;
        private fCurveFactor: number;
        private textPropertiesForLabel: TextProperties;
        private category: string;
        private maxValue: number;
        private dataLength: number;
        private displayUnit: number;
        private aggregatedUnit: number;
        private selectionManager: ISelectionManager;
        private sum: number = 0;


        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
            this.root = d3.select(options.element);
            this.selectionManager = options.host.createSelectionManager();
            let container: d3.Selection<SVGElement>;
            this.events = options.host.eventService;
            container = this.bowtieMainContainer = d3.select(options.element)
                .append('div')
                .classed('BowtieMainContainer', true)
                .style('cursor', 'default');

            container
                .append('div')
                .classed('Title_Div_Text', true)
                .style({ width: '100%', display: 'inline-block' })
                .append('div')
                .classed('GMODonutTitleDiv', true)
                .style({ 'max-width': '80%', display: 'inline-block' })
                .append('span')
                .classed('GMODonutTitleIcon', true)
                .style({ width: '2%', display: 'none', cursor: 'pointer', 'white-space': 'pre' });

            let bowtieChartError: d3.Selection<SVGElement>;
            bowtieChartError = this.bowtieChartError = container
                .append('div')
                .classed('BowtieChartError', true);

            let bowtieChartHeadings: d3.Selection<SVGElement>;
            bowtieChartHeadings = this.bowtieChartHeadings = container
                .append('div')
                .classed('BowtieChartHeadings', true);

            let bowtieChartSource: d3.Selection<SVGElement>;
            bowtieChartSource = this.bowtieChartSource = container
                .append('div')
                .classed('BowtieChartSource', true);

            let bowtieChartSVGSource: d3.Selection<SVGElement>;
            bowtieChartSVGSource = this.bowtieChartSVGSource = container
                .append('div')
                .classed('BowtieChartSVGSource', true);

            let bowtieChartAggregated: d3.Selection<SVGElement>;
            bowtieChartAggregated = this.bowtieChartAggregated = container
                .append('div')
                .classed('BowtieChartAggregated', true);

            let bowtieChartSVGDestination: d3.Selection<SVGElement>;
            bowtieChartSVGDestination = this.bowtieChartSVGDestination = container
                .append('div')
                .classed('BowtieChartSVGDestination', true);

            let bowtieChartDestination: d3.Selection<SVGElement>;
            bowtieChartDestination = this.bowtieChartDestination = container
                .append('div')
                .classed('BowtieChartDestination', true);
        }

        private getDefaultBowtieData(): IBowtieData {
            return <IBowtieData>{
                dataPoints: [],
                legendObjectProps: {},
                valueFormatter: null,
                labelSettings: utils.getDefaultLabelSettings(),
                AggregatelabelSettings: this.getDefaultAggregateLabelSettings(),
                chartType: 'HalfBowtie',
                aggregatedSum: 0,
                ArcFillColor: '#0099FF'
            };
        }

        public getDefaultAggregateLabelSettings(): IAggregatelabelSettings {
            return {
                Indicator: false,
                color: 'black',
                displayUnits: 0,
                textPrecision: 0,
                fontSize: 9,
                Threshold: 0,
                signIndicator: false
            };
        }
        public assignValue(dataLength: number): number {
            let k: number;
            if (dataLength > 12) {
                k = 1e12;
            } else if (dataLength > 9 && dataLength <= 12) {
                k = 1e9;
            } else if (dataLength <= 9 && dataLength > 6) {
                k = 1e6;
            } else if (dataLength <= 6 && dataLength >= 4) {
                k = 1e3;
            } else {
                k = 10;
            }
            return k;
        }
        public selectOn(d: IBowtieDataPoint, i: number, selectionManager: ISelectionManager): void {
            selectionManager.select(d.selector).then((ids: ISelectionId[]) => {
                d3.selectAll('path').style('opacity', ids.length > 0 ? 0.5 : 1);
                d3.selectAll('span').style('opacity', ids.length > 0 ? 0.5 : 1);
                d3.selectAll(`.index${i}`).style('opacity', 1);
            });
            (<Event>d3.event).stopPropagation();
        }
        private updateDestCat(values: DataViewValueColumns, length: number, destCat: any, catDestValues: PrimitiveValue[], category: any) {
            for (let j: number = 0; j < length; j++) {
                let value: any = values[0].values[j];
                if (value < 0) {
                    this.isNegative = true;
                    destCat.check = true;
                    return;
                }
                let innerCat: PrimitiveValue = catDestValues[j];
                innerCat = (innerCat ? catDestValues[j] : '(Blank)');
                if (innerCat === category)
                    destCat.destCatSum += value;
            }
        }

        public halfChartloopFullChart(thisObjNew: any, convertedData: any, textPropertiesForLabel: any, svg: any, dataUpdate: any, numberOfValues: any, category: any, formatter: IValueFormatter,
            divisionHeight: number, fontSize: string, bowtieChartDestinationWidthPercentage: number, fEndX: number, fEndY: number, avaialableHeight: number, fStartX: number,
            fBranchHeight: number, fStartY: number, fCurveFactor: number) {
            for (let iDiv: number = 0; iDiv < numberOfValues; iDiv++) {
                category = convertedData.dataPoints[iDiv].DestCategoryLabel;
                let value: string = formatter.format(convertedData.dataPoints[iDiv].value);
                let oDiv: d3.Selection<SVGElement>;
                let spanDiv: d3.Selection<SVGElement>;
                oDiv = thisObjNew.bowtieChartDestination
                    .append('div').classed('alignment', true)
                    .style('line-height', PixelConverter.toString(divisionHeight))
                    .style('width', '50%').style('margin-right', '1%');
                let oDiv1: d3.Selection<SVGElement>;
                let spanDiv1: d3.Selection<SVGElement>;
                oDiv1 = thisObjNew.bowtieChartDestination
                    .append('div').classed('alignment', true)
                    .style('line-height', PixelConverter.toString(divisionHeight)).style('width', '30%');
                textPropertiesForLabel = {
                    text: convertedData.dataPoints[iDiv].DestCategoryLabel === ' ' ? '(Blank)' :
                        convertedData.dataPoints[iDiv].DestCategoryLabel,
                    fontFamily: 'Segoe UI',
                    fontSize: fontSize
                };
                let textPropertiesForValue: TextProperties;
                textPropertiesForValue = {
                    text: formatter.format(convertedData.dataPoints[iDiv].value),
                    fontFamily: 'Segoe UI',
                    fontSize: fontSize
                };
                thisObjNew.bowtieChartDestination.style('display', 'block');
                spanDiv = oDiv.append('span').classed(`index${iDiv}`, true)
                    .attr('title', convertedData.dataPoints[iDiv].DestCategoryLabel === ' ' ? '(Blank)' :
                        convertedData.dataPoints[iDiv].DestCategoryLabel)
                    .style('float', 'left').style('font-size', fontSize)
                    .style('color', convertedData.labelSettings.labelColor);
                spanDiv.append('text')
                    .classed('destinationSpan1', true).attr('id', 'SpanText')
                    .classed(`index${iDiv}`, true).text(textMeasurementService.getTailoredTextOrDefault(
                        textPropertiesForLabel, (thisObjNew.currentViewport.width * (bowtieChartDestinationWidthPercentage / 2 - 1)) / 100))
                    .style('cursor', 'pointer');
                spanDiv1 = oDiv1.append('span').classed(`index${iDiv}`, true).attr('title', formatter.format(convertedData.dataPoints[iDiv].value))
                    .style('float', 'left').style('font-size', fontSize).style('color', convertedData.labelSettings.labelColor);
                spanDiv1.append('text').classed('destinationSpan2', true).attr('id', 'SpanText1')
                    .classed(`index${iDiv}`, true).text(textMeasurementService.getTailoredTextOrDefault(
                        textPropertiesForValue, (thisObjNew.currentViewport.width *
                            (bowtieChartDestinationWidthPercentage / 2 - 1)) / 100)).style('cursor', 'pointer');
                let percentage: number;
                percentage = convertedData.dataPoints[iDiv].value / convertedData.aggregatedSum;
                fEndY = iDiv * (avaialableHeight / numberOfValues) + divisionHeight / 2;
                let fPipeArea: number;
                fPipeArea = Math.abs(fEndX - fStartX);
                let height: number;
                height = convertedData.dataPoints[iDiv].DestCatArcWidth * fBranchHeight > 1 ?
                    convertedData.dataPoints[iDiv].DestCatArcWidth * fBranchHeight : 1;
                fStartY += (height / 2);
                if (iDiv > 0) {
                    if ((convertedData.dataPoints[iDiv - 1].DestCatArcWidth * fBranchHeight) > 1) {
                        fStartY += ((convertedData.dataPoints[iDiv - 1].DestCatArcWidth * fBranchHeight) / 2);
                    } else {
                        fStartY += 0.5;
                    }
                }
                let d: string;
                d = 'M ';
                d += fStartX + ' ';
                d += fStartY + ' C ';
                d += (fStartX + (fPipeArea * fCurveFactor));
                d += ' ' + fStartY;
                d += ' ' + (fEndX - fPipeArea * fCurveFactor);
                d += ' ' + fEndY;
                d += ' ';
                d += fEndX;
                d += ' ';
                d += fEndY;
                let path: d3.Selection<SVGElement>;
                path = svg
                    .append('path')
                    .classed(`index${iDiv}`, true)
                    .classed('destination', true)
                    .attr('id', 'DestPath')
                    .attr('d', d)
                    .attr('stroke', dataUpdate.ArcFillColor)
                    .attr('fill', 'none')
                    .attr('stroke-width', height)
                    .style('cursor', 'pointer');
                let toolTipInfo: ITooltipDataItem[];
                toolTipInfo = [];
                toolTipInfo.push({ displayName: category, value: value });
                path[0][0]['cust-tooltip'] = toolTipInfo;
            }
        }
        public indicatorAgg(thisObjNew: any, convertedData: IBowtieData, aggregatedValue: d3.Selection<SVGElement>, color: string, aggregateFontSize: string) {
            if (thisObjNew.prevIndicator === false && convertedData.AggregatelabelSettings.Indicator) {
                convertedData.AggregatelabelSettings.signIndicator = true;
            } else if (convertedData.AggregatelabelSettings.Indicator === false) {
                convertedData.AggregatelabelSettings.signIndicator = false;
            }
            if (convertedData.AggregatelabelSettings.signIndicator) {
                convertedData.AggregatelabelSettings.Threshold = 0;
            }
            if (convertedData.AggregatelabelSettings.Indicator) {
                if (convertedData.AggregatelabelSettings.signIndicator) {
                    color = convertedData.aggregatedSum > 0 ? 'green' : 'red';
                } else {
                    color = convertedData.aggregatedSum >= convertedData.AggregatelabelSettings.Threshold ? 'green' : 'red';
                }
                aggregatedValue.append('span')
                    .style('color', color)
                    .style('font-size', aggregateFontSize)
                    .style('margin-left', '2px')
                    .style('margin-bottom', '-1px')
                    .attr('id', 'indicator')
                    .text('▲');
            } else {
                aggregatedValue.select('span#indicator').remove();
            }
        }
        public halfChartLoop(thisObjNew: any, convertedData: IBowtieData, textPropertiesForLabel: any, svg: any, dataUpdate: any, numberOfValues: any, category: any,
            formatter: IValueFormatter, divisionHeight: number, fontSize: string, bowtieChartDestinationWidthPercentage: number, fEndX: number, fEndY: number,
            avaialableHeight: number, fStartX: number, fBranchHeight: number, fStartY: number, fCurveFactor: number) {
            for (let iDiv: number = 0; iDiv < numberOfValues; iDiv++) {
                category = convertedData.dataPoints[iDiv].DestCategoryLabel;
                let value: string = formatter.format(convertedData.dataPoints[iDiv].value);
                let oDiv: d3.Selection<SVGElement>;
                let spanDiv: d3.Selection<SVGElement>;
                oDiv = thisObjNew.bowtieChartDestination
                    .append('div')
                    .classed('alignment', true)
                    .style('line-height', PixelConverter.toString(divisionHeight))
                    .style('margin-right', '1%')
                    .style('width', '49%');
                let oDiv1: d3.Selection<SVGElement>;
                let spanDiv1: d3.Selection<SVGElement>;
                oDiv1 = thisObjNew.bowtieChartDestination
                    .append('div')
                    .classed('alignment', true)
                    .style('line-height', PixelConverter.toString(divisionHeight))
                    .style('width', '50%');
                textPropertiesForLabel = { text: category, fontFamily: 'Segoe UI', fontSize: fontSize };
                let textPropertiesForValue: TextProperties = { text: value, fontFamily: 'Segoe UI', fontSize: fontSize };
                thisObjNew.bowtieChartDestination.style('display', 'block');
                spanDiv = oDiv.append('span')
                    .classed(`index${iDiv}`, true)
                    .attr('title', convertedData.dataPoints[iDiv].DestCategoryLabel)
                    .style('float', 'left')
                    .style('font-size', fontSize)
                    .style('color', convertedData.labelSettings.labelColor);
                spanDiv.append('text')
                    .classed(`span1`, true)
                    .text(textMeasurementService.getTailoredTextOrDefault(
                        textPropertiesForLabel, (thisObjNew.currentViewport.width *
                            (bowtieChartDestinationWidthPercentage / 2 - 1)) / 100))
                    .style('cursor', 'pointer');
                spanDiv1 = oDiv1.append('span')
                    .classed(`index${iDiv}`, true)
                    .attr('title', formatter.format(convertedData.dataPoints[iDiv].value))
                    .style('float', 'left')
                    .style('font-size', fontSize)
                    .style('color', convertedData.labelSettings.labelColor);
                spanDiv1.append('text')
                    .classed('span2', true)
                    .text(textMeasurementService.getTailoredTextOrDefault(
                        textPropertiesForValue, (thisObjNew.currentViewport.width *
                            (bowtieChartDestinationWidthPercentage / 2)) / 100))
                    .style('cursor', 'pointer');
                let percentage: number = convertedData.dataPoints[iDiv].value / convertedData.aggregatedSum;
                fEndY = iDiv * (avaialableHeight / numberOfValues) + divisionHeight / 2;
                let fPipeArea: number;
                fPipeArea = Math.abs(fEndX - fStartX);
                let height: number;
                height = convertedData.dataPoints[iDiv].DestCatArcWidth * fBranchHeight;
                height = height < 1 ? 1 : height;
                fStartY += (height / 2);
                if (iDiv > 0) {
                    if ((convertedData.dataPoints[iDiv - 1].DestCatArcWidth * fBranchHeight) > 1) {
                        fStartY += ((convertedData.dataPoints[iDiv - 1].DestCatArcWidth * fBranchHeight) / 2);
                    } else {
                        fStartY += 0.5;
                    }
                }
                let d: string = '';
                d = 'M ';
                d += fStartX + ' ';
                d += fStartY + ' C ';
                d += (fStartX + (fPipeArea * fCurveFactor)) + ' ';
                d += fStartY;
                d += ' ' + (fEndX - fPipeArea * fCurveFactor);
                d += ' ' + fEndY;
                d += ' ' + fEndX;
                d += ' ' + fEndY;
                let path: d3.Selection<SVGElement>;
                path = svg
                    .append('path')
                    .classed(`index${iDiv}`, true)
                    .attr('d', d)
                    .attr('stroke', dataUpdate.ArcFillColor)
                    .attr('fill', 'none')
                    .attr('stroke-width', height)
                    .style('cursor', 'pointer');
                let toolTipInfo: ITooltipDataItem[];
                toolTipInfo = [];
                toolTipInfo.push({
                    displayName: category,
                    value: value
                });
                path[0][0]['cust-tooltip'] = toolTipInfo;
            }
        }
        public d3sel() {
            d3.selectAll('path').style('opacity', 1);
            d3.selectAll('span').style('opacity', 1);
            d3.selectAll('#SpanText1').style('opacity', 1);
            d3.selectAll('#SpanText').style('opacity', 1);
        }
        public sourcePrint(thisObjNew: any, bowtieChartAggregatedWidthPercentage: number, percentageLiteral: string, bowtieChartSVGDestinationWidthPercentage: number,
            bowtieChartDestinationWidthPercentage: number, fontSize: string, numberOfValues: any, category: any, convertedData: IBowtieData, dataLength: number, maxValue: number, svg: any,
            fCurveFactor: number, fEndY: number, fEndX: number, fStartY: number, fBranchHeight: number, fBranchHeight1: number, aggregatedValue: any, divisionHeight: number,
            numberOfValuesHeight: number, dataUpdate: any, dataView: any, selectionManager: ISelectionManager, aggregateFontSize: string, textPropertiesForLabel, formatter: IValueFormatter,
            fStartX: number, heightOfTitle: number, aggregateFormatter: IValueFormatter, displayUnit: any, aggregatedUnit: any, sum: number, showHeading: Boolean) {
            thisObjNew.bowtieChartSource.style('display', 'none');
            thisObjNew.bowtieChartSVGSource.style('display', 'none');
            thisObjNew.bowtieMainContainer.style('width', PixelConverter.toString(thisObjNew.currentViewport.width));
            thisObjNew.bowtieMainContainer.style('height', PixelConverter.toString(thisObjNew.currentViewport.height));
            thisObjNew.bowtieChartAggregated.style('width', bowtieChartAggregatedWidthPercentage + percentageLiteral);
            thisObjNew.bowtieChartAggregated.style('margin-right', '1%');
            thisObjNew.bowtieChartSVGDestination.style('width', bowtieChartSVGDestinationWidthPercentage + percentageLiteral);
            thisObjNew.bowtieChartSVGDestination.style('margin-right', '1%');
            thisObjNew.bowtieChartDestination.style('width', bowtieChartDestinationWidthPercentage + percentageLiteral);
            let textPropertiesDestSourceName: TextProperties = { text: thisObjNew.destinationName, fontFamily: 'Segoe UI', fontSize: fontSize };
            let textPropertiesDestSourceValue: TextProperties = { text: thisObjNew.metricName, fontFamily: 'Segoe UI', fontSize: fontSize };
            thisObjNew.bowtieChartHeadings.selectAll('div').remove();
            thisObjNew.bowtieChartHeadings.append('div').style('width', (bowtieChartDestinationWidthPercentage / 2 - 1) + percentageLiteral).style('margin-right', '1%').style('float', 'left')
                .style('font-size', fontSize).attr('id', 'HalfBowtieDestSourceName').style('margin-left', (bowtieChartSVGDestinationWidthPercentage + bowtieChartAggregatedWidthPercentage + 2) + percentageLiteral)
                .append('span').attr('title', thisObjNew.destinationName).text(textMeasurementService.getTailoredTextOrDefault(textPropertiesDestSourceName, (thisObjNew.currentViewport.width * (bowtieChartDestinationWidthPercentage / 2 - 1)) / 100)); thisObjNew.bowtieChartHeadings.append('div')
                    .style('width', (bowtieChartDestinationWidthPercentage / 2) + percentageLiteral).style('float', 'left').style('font-size', fontSize).attr('id', 'HalfBowtieDestSourceVal').append('span')
                    .attr('title', thisObjNew.metricName).text(textMeasurementService.getTailoredTextOrDefault(textPropertiesDestSourceValue, (thisObjNew.currentViewport.width * (bowtieChartDestinationWidthPercentage / 2)) / 100));
            let heightOfHeadings: number = 0;
            if (thisObjNew.root.select('.BowtieChartHeadings')) heightOfHeadings = parseFloat(thisObjNew.root.select('.BowtieChartHeadings').style('height'));
            numberOfValues = convertedData.dataPoints.length;
            let avaialableHeight: number = thisObjNew.currentViewport.height - heightOfHeadings - heightOfTitle - 15;
            category = convertedData.dataPoints[0].DestCategoryLabel;
            textPropertiesForLabel = {
                text: category,
                fontFamily: 'Segoe UI',
                fontSize: fontSize
            };
            numberOfValuesHeight = textMeasurementService.measureSvgTextHeight(textPropertiesForLabel) * numberOfValues;
            if (numberOfValuesHeight > avaialableHeight) {
                avaialableHeight = numberOfValuesHeight;
                thisObjNew.root.select('.BowtieMainContainer').style('overflow-y', 'auto');
            } else thisObjNew.root.select('.BowtieMainContainer').style('overflow-y', 'hidden');
            thisObjNew.root.select('.BowtieMainContainer').style('overflow-x', 'hidden');
            divisionHeight = avaialableHeight / numberOfValues;
            thisObjNew.bowtieChartAggregated.style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.bowtieChartSVGDestination.style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.bowtieChartDestination.style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.bowtieChartAggregated.select('div').remove();
            thisObjNew.bowtieChartSVGDestination.selectAll('svg').remove();
            thisObjNew.bowtieChartSVGSource.selectAll('svg').remove();
            let textPropertiesAggregateValue: TextProperties = { text: aggregateFormatter.format(convertedData.aggregatedSum), fontFamily: 'Segoe UI', fontSize: aggregateFontSize };
            let textPropertiesMetricName: TextProperties = { text: thisObjNew.metricName, fontFamily: 'Segoe UI', fontSize: aggregateFontSize };
            let aggregatedSum: d3.Selection<SVGElement> = thisObjNew.bowtieChartAggregated.append('div').attr('id', 'divAggregatedSum').style('float', 'right').style('text-align', 'right');
            aggregatedSum.append('div').append('span').attr('title', thisObjNew.metricName).text(textMeasurementService.getTailoredTextOrDefault(textPropertiesMetricName, (thisObjNew.currentViewport.width * bowtieChartAggregatedWidthPercentage) / 100));
            aggregatedValue = aggregatedSum.append('div');
            aggregatedValue.append('span').attr('title', aggregateFormatter.format(convertedData.aggregatedSum)).text(textMeasurementService.getTailoredTextOrDefault(textPropertiesAggregateValue,
                ((thisObjNew.currentViewport.width * bowtieChartAggregatedWidthPercentage) / 100) - PixelConverter.fromPointToPixel(convertedData.AggregatelabelSettings.fontSize) - 2));
            aggregatedSum.style('font-size', aggregateFontSize).style('color', convertedData.AggregatelabelSettings.color);
            let color: string = 'green';
            if (thisObjNew.prevIndicator === false && convertedData.AggregatelabelSettings.Indicator) convertedData.AggregatelabelSettings.signIndicator = true;
            else if (convertedData.AggregatelabelSettings.Indicator === false) convertedData.AggregatelabelSettings.signIndicator = false;
            if (convertedData.AggregatelabelSettings.signIndicator) convertedData.AggregatelabelSettings.Threshold = 0;
            if (convertedData.AggregatelabelSettings.Indicator) {
                if (convertedData.AggregatelabelSettings.signIndicator) color = convertedData.aggregatedSum > 0 ? 'green' : 'red';
                else color = convertedData.aggregatedSum >= convertedData.AggregatelabelSettings.Threshold ? 'green' : 'red';
                aggregatedValue.append('span').style('color', color).style('font-size', aggregateFontSize).style('margin-left', '2px').style('margin-bottom', '-1px').attr('id', 'indicator').text('▲');
            } else aggregatedValue.select('span#indicator').remove();
            thisObjNew.prevIndicator = convertedData.AggregatelabelSettings.Indicator;
            let divHeight: number = 0;
            if (thisObjNew.root.select('#divAggregatedSum')) divHeight = parseFloat(thisObjNew.root.select('#divAggregatedSum').style('height'));
            aggregatedSum.style('margin-top', PixelConverter.toString(avaialableHeight / 2 - divHeight / 2));
            thisObjNew.bowtieChartDestination.selectAll('div').remove();
            numberOfValues = convertedData.dataPoints.length;
            divisionHeight = avaialableHeight / numberOfValues;
            fBranchHeight = avaialableHeight / 12;
            fBranchHeight1 = avaialableHeight / 12;
            for (let iDiv: number = 0; iDiv < numberOfValues; iDiv++)  if ((convertedData.dataPoints[iDiv].DestCatArcWidth * fBranchHeight) < 1) fBranchHeight1 = fBranchHeight1 + 0.25;
            if (fBranchHeight1 > avaialableHeight) {
                thisObjNew.clearData(true);
                return;
            }
            fStartX = 0;
            fStartY = avaialableHeight / 2 - fBranchHeight1 / 2;
            fEndX = (thisObjNew.currentViewport.width * bowtieChartSVGDestinationWidthPercentage) / 100;
            fEndY = 0;
            fCurveFactor = 0.65;
            svg = thisObjNew.bowtieChartSVGDestination.append('svg').style('height', PixelConverter.toString(avaialableHeight));
            this.halfChartLoop(thisObjNew, convertedData, textPropertiesForLabel, svg, dataUpdate, numberOfValues, category, formatter, divisionHeight, fontSize, bowtieChartDestinationWidthPercentage,
                fEndX, fEndY, avaialableHeight, fStartX, fBranchHeight, fStartY, fCurveFactor);
            d3.selectAll('path').data(convertedData.dataPoints)
                .on('click', (d: IBowtieDataPoint, i: number): void => { thisObjNew.selectOn(d, i, selectionManager) });
            d3.selectAll('.span1').data(convertedData.dataPoints)
                .on('click', (d: IBowtieDataPoint, i: number): void => { thisObjNew.selectOn(d, i, selectionManager) });
            d3.selectAll('.span2').data(convertedData.dataPoints)
                .on('click', (d: IBowtieDataPoint, i: number): void => { thisObjNew.selectOn(d, i, selectionManager) });
        }

        public thisAssign(thisObjNew: any, bowtieChartAggregatedWidthPercentage: number, percentageLiteral: number, bowtieChartDestinationWidthPercentage: number,
            bowtieChartSVGDestinationWidthPercentage: number, fontSize: number, margin: number, textPropertiesDestSourceName: TextProperties,
            textPropertiesSourceName: TextProperties, textPropertiesDestSourceValue: TextProperties) {
            thisObjNew.bowtieChartSource.style('display', 'block');
            thisObjNew.bowtieChartSVGSource.style('display', 'block');
            thisObjNew.bowtieMainContainer.style('width', PixelConverter.toString(thisObjNew.currentViewport.width));
            thisObjNew.bowtieMainContainer.style('height', PixelConverter.toString(thisObjNew.currentViewport.height));
            thisObjNew.bowtieMainContainer.style('float', 'left');
            thisObjNew.bowtieChartAggregated.style('width', bowtieChartAggregatedWidthPercentage + percentageLiteral);
            thisObjNew.bowtieChartAggregated.style('margin-right', '0%');
            thisObjNew.bowtieChartSVGDestination.style('width', bowtieChartSVGDestinationWidthPercentage + percentageLiteral);
            thisObjNew.bowtieChartSVGDestination.style('margin-right', '1%');
            thisObjNew.bowtieChartDestination.style('width', bowtieChartDestinationWidthPercentage + percentageLiteral);
            thisObjNew.bowtieChartSVGSource.style('width', bowtieChartSVGDestinationWidthPercentage + percentageLiteral);
            thisObjNew.bowtieChartSVGSource.style('margin-left', '1%');
            thisObjNew.bowtieChartSource.style('width', bowtieChartDestinationWidthPercentage + percentageLiteral);
            thisObjNew.bowtieChartSource.style('margin-left', '1%');
            thisObjNew.bowtieChartHeadings.selectAll('div').remove();
            thisObjNew.bowtieChartHeadings.append('div')
                .style('width', (bowtieChartDestinationWidthPercentage / 2) + percentageLiteral)
                .style('margin-left', '1%')
                .style('float', 'left')
                .style('font-size', fontSize)
                .attr('id', 'FullBowtieDestSourceName')
                .append('span')
                .attr('title', thisObjNew.sourceName)
                .text(textMeasurementService.getTailoredTextOrDefault(
                    textPropertiesSourceName,
                    (thisObjNew.currentViewport.width * (bowtieChartDestinationWidthPercentage / 2)) / 100));

            thisObjNew.bowtieChartHeadings
                .append('div')
                .style('width', (bowtieChartDestinationWidthPercentage / 2 - 1) + percentageLiteral)
                .style('float', 'left')
                .style('text-align', 'left')
                .style('font-size', fontSize)
                .attr('id', 'FullBowtieDestSourceValue')
                .append('span')
                .attr('title', thisObjNew.metricName)
                .text(textMeasurementService.getTailoredTextOrDefault(
                    textPropertiesDestSourceValue,
                    (thisObjNew.currentViewport.width * (bowtieChartDestinationWidthPercentage / 2 - 1)) / 100));

            thisObjNew.bowtieChartHeadings.append('div')
                .style('width', (bowtieChartDestinationWidthPercentage / 2) + percentageLiteral)
                .style('float', 'left')
                .style('margin-left', margin + percentageLiteral)
                .style('font-size', fontSize)
                .attr('id', 'FullBowtieSourceName')
                .attr('title', thisObjNew.destinationName)
                .append('span').text(textMeasurementService.getTailoredTextOrDefault(
                    textPropertiesDestSourceName, (thisObjNew.currentViewport.width *
                        (bowtieChartDestinationWidthPercentage / 2)) / 100));

            thisObjNew.bowtieChartHeadings.append('div')
                .style('width', (bowtieChartDestinationWidthPercentage / 2 - 1) + percentageLiteral)
                .style('float', 'left')
                .style('font-size', fontSize)
                .attr('id', 'FullBowtieSourceValue')
                .append('span')
                .attr('title', thisObjNew.metricName)
                .text(textMeasurementService.getTailoredTextOrDefault(
                    textPropertiesDestSourceValue,
                    (thisObjNew.currentViewport.width * (bowtieChartDestinationWidthPercentage / 2 - 1)) / 100));

        }
        public pushD(fStartX: number, fStartY: number, fEndX: number, fPipeArea: number, fCurveFactor: number, fEndY: number): string {
            let d: string = '';
            d = 'M ';
            d += fStartX;
            d += ' ';
            d += fStartY;
            d += ' C ';
            d += (fEndX - (fPipeArea * fCurveFactor));
            d += ' ';
            d += fStartY;
            d += ' ';
            d += (fStartX + (fPipeArea * fCurveFactor));
            d += ' ';
            d += fEndY;
            d += ' ';
            d += fEndX;
            d += ' ';
            d += fEndY;
            return d;
        }
        public onSelectDestHalf(thisObjNew: any, selectionManager: ISelectionManager, d: IBowtieDataPoint) {
            if (thisObjNew.categoryLabel === d.DestCategoryLabel) {
                if (thisObjNew.flagliteral) {
                    thisObjNew.flagliteral = 0;

                    selectionManager.clear();
                } else {
                    thisObjNew.flagliteral = 1;
                }

            } else {
                thisObjNew.flagliteral = 1;
            }
        }
        public onSelectDestFull(thisObjNew: any, selectionManager: ISelectionManager, d: IBowtieDataPoint, i: number) {
            if (thisObjNew.flagliteral === 1) {

                selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                    d3.selectAll('#DestPath').style('opacity', 0.5);
                    d3.selectAll(`.index${i}`).style('opacity', 1);
                    d3.selectAll('#SpanText').style('opacity', 0.5);
                    d3.selectAll(`.index${i}`).style('opacity', 1);
                    d3.selectAll('#SpanText1').style('opacity', 0.5);
                    d3.selectAll(`.index${i}`).style('opacity', 1);
                });
            } else {
                selectionManager.clear();
            }
            (<Event>d3.event).stopPropagation();
        }
        public thisAppend(thisObjNew: any, avaialableHeight: number) {
            thisObjNew.bowtieChartAggregated.style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.bowtieChartSVGDestination.style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.bowtieChartDestination.style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.bowtieChartSVGSource.style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.bowtieChartSource.style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.bowtieChartAggregated.select('div').remove();
            thisObjNew.bowtieChartSVGDestination.selectAll('svg').remove();
            thisObjNew.bowtieChartSVGSource.selectAll('svg').remove();
        }
        public onSelectSourHalf(thisObjNew: any, selectionManager: ISelectionManager, d: IBowtieDataPoint) {
            if (thisObjNew.categoryLabel === d.SourceCategoryLabel) {
                if (thisObjNew.flagliteral) {
                    thisObjNew.flagliteral = 0;

                    selectionManager.clear();
                } else {
                    thisObjNew.flagliteral = 1;
                }
            } else {
                thisObjNew.flagliteral = 1;
            }
        }

        public onSelectSourFull(thisObjNew: any, selectionManager: ISelectionManager, d: IBowtieDataPoint, i: number) {
            if (thisObjNew.flagliteral === 1) {
                selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                    d3.selectAll('path').style('opacity', ids.length > 0 ? 0.5 : 1);
                    d3.selectAll('path.destination').style('opacity', 1);
                    d3.selectAll(`.indexClass${i}`).style('opacity', 1);
                    d3.selectAll('#SourceText').style('opacity', 0.5);
                    d3.selectAll(`.indexClass${i}`).style('opacity', 1);
                    d3.selectAll('#SourceText1').style('opacity', 0.5);
                    d3.selectAll(`.indexClass${i}`).style('opacity', 1);
                });
            } else {
                selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                    d3.selectAll('path').style('opacity', 1);
                    d3.selectAll('span').style('opacity', 1);
                    d3.selectAll(`.indexClass${i}`).style('opacity', 1);

                });
                selectionManager.clear();

            }
            (<Event>d3.event).stopPropagation();
        }
        public fullChartSurLoop(thisObjNew: any, convertedData: any, textPropertiesForLabel: any, svg: any, dataUpdate: any, numberOfValues: any, category: any, formatter: IValueFormatter,
            divisionHeight: number, fontSize: string, bowtieChartDestinationWidthPercentage: number, fEndX: number, fEndY: number, fStartX: number, fBranchHeight: number,
            fStartY: number, fCurveFactor: number, TextMeasurementService) {
            for (let iDiv: number = numberOfValues; iDiv < (convertedData.dataPoints.length); iDiv++) {
                category = convertedData.dataPoints[iDiv].SourceCategoryLabel;
                let value: string = formatter.format(convertedData.dataPoints[iDiv].srcValue);
                let oDiv: d3.Selection<SVGElement>;
                let spanDiv: d3.Selection<SVGElement>;
                oDiv = thisObjNew.bowtieChartSource
                    .append('div').classed('alignment', true)
                    .style('line-height', PixelConverter.toString(divisionHeight))
                    .style('width', '50%').style('margin-right', '1%');
                let oDiv1: d3.Selection<SVGElement>;
                let spanDiv1: d3.Selection<SVGElement>;
                oDiv1 = thisObjNew.bowtieChartSource
                    .append('div').classed('alignment', true)
                    .style('line-height', PixelConverter.toString(divisionHeight))
                    .style('width', '30%');
                textPropertiesForLabel = {
                    text: category,
                    fontFamily: 'Segoe UI',
                    fontSize: fontSize
                };
                let textPropertiesForValue: TextProperties;
                textPropertiesForValue = {
                    text: value,
                    fontFamily: 'Segoe UI',
                    fontSize: fontSize
                };
                thisObjNew.bowtieChartSource.style('display', 'block');
                spanDiv = oDiv.append('span')
                    .classed(`indexClass${iDiv - numberOfValues}`, true)
                    .attr('title', convertedData.dataPoints[iDiv].SourceCategoryLabel)
                    .style('float', 'left').style('font-size', fontSize)
                    .style('color', convertedData.labelSettings.labelColor);
                spanDiv.append('text')
                    .classed('sourceSpan1', true).classed(`indexClass${iDiv - numberOfValues}`, true)
                    .attr('id', 'SourceText')
                    .text(TextMeasurementService.getTailoredTextOrDefault(
                        textPropertiesForLabel,
                        (thisObjNew.currentViewport.width * (bowtieChartDestinationWidthPercentage / 2 - 1)) / 100))
                    .style('cursor', 'pointer');
                spanDiv1 = oDiv1.append('span')
                    .classed(`indexClass${iDiv - numberOfValues}`, true)
                    .attr('title', formatter.format(convertedData.dataPoints[iDiv].srcValue))
                    .style('float', 'left').style('font-size', fontSize)
                    .style('color', convertedData.labelSettings.labelColor);
                spanDiv1
                    .append('text').classed('sourceSpan2', true)
                    .attr('id', 'SourceText1').classed(`indexClass${iDiv - numberOfValues}`, true)
                    .text(TextMeasurementService.getTailoredTextOrDefault(
                        textPropertiesForValue, (thisObjNew.currentViewport.width *
                            (bowtieChartDestinationWidthPercentage / 2 - 1)) / 100))
                    .style('cursor', 'pointer');
                // Code for SVG Path
                let percentage: number;
                percentage = convertedData.dataPoints[iDiv].srcValue / convertedData.aggregatedSum;
                fStartY = ((iDiv - numberOfValues) * divisionHeight) + divisionHeight / 2;
                let fPipeArea: number;
                fPipeArea = Math.abs(fStartX - fEndX);
                let height: number = (convertedData.dataPoints[iDiv].SourceArcWidth * fBranchHeight);
                height = height > 1 ? height : 1;
                fEndY += (height / 2);
                if (iDiv > numberOfValues) {
                    if ((convertedData.dataPoints[iDiv - 1].SourceArcWidth * fBranchHeight) > 1) {
                        fEndY += ((convertedData.dataPoints[iDiv - 1].SourceArcWidth * fBranchHeight) / 2);
                    } else {
                        fEndY += 0.5;
                    }
                }
                let d: string = '';
                d = 'M ' + fStartX + ' ';
                d += fStartY + ' C ';
                d += (fEndX - (fPipeArea * fCurveFactor)) + ' ' + fStartY + ' ';
                d += (fStartX + (fPipeArea * fCurveFactor)) + ' ';
                d += fEndY + ' ' + fEndX + ' ' + fEndY;
                let path: d3.Selection<SVGElement>;
                path = svg
                    .append('path').classed(`indexClass${iDiv - numberOfValues}`, true)
                    .classed('source', true).attr('d', d)
                    .attr('stroke', dataUpdate.ArcFillColor)
                    .attr('fill', 'none').attr('stroke-width', height)
                    .style('cursor', 'pointer');
                let toolTipInfo: ITooltipDataItem[];
                toolTipInfo = [];
                toolTipInfo.push({ displayName: category, value: value });
                path[0][0]['cust-tooltip'] = toolTipInfo;
            }
        }

        private getLabelSettings(dataView: DataView, labelSettings: VisualDataLabelsSettings): VisualDataLabelsSettings {
            let objects: DataViewObjects = null;
            if (!dataView.metadata || !dataView.metadata.objects) {
                return labelSettings;
            }

            objects = dataView.metadata.objects;
            
            let asterPlotLabelsProperties: any;
            asterPlotLabelsProperties = bowtieProps;

            labelSettings.precision = DataViewObjects.getValue(
                objects, asterPlotLabelsProperties.labels.textPrecision, labelSettings.precision);
            labelSettings.precision = labelSettings.precision < 0 ? 0 : (labelSettings.precision > 4 ? 4 : labelSettings.precision);
            labelSettings.fontSize = DataViewObjects.getValue(objects, asterPlotLabelsProperties.labels.fontSize, labelSettings.fontSize);
            labelSettings.displayUnits = DataViewObjects.getValue(
                objects, asterPlotLabelsProperties.labels.displayUnits, labelSettings.displayUnits);
            labelSettings.labelColor = DataViewObjects.getFillColor(
                objects, asterPlotLabelsProperties.labels.color, labelSettings.labelColor);

            return labelSettings;
        }

        private getAggregateLabelSettings(dataView: DataView): IAggregatelabelSettings {
            let objects: DataViewObjects = null;
            let labelSettings: IAggregatelabelSettings;
            labelSettings = this.getDefaultAggregateLabelSettings();

            if (!dataView.metadata || !dataView.metadata.objects) {
                return this.getDefaultAggregateLabelSettings();
            }

            objects = dataView.metadata.objects;
            
            let asterPlotLabelsProperties: any;
            asterPlotLabelsProperties = bowtieProps;

            labelSettings.textPrecision = DataViewObjects.getValue(
                objects, asterPlotLabelsProperties.Aggregatelabels.textPrecision, labelSettings.textPrecision);
            labelSettings.textPrecision = labelSettings.textPrecision < 0 ? 0 :
                (labelSettings.textPrecision > 4 ? 4 : labelSettings.textPrecision);
            labelSettings.fontSize = DataViewObjects.getValue(
                objects, asterPlotLabelsProperties.Aggregatelabels.fontSize, labelSettings.fontSize);
            labelSettings.displayUnits = DataViewObjects.getValue(
                objects, asterPlotLabelsProperties.Aggregatelabels.displayUnits, labelSettings.displayUnits);
            labelSettings.color = DataViewObjects.getFillColor(
                objects, asterPlotLabelsProperties.Aggregatelabels.color, labelSettings.color);
            labelSettings.Indicator = DataViewObjects.getValue(
                objects, asterPlotLabelsProperties.Aggregatelabels.Indicator, labelSettings.Indicator);
            labelSettings.signIndicator = DataViewObjects.getValue(
                objects, asterPlotLabelsProperties.Aggregatelabels.signIndicator, labelSettings.signIndicator);
            labelSettings.Threshold = DataViewObjects.getValue(
                objects, asterPlotLabelsProperties.Aggregatelabels.Threshold, labelSettings.Threshold);

            return labelSettings;
        }

        private static getTooltipData(value: any): VisualTooltipDataItem[] {
            return [{
                displayName: value[0].displayName.toString(),
                value: value[0].value.toString()
            },
            {
                displayName: value[1].displayName.toString(),
                value: value[1].value.toString()
            }];
        }
        public converter(dataView: DataView, colors: IColorPalette, host: IVisualHost): IBowtieData {
            let asterDataResult: IBowtieData = this.getDefaultBowtieData();
            let isSize = { isHalfBowtie: false, isFullBowtie: false };
            if (!this.dataViewContainsCategory(dataView) || dataView.categorical.categories.length < 1) return asterDataResult;
            else if (dataView.categorical.categories.length === 1) isSize.isHalfBowtie = true;
            else if (dataView.categorical.categories.length === 2) isSize.isFullBowtie = true;
            let k: number = 0, aggregatedSum: number = 0, i: number, length: number;;
            let cat: PrimitiveValue, category: PrimitiveValue;;
            let catDv: DataViewCategorical = dataView && dataView.categorical;
            let catDestination: DataViewCategoryColumn = catDv && catDv.categories && catDv.categories[0], catSource: DataViewCategoryColumn;
            if (isSize.isFullBowtie) catSource = catDv && catDv.categories && catDv.categories[1];
            let catDestValues: PrimitiveValue[] = catDestination && catDestination.values;
            let catSourceValues: PrimitiveValue[] = catSource ? catSource.values : null;
            let values: DataViewValueColumns = catDv && catDv.values;
            if (values) this.formatString = values[0].source.format;
            this.metricName = values && values[0] && values[0].source.displayName;
            this.destinationName = catDestination && catDestination.source && catDestination.source.displayName;
            this.sourceName = catSource ? catSource.source.displayName : '';
            if (values && values[0]) {
                aggregatedSum = d3.sum(values[0].values, (d: number): number => {
                    return (d && d > 0) ? d : 0
                });
            }
            asterDataResult.labelSettings.precision = 0;
            asterDataResult.labelSettings = this.getLabelSettings(dataView, asterDataResult.labelSettings);
            asterDataResult.AggregatelabelSettings = this.getAggregateLabelSettings(dataView);
            asterDataResult.chartType = isSize.isFullBowtie ? 'FullBowtie' : isSize.isHalfBowtie ? 'HalfBowtie' : null;
            asterDataResult.aggregatedSum = aggregatedSum;
            if (!catDestValues || catDestValues.length < 1 || !values || values.length < 1 || !asterDataResult.chartType) {
                this.isNegative = false;
                return asterDataResult;
            }
            let formatter: IValueFormatter = valueFormatter.create({ format: 'dddd\, MMMM %d\, yyyy' });
            // Populating source and destination values and their aggregations Destination
            let arrDestination: PrimitiveValue[] = [];
            for (i = 0, length = catDestValues.length; i < length; i++) {
                if (values[0] && values[0].values && values[0].values.length > 0) {
                    category = catDestValues[i];
                    category = category ? category : '(Blank)';
                    let destCat = { destArcWidth: 0, destCatSum: 0, check: false };
                    this.updateDestCat(values, length, destCat, catDestValues, category);
                    if (destCat.check) return;
                    if (aggregatedSum > 0) destCat.destArcWidth = destCat.destCatSum / aggregatedSum;
                    if (arrDestination.indexOf(category) === -1 && destCat.destCatSum !== 0) {
                        if (Date.parse(category.toString()) && (formatter.format(category) !== 'dddd MMMM %d yyyy')) {
                            asterDataResult.dataPoints.push({
                                DestCategoryLabel: formatter.format(category), SourceCategoryLabel: null, DestCatArcWidth: destCat.destArcWidth, SourceArcWidth: null, color: '',
                                selector: host.createSelectionIdBuilder().withCategory(catDestination, i).createSelectionId(), value: destCat.destCatSum, srcValue: 0, selectionId: []
                            });
                        } else {
                            asterDataResult.dataPoints.push({
                                DestCategoryLabel: category.toString(), SourceCategoryLabel: null, DestCatArcWidth: destCat.destArcWidth, SourceArcWidth: null, color: '',
                                selector: host.createSelectionIdBuilder().withCategory(catDestination, i).createSelectionId(), value: destCat.destCatSum, srcValue: 0, selectionId: []
                            });
                        }
                        asterDataResult.dataPoints[k].selectionId.push(asterDataResult.dataPoints[k].selector);
                        arrDestination.push(category);
                        k++;
                    } else if (arrDestination.indexOf(category) !== -1) {
                        cat = Date.parse(category.toString()) && (formatter.format(category) !== 'dddd MMMM %d yyyy') ? formatter.format(category) : category.toString();
                        asterDataResult.dataPoints.forEach((d: IBowtieDataPoint): void => {
                            if (d.DestCategoryLabel === cat)
                                d.selectionId.push(host.createSelectionIdBuilder().withCategory(catDestination, i).createSelectionId());
                        });
                    }
                }
            }
            if (asterDataResult.chartType === 'FullBowtie') {
                let arrSource: PrimitiveValue[] = [];
                for (let i = 0, srcLength = catSourceValues && catSourceValues.length; i < length; i++) {
                    category = catSourceValues[i] ? catSourceValues[i] : '(Blank)';
                    let destCat = { destArcWidth: 0, destCatSum: 0, check: false };
                    this.updateDestCat(values, srcLength, destCat, catSourceValues, category);
                    if (destCat.check) return;
                    if (aggregatedSum > 0) destCat.destArcWidth = destCat.destCatSum / aggregatedSum;
                    if (arrSource.indexOf(category) === -1 && destCat.destCatSum !== 0) {
                        if (Date.parse(category.toString()) && (formatter.format(category) !== 'dddd MMMM %d yyyy')) {
                            asterDataResult.dataPoints.push({
                                DestCategoryLabel: null, SourceCategoryLabel: formatter.format(category), DestCatArcWidth: null, SourceArcWidth: destCat.destArcWidth, color: '',
                                selector: host.createSelectionIdBuilder().withCategory(catSource, i).createSelectionId(), value: 0, srcValue: destCat.destCatSum, selectionId: []
                            });
                        } else {
                            asterDataResult.dataPoints.push({
                                DestCategoryLabel: null, SourceCategoryLabel: category.toString(), DestCatArcWidth: null, SourceArcWidth: destCat.destArcWidth, color: '',
                                selector: host.createSelectionIdBuilder().withCategory(catSource, i).createSelectionId(), value: 0, srcValue: destCat.destCatSum, selectionId: []
                            });
                        }
                        asterDataResult.dataPoints[k].selectionId.push(asterDataResult.dataPoints[k].selector);
                        arrSource.push(category);
                        k++;
                    } else if (arrSource.indexOf(category) !== -1) {
                        cat = (Date.parse(category.toString()) && (formatter.format(category) !== 'dddd MMMM %d yyyy')) ? formatter.format(category) : category.toString();
                        asterDataResult.dataPoints.forEach((d: IBowtieDataPoint): void => {
                            if (d.SourceCategoryLabel === cat) d.selectionId.push(host.createSelectionIdBuilder().withCategory(catSource, i).createSelectionId());
                        });
                    }
                }
            }
            return asterDataResult;
        }
        private checkCondition1(arrDestination: PrimitiveValue[], category: any, destCatSum: number, formatter: IValueFormatter, asterDataResult: IBowtieData,
            destArcWidth: number, host: IVisualHost, catDestination: DataViewCategoryColumn, i: number, k: number, cat: PrimitiveValue) {
            if (arrDestination.indexOf(category) === -1 && destCatSum !== 0) {
                if (Date.parse(category.toString()) && (formatter.format(category) !== 'dddd MMMM %d yyyy')) {
                    asterDataResult.dataPoints.push({
                        DestCategoryLabel: formatter.format(category),
                        SourceCategoryLabel: null,
                        DestCatArcWidth: destArcWidth,
                        SourceArcWidth: null,
                        color: '',
                        selector: host.createSelectionIdBuilder().withCategory(catDestination, i).createSelectionId(),
                        value: destCatSum,
                        srcValue: 0,
                        selectionId: []
                    });
                } else {
                    asterDataResult.dataPoints.push({
                        DestCategoryLabel: category.toString(),
                        SourceCategoryLabel: null,
                        DestCatArcWidth: destArcWidth,
                        SourceArcWidth: null,
                        color: '',
                        selector: host.createSelectionIdBuilder().withCategory(catDestination, i).createSelectionId(),
                        value: destCatSum,
                        srcValue: 0,
                        selectionId: []
                    });
                }
                asterDataResult.dataPoints[k].selectionId.push(asterDataResult.dataPoints[k].selector);
                arrDestination.push(category);
                k++;
            } else if (arrDestination.indexOf(category) !== -1) {
                if (Date.parse(category.toString()) && (formatter.format(category) !== 'dddd MMMM %d yyyy')) {
                    cat = formatter.format(category);
                } else {
                    cat = category.toString();
                }
                asterDataResult.dataPoints.forEach((d: IBowtieDataPoint): void => {
                    if (d.DestCategoryLabel === cat) {
                        d.selectionId.push(host.createSelectionIdBuilder().withCategory(catDestination, i).createSelectionId());
                    }
                });
            }
        }
        private checkCondition(category, formatter, asterDataResult, destArcWidth, host, catSource, i, destCatSum, arrSource, k, cat) {
            if (arrSource.indexOf(category) === -1 && destCatSum !== 0) {
                if (Date.parse(category.toString()) && (formatter.format(category) !== 'dddd MMMM %d yyyy')) {
                    asterDataResult.dataPoints.push({
                        DestCategoryLabel: null,
                        SourceCategoryLabel: formatter.format(category),
                        DestCatArcWidth: null,
                        SourceArcWidth: destArcWidth,
                        color: '',
                        selector: host.createSelectionIdBuilder().withCategory(catSource, i).createSelectionId(),
                        value: 0,
                        srcValue: destCatSum,
                        selectionId: []
                    });
                } else {
                    asterDataResult.dataPoints.push({
                        DestCategoryLabel: null,
                        SourceCategoryLabel: category.toString(),
                        DestCatArcWidth: null,
                        SourceArcWidth: destArcWidth,
                        color: '',
                        selector: host.createSelectionIdBuilder().withCategory(catSource, i).createSelectionId(),
                        value: 0,
                        srcValue: destCatSum,
                        selectionId: []
                    });
                }
                asterDataResult.dataPoints[k].selectionId.push(asterDataResult.dataPoints[k].selector);
                arrSource.push(category);
                k++;
            } else if (arrSource.indexOf(category) !== -1) {
                if (Date.parse(category.toString()) && (formatter.format(category) !== 'dddd MMMM %d yyyy')) {
                    cat = formatter.format(category);
                } else {
                    cat = category.toString();
                }
                asterDataResult.dataPoints.forEach((d: IBowtieDataPoint):void =>{
                    if (d.SourceCategoryLabel === cat) {
                        d.selectionId.push(host.createSelectionIdBuilder().withCategory(catSource, i).createSelectionId());
                    }
                });
            }

        }
        public loopNewConverter(srcLength: number, values: DataViewValueColumns, catSourceValues: PrimitiveValue[], category: PrimitiveValue, type: any, destVar: any,
            catDestValues: PrimitiveValue[], label: any) {
            for (let j: number = 0; j < srcLength; j++) {
                let value: any;
                value = values[0].values[j];
                if (value < 0) {
                    this.isNegative = true;
                    destVar.check = true;
                    return;
                }
                let innerCat: string | number | boolean | Date = catSourceValues[j];
                innerCat = (innerCat ? catSourceValues[j] : '(Blank)');
                if (type === 'source') {

                    if (innerCat === category) {
                        destVar.destCatSum += value;
                    }
                    if (innerCat === category) {
                        destVar.destCatSum2 += value;
                    }
                }
                if (type === 'destination') {

                    if (catDestValues[j] === null) {
                        catDestValues[j] = ' ';
                    }
                    if (innerCat === category && catDestValues[j].toString() === label) {
                        destVar.destCatSum += value;
                    }
                    if (innerCat === category) {
                        destVar.destCatSum2 += value;
                    }
                }
            }
        }
        public newConverter(dataView: DataView, colors: IColorPalette,
            host: IVisualHost, label: any, sumvalue: any, type: any): IBowtieData {
            let asterDataResult: IBowtieData = this.getDefaultBowtieData();
            let isHalfBowtie: boolean;
            let isFullBowtie: boolean;
            if (!this.dataViewContainsCategory(dataView) || dataView.categorical.categories.length < 1) {
                return asterDataResult;
            } else if (dataView.categorical.categories.length === 1) {
                isHalfBowtie = true;
            } else if (dataView.categorical.categories.length === 2) {
                isFullBowtie = true;
            }
            let k: number = 0;
            let cat: PrimitiveValue;
            let catDv: DataViewCategorical = dataView && dataView.categorical;
            let catDestination: DataViewCategoryColumn = catDv && catDv.categories && catDv.categories[0];
            let catSource: DataViewCategoryColumn;
            if (isFullBowtie) {
                catSource = catDv && catDv.categories && catDv.categories[1];
            }
            let catDestValues: PrimitiveValue[] = catDestination && catDestination.values;
            let catSourceValues: PrimitiveValue[] = catSource ? catSource.values : null;
            let values: DataViewValueColumns = catDv && catDv.values;
            if (values) this.formatString = values[0].source.format;
            this.metricName = values && values[0] && values[0].source.displayName;
            this.destinationName = catDestination && catDestination.source && catDestination.source.displayName;
            this.sourceName = catSource ? catSource.source.displayName : '';
            let aggregatedSum: number = 0;
            let aggregatedSum1: number = 0;
            if (values && values[0]) {
                aggregatedSum1 = d3.sum(values[0].values, (d: number): number => {
                    if (d && d > 0) return d;
                    else return 0;
                });
            }
            aggregatedSum = sumvalue;
            asterDataResult.labelSettings.precision = 0;
            asterDataResult.labelSettings = this.getLabelSettings(dataView, asterDataResult.labelSettings);
            asterDataResult.AggregatelabelSettings = this.getAggregateLabelSettings(dataView);
            asterDataResult.chartType = isFullBowtie ? 'FullBowtie' : isHalfBowtie ? 'HalfBowtie' : null;
            asterDataResult.aggregatedSum = aggregatedSum;
            if (!catDestValues || catDestValues.length < 1 || !values || values.length < 1 || !asterDataResult.chartType) {
                this.isNegative = false;
                return asterDataResult;
            }
            let formatter: IValueFormatter;
            formatter = valueFormatter.create({ format: 'dddd\, MMMM %d\, yyyy' });
            // Populating source and destination values and their aggregations Destination
            let arrDestination: PrimitiveValue[] = [];
            let i: number;
            let length: number;
            let category: PrimitiveValue;
            for (i = 0, length = catDestValues.length; i < length; i++) {
                if (values[0] && values[0].values && values[0].values.length > 0) {
                    category = catDestValues[i];
                    category = category ? category : '(Blank)';
                    let destVar = { destArcWidth: 0, destCatSum: 0, destCatSum1: 0, check: false };
                    for (let j: number = 0; j < length; j++) {
                        let value: any;
                        value = values[0].values[j];
                        if (value < 0) {
                            this.isNegative = true;
                            return;
                        }
                        let innerCat: PrimitiveValue = catDestValues[j];
                        innerCat = (innerCat ? catDestValues[j] : '(Blank)');
                        if (type === 'source') {
                            if (catSourceValues[j] === null) catSourceValues[j] = '';
                            if (innerCat === category && String(catSourceValues[j]) === label) destVar.destCatSum += value;
                            if (innerCat === category) destVar.destCatSum1 += value;
                        }
                        if (type === 'destination') {
                            if (catDestValues[j] === null) catDestValues[j] = ' ';
                            if (innerCat === category && String(catDestValues[j]) === label) destVar.destCatSum += value;
                            if (innerCat === category) destVar.destCatSum1 += value;
                        }
                    }
                    if (aggregatedSum1 > 0) destVar.destArcWidth = destVar.destCatSum1 / aggregatedSum1;
                    if (type === 'destination') {
                        this.checkCondition1(arrDestination, category, destVar.destCatSum1, formatter, asterDataResult, destVar.destArcWidth, host, catDestination, i, k, cat);
                    } else this.checkCondition1(arrDestination, category, destVar.destCatSum, formatter, asterDataResult, destVar.destArcWidth, host, catDestination, i, k, cat);
                }
            }
            if (asterDataResult.chartType === 'FullBowtie') {
                let arrSource: PrimitiveValue[] = [];
                let srcLength: number;
                for (i = 0, srcLength = catSourceValues && catSourceValues.length; i < length; i++) {
                    category = catSourceValues[i] ? catSourceValues[i] : '(Blank)';
                    let destVar = { destArcWidth: 0, destCatSum: 0, destCatSum2: 0, check: false };
                    this.loopNewConverter(srcLength, values, catSourceValues, category, type, destVar, catDestValues, label)
                    if (destVar.check) return;
                    aggregatedSum = sumvalue;
                    if (aggregatedSum1 > 0) destVar.destArcWidth = destVar.destCatSum2 / aggregatedSum1;
                    if (type === 'source') this.checkCondition(category, formatter, asterDataResult, destVar.destArcWidth, host, catSource, i, destVar.destCatSum2, arrSource, k, cat);
                    else this.checkCondition(category, formatter, asterDataResult, destVar.destArcWidth, host, catSource, i, destVar.destCatSum, arrSource, k, cat);
                }
            }
            this.thisObj.flag = false;
            return asterDataResult;
        }
        public printHeader(thisObjNew: any, dataView: any, header: any) {
            if (thisObjNew.getShowTitle(dataView)) header.gmoDonutTitleOnOffStatus = true;
            if (thisObjNew.getTitleText(dataView)) header.titleText = String(thisObjNew.getTitleText(dataView));
            if (thisObjNew.getTooltipText(dataView)) header.tooltiptext = String(thisObjNew.getTooltipText(dataView));
            if (!header.titlefontsize) header.titlefontsize = 12;
            thisObjNew.titleSize = header.titlefontsize;
            if (thisObjNew.getTitleFill(dataView)) header.titlecolor = thisObjNew.getTitleFill(dataView).solid.color;
            if (thisObjNew.getTitleBgcolor(dataView)) {
                header.titlebgcolor = thisObjNew.getTitleBgcolor(thisObjNew.dataView).solid.color;
                if ('none' === header.titlebgcolor) header.titlebgcolor = '#ffffff';
            }
            if (!header.gmoDonutTitleOnOffStatus) thisObjNew.root.select('.Title_Div_Text').style({ display: 'none' });
            else {
                thisObjNew.root.select('.Title_Div_Text')
                    .style({ display: 'inline-block', 'background-color': header.titlebgcolor, 'font-size': PixelConverter.toString(PixelConverter.fromPointToPixel(header.titlefontsize)), color: header.titlecolor });
            }
            thisObjNew.root.select('.GMODonutTitleDiv').text(header.titleText).attr('title',header.tooltiptext);
            thisObjNew.root.select('.GMODonutTitleIcon').style({ display: 'none' });
            if ('' !== header.tooltiptext && (1 !== thisObjNew.updateCount || '' !== header.titleText)) {
                thisObjNew.root.select('.GMODonutTitleIcon').style({ display: 'inline-block' }).attr('title', header.tooltiptext);
            }
        }

        private clearData(isLargeDataSet: boolean): void {
            // Headings
            this.bowtieChartHeadings.selectAll('div').remove();

            // Aggregated Sum settings
            this.bowtieChartAggregated.select('div').remove();
            this.bowtieChartSVGDestination.selectAll('svg').remove();
            this.bowtieChartSVGSource.selectAll('svg').remove();

            // Destination Settings
            this.bowtieChartDestination.selectAll('div').remove();

            // Source Settings
            this.bowtieChartSource.selectAll('div').remove();

            // Show Error Message
            this.bowtieChartError.selectAll('span').remove();
            this.bowtieMainContainer.style('width', PixelConverter.toString(this.currentViewport.width));
            this.bowtieMainContainer.style('height', PixelConverter.toString(this.currentViewport.height));

            let errorMessage: string;
            errorMessage = '';
            let errorMessageWidth: number;
            errorMessageWidth = 0;
            if (!this.isNegative) {
                errorMessage = 'Please select non-empty \'Value\', \'Source\', and/or \'Destination\'.';
                errorMessageWidth = 335;
            } else {
                errorMessage = 'Negative values are not supported.';
                errorMessageWidth = 195;
            }

            if (isLargeDataSet) {
                errorMessage = 'Too many values. Try selecting more filters and/or increasing size of the visual.';
                errorMessageWidth = 565;
            }

            this.bowtieChartError.append('span')
                .text(errorMessage)
                .style('font-size', '12px')
                .style({ display: 'block' })
                .style('height', this.currentViewport.height - 20)
                .style('line-height', PixelConverter.toString(this.currentViewport.height - 20))
                .style('margin', '0 auto')
                .style('width', PixelConverter.toString(errorMessageWidth));
        }
        public halfBowTie(thisObjNew: any, bowtieChartAggregatedWidthPercentage: number, bowtieChartSVGDestinationWidthPercentage: number,
            bowtieChartDestinationWidthPercentage: number, fontSize: string, convertedData: IBowtieData, dataUpdate: any, dataView: any, aggregateFontSize: string,
            formatter: IValueFormatter, fStartX: number, heightOfTitle: number, aggregateFormatter: IBowtieData, showHeading: Boolean) {
            thisObjNew.sourcePrint(thisObjNew, bowtieChartAggregatedWidthPercentage, thisObjNew.percentageLiteral, bowtieChartSVGDestinationWidthPercentage, bowtieChartDestinationWidthPercentage,
                fontSize, thisObjNew.numberOfValues, thisObjNew.category, convertedData, thisObjNew.dataLength, thisObjNew.maxValue, thisObjNew.svg, thisObjNew.fCurveFactor, thisObjNew.fEndY, thisObjNew.fEndX, thisObjNew.fStartY, thisObjNew.fBranchHeight, thisObjNew.fBranchHeight1, thisObjNew.aggregatedValue, thisObjNew.divisionHeight,
                thisObjNew.numberOfValuesHeight, dataUpdate, dataView, thisObjNew.selectionManager, aggregateFontSize, thisObjNew.textPropertiesForLabel, formatter, fStartX, heightOfTitle, aggregateFormatter, thisObjNew.displayUnit, thisObjNew.aggregatedUnit,
                thisObjNew.sum, showHeading)
            d3.select('html').on('click', (): void => {
                if (thisObjNew.selectionManager[`selectedIds`].length) {
                    thisObjNew.flagliteral = 0;
                    thisObjNew.updateInternal(dataView, thisObjNew.colors, thisObjNew.host, dataUpdate, thisObjNew, '', '', '');
                    thisObjNew.selectionManager.clear();
                    thisObjNew.d3sel();
                    thisObjNew.selectionManager.clear();
                }
            });
            if (!showHeading) {
                thisObjNew.bowtieChartHeadings.selectAll('div').remove();
            }
        }
        public fullChart(thisObjNew: any, fStartX: number, avaialableHeight: number, bowtieChartSVGDestinationWidthPercentage: number, convertedData: IBowtieData,
            dataUpdate: any, formatter: IValueFormatter, fontSize: string, bowtieChartDestinationWidthPercentage: number, dataView: any, destinationData: IBowtieData,
            sourceData: IBowtieData) {
            fStartX = 0;
            thisObjNew.fStartY = avaialableHeight / 2 - thisObjNew.fBranchHeight1 / 2;
            thisObjNew.fEndX = (thisObjNew.currentViewport.width * bowtieChartSVGDestinationWidthPercentage) / 100;
            thisObjNew.fEndY = 0;
            thisObjNew.fCurveFactor = 0.65;
            thisObjNew.svg = thisObjNew.bowtieChartSVGDestination.append('svg').style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.halfChartloopFullChart(thisObjNew, convertedData, thisObjNew.textPropertiesForLabel, thisObjNew.svg, dataUpdate, thisObjNew.numberOfValues, thisObjNew.category, formatter, thisObjNew.divisionHeight, fontSize,
                bowtieChartDestinationWidthPercentage, thisObjNew.fEndX, thisObjNew.fEndY, avaialableHeight, fStartX, thisObjNew.fBranchHeight, thisObjNew.fStartY, thisObjNew.fCurveFactor);
            d3.selectAll('.destination').data(destinationData.dataPoints).on('click', (d: IBowtieDataPoint, i: number): void => {
                thisObjNew.onSelectDestHalf(thisObjNew, thisObjNew.selectionManager, d);
                thisObjNew.categoryLabel = d.DestCategoryLabel;
                thisObjNew.updateInternal(dataView, thisObjNew.colors, thisObjNew.host, dataUpdate, thisObjNew, d.DestCategoryLabel, d.value, 'destination');
                thisObjNew.onSelectDestFull(thisObjNew, thisObjNew.selectionManager, d, i);
            });
            d3.selectAll('.destinationSpan1').data(destinationData.dataPoints).on('click', (d: IBowtieDataPoint, i: number): void => {
                thisObjNew.onSelectDestHalf(thisObjNew, thisObjNew.selectionManager, d);
                thisObjNew.updateInternal(dataView, thisObjNew.colors, thisObjNew.host, dataUpdate, thisObjNew, d.DestCategoryLabel, d.value, 'destination');
                thisObjNew.categoryLabel = d.DestCategoryLabel;
                thisObjNew.onSelectDestFull(thisObjNew, thisObjNew.selectionManager, d, i);
            });
            d3.selectAll('.destinationSpan2').data(destinationData.dataPoints).on('click', (d: IBowtieDataPoint, i: number): void => {
                thisObjNew.onSelectDestHalf(thisObjNew, thisObjNew.selectionManager, d);
                thisObjNew.updateInternal(dataView, thisObjNew.colors, thisObjNew.host, dataUpdate, thisObjNew, d.DestCategoryLabel, d.value, 'destination');
                thisObjNew.categoryLabel = d.DestCategoryLabel;
                thisObjNew.onSelectDestFull(thisObjNew, thisObjNew.selectionManager, d, i);
            });
            // Source Settings
            thisObjNew.bowtieChartSource.selectAll('div').remove();
            thisObjNew.fBranchHeight = avaialableHeight / 12;
            thisObjNew.fBranchHeight1 = avaialableHeight / 12;
            // checking for large datasets
            for (let iDiv: number = thisObjNew.numberOfValues; iDiv < (convertedData.dataPoints.length); iDiv++) {
                if ((convertedData.dataPoints[iDiv].SourceArcWidth * thisObjNew.fBranchHeight) < 1) {
                    thisObjNew.fBranchHeight1 = thisObjNew.fBranchHeight1 + 0.25;
                }
            }
            if (thisObjNew.fBranchHeight1 > avaialableHeight) {
                thisObjNew.clearData(true);
                return;
            }
            fStartX = 0;
            thisObjNew.fStartY = 0;
            thisObjNew.fEndX = (thisObjNew.currentViewport.width * bowtieChartSVGDestinationWidthPercentage) / 100;
            thisObjNew.fEndY = avaialableHeight / 2 - thisObjNew.fBranchHeight1 / 2;
            thisObjNew.fCurveFactor = 0.25;
            thisObjNew.divisionHeight = avaialableHeight / (convertedData.dataPoints.length - thisObjNew.numberOfValues);
            thisObjNew.svg = thisObjNew.bowtieChartSVGSource.append('svg').style('height', PixelConverter.toString(avaialableHeight));
            thisObjNew.fullChartSurLoop(thisObjNew, convertedData, thisObjNew.textPropertiesForLabel, thisObjNew.svg, dataUpdate, thisObjNew.numberOfValues, thisObjNew.category, formatter, thisObjNew.divisionHeight, fontSize,
                bowtieChartDestinationWidthPercentage, thisObjNew.fEndX, thisObjNew.fEndY, fStartX, thisObjNew.fBranchHeight, thisObjNew.fStartY, thisObjNew.fCurveFactor, textMeasurementService)
            d3.selectAll('.source').data(sourceData.dataPoints).on('click', (d: IBowtieDataPoint, i: number): void => {
                thisObjNew.onSelectSourHalf(thisObjNew, thisObjNew.selectionManager, d);
                thisObjNew.updateInternal(dataView, thisObjNew.colors, thisObjNew.host, dataUpdate, thisObjNew, d.SourceCategoryLabel, d.srcValue, 'source');
                thisObjNew.categoryLabel = d.SourceCategoryLabel;
                thisObjNew.onSelectSourFull(thisObjNew, thisObjNew.selectionManager, d, i);
            });
            d3.selectAll('.sourceSpan1').data(sourceData.dataPoints).on('click', (d: IBowtieDataPoint, i: number): void => {
                thisObjNew.onSelectSourHalf(thisObjNew, thisObjNew.selectionManager, d);
                thisObjNew.updateInternal(dataView, thisObjNew.colors, thisObjNew.host, dataUpdate, thisObjNew, d.SourceCategoryLabel, d.srcValue, 'source');
                thisObjNew.categoryLabel = d.SourceCategoryLabel;
                thisObjNew.onSelectSourFull(thisObjNew, thisObjNew.selectionManager, d, i);
            });
            d3.selectAll('.sourceSpan2').data(sourceData.dataPoints).on('click', (d: IBowtieDataPoint, i: number): void => {
                thisObjNew.onSelectSourHalf(thisObjNew, thisObjNew.selectionManager, d);
                thisObjNew.updateInternal(dataView, thisObjNew.colors, thisObjNew.host, dataUpdate, thisObjNew, d.SourceCategoryLabel, d.srcValue, 'source');
                thisObjNew.categoryLabel = d.SourceCategoryLabel;
                thisObjNew.onSelectSourFull(thisObjNew, thisObjNew.selectionManager, d, i);
            });
            d3.select('html').on('click', (): void => {
                if (thisObjNew.selectionManager[`selectedIds`].length) {
                    thisObjNew.flagliteral = 0;
                    thisObjNew.updateInternal(dataView, thisObjNew.colors, thisObjNew.host, dataUpdate, thisObjNew, '', '', '');
                    thisObjNew.selectionManager.clear();
                    thisObjNew.d3sel();
                    thisObjNew.selectionManager.clear();
                }
            });
        }
        public mainFullChart(thisObjNew: any, fontSize: string, bowtieChartAggregatedWidthPercentage: number, bowtieChartSVGDestinationWidthPercentage: number,
            bowtieChartDestinationWidthPercentage: number, heightOfTitle: number, convertedData: IBowtieData, destinationData: IBowtieData, sourceData: IBowtieData,
            aggregateFormatter: IValueFormatter, aggregateFontSize: string, fStartX: number, dataUpdate: any, formatter: IValueFormatter, dataView: any) {
            bowtieChartAggregatedWidthPercentage = 9;
            bowtieChartSVGDestinationWidthPercentage = 25;
            bowtieChartDestinationWidthPercentage = 19;
            let textPropertiesDestSourceName: TextProperties = { text: thisObjNew.destinationName, fontFamily: 'Segoe UI', fontSize: fontSize };
            let textPropertiesDestSourceValue: TextProperties = { text: thisObjNew.metricName, fontFamily: 'Segoe UI', fontSize: fontSize };
            let textPropertiesSourceName: TextProperties = { text: thisObjNew.sourceName, fontFamily: 'Segoe UI', fontSize: fontSize };
            let margin: number = bowtieChartSVGDestinationWidthPercentage * 2 + bowtieChartAggregatedWidthPercentage + 3;
            thisObjNew.thisAssign(thisObjNew, bowtieChartAggregatedWidthPercentage, thisObjNew.percentageLiteral, bowtieChartDestinationWidthPercentage, bowtieChartSVGDestinationWidthPercentage,
                fontSize, margin, textPropertiesDestSourceName, textPropertiesSourceName, textPropertiesDestSourceValue)
            let heightOfHeadings: number = 0;
            if (thisObjNew.root.select('.BowtieChartHeadings')) {
                heightOfHeadings = parseFloat(thisObjNew.root.select('.BowtieChartHeadings').style('height'));
            }

            let avaialableHeight: number = thisObjNew.currentViewport.height - heightOfHeadings - heightOfTitle - 10;
            thisObjNew.numberOfValues = 0;
            let numberOfValuesSource: number = 0;

            for (let k: number = 0; k < convertedData.dataPoints.length; k++) {
                if (convertedData.dataPoints[k].DestCategoryLabel != null) {
                    destinationData.dataPoints.push(convertedData.dataPoints[k]);
                    thisObjNew.numberOfValues++;
                }
                if (convertedData.dataPoints[k].SourceCategoryLabel != null) {
                    sourceData.dataPoints.push(convertedData.dataPoints[k]);
                    numberOfValuesSource++;
                }
            }

            thisObjNew.category = convertedData.dataPoints[0].DestCategoryLabel;
            thisObjNew.textPropertiesForLabel = { text: thisObjNew.category, fontFamily: 'Segoe UI', fontSize: fontSize };
            thisObjNew.numberOfValuesHeight = textMeasurementService.measureSvgTextHeight(thisObjNew.textPropertiesForLabel) * (thisObjNew.numberOfValues > numberOfValuesSource ? thisObjNew.numberOfValues : numberOfValuesSource);
            if (thisObjNew.numberOfValuesHeight > avaialableHeight) {
                avaialableHeight = thisObjNew.numberOfValuesHeight;
                thisObjNew.root.select('.BowtieMainContainer').style('overflow-y', 'auto');
            } else
                thisObjNew.root.select('.BowtieMainContainer').style('overflow-y', 'hidden');

            thisObjNew.root.select('.BowtieMainContainer').style('overflow-x', 'hidden');
            // Checking whether height is increased or not
            thisObjNew.divisionHeight = avaialableHeight / (convertedData.dataPoints.length - thisObjNew.numberOfValues);
            thisObjNew.category = convertedData.dataPoints[thisObjNew.numberOfValues].SourceCategoryLabel;
            thisObjNew.textPropertiesForLabel = { text: thisObjNew.category, fontFamily: 'Segoe UI', fontSize: fontSize };
            thisObjNew.thisAppend(thisObjNew, avaialableHeight);

            let textPropertiesAggregateValue: TextProperties = { text: aggregateFormatter.format(convertedData.aggregatedSum), fontFamily: 'Segoe UI', fontSize: aggregateFontSize };
            let textPropertiesMetricName: TextProperties = { text: thisObjNew.metricName, fontFamily: 'Segoe UI', fontSize: aggregateFontSize };
            let aggregatedSum: d3.Selection<SVGElement> =
                thisObjNew.bowtieChartAggregated.append('div').attr('id', 'divAggregatedSum').style('width', PixelConverter.toString((thisObjNew.currentViewport.width * bowtieChartAggregatedWidthPercentage) / 100))
                    .style('text-align', 'center');
            aggregatedSum.append('div').append('span').attr('title', thisObjNew.metricName).text(textMeasurementService.getTailoredTextOrDefault(
                textPropertiesMetricName, (thisObjNew.currentViewport.width * bowtieChartAggregatedWidthPercentage) / 100));

            thisObjNew.aggregatedValue = aggregatedSum.append('div');
            thisObjNew.aggregatedValue.append('span').attr('title', aggregateFormatter.format(convertedData.aggregatedSum))
                .text(textMeasurementService.getTailoredTextOrDefault(
                    textPropertiesAggregateValue, ((thisObjNew.currentViewport.width * bowtieChartAggregatedWidthPercentage) / 100) -
                    PixelConverter.fromPointToPixel(convertedData.AggregatelabelSettings.fontSize) - 2));
            aggregatedSum.style('font-size', aggregateFontSize).style('color', convertedData.AggregatelabelSettings.color);
            // Indicator logic
            let color: string = 'green';
            thisObjNew.indicatorAgg(thisObjNew, convertedData, thisObjNew.aggregatedValue, color, aggregateFontSize);
            thisObjNew.prevIndicator = convertedData.AggregatelabelSettings.Indicator;
            let divHeight: number = 0;
            if (thisObjNew.root.select('#divAggregatedSum')) {
                divHeight = parseFloat(thisObjNew.root.select('#divAggregatedSum').style('height'));
            }
            aggregatedSum.style('margin-top', PixelConverter.toString((avaialableHeight / 2 - divHeight / 2)));
            // Destination Settings
            thisObjNew.bowtieChartDestination.selectAll('div').remove();
            thisObjNew.numberOfValues = 0;
            for (let k: number = 0; k < convertedData.dataPoints.length; k++) {
                if (convertedData.dataPoints[k].DestCategoryLabel != null) {
                    thisObjNew.numberOfValues++;
                }
            }
            thisObjNew.divisionHeight = avaialableHeight / thisObjNew.numberOfValues;
            thisObjNew.fBranchHeight = avaialableHeight / 12;
            thisObjNew.fBranchHeight1 = avaialableHeight / 12;
            // checking for large datasets
            for (let iDiv: number = thisObjNew.numberOfValues; iDiv < (convertedData.dataPoints.length); iDiv++) {
                if ((convertedData.dataPoints[iDiv].DestCatArcWidth * thisObjNew.fBranchHeight) < 1) {
                    thisObjNew.fBranchHeight1 = thisObjNew.fBranchHeight1 + 0.25;
                }
            }
            if (thisObjNew.fBranchHeight1 > avaialableHeight) {
                thisObjNew.clearData(true);
                return;
            }
            thisObjNew.fullChart(thisObjNew, fStartX, avaialableHeight, bowtieChartSVGDestinationWidthPercentage, convertedData, dataUpdate, formatter, fontSize, bowtieChartDestinationWidthPercentage
                , dataView, destinationData, sourceData);
        }
        public updateInternal(dataView: any, colorsUpdate: any, hostUpdate: any, dataUpdate: any,
            thisObjNew: any, labelNew: any, sumValue: any, type: any): any {
            let convertedData: IBowtieData;
            if (thisObjNew.flagliteral === 0) {
                convertedData = dataUpdate = thisObjNew.converter(dataView, colorsUpdate, hostUpdate);
            } else {
                convertedData = dataUpdate = thisObjNew.newConverter(dataView, colorsUpdate, hostUpdate, labelNew, sumValue, type);
            }
            let destinationData: IBowtieData = thisObjNew.getDefaultBowtieData();
            let sourceData: IBowtieData = thisObjNew.getDefaultBowtieData();
            if (!convertedData || !convertedData.dataPoints || convertedData.dataPoints.length === 0) {
                thisObjNew.clearData(false);
                return;
            } else {
                thisObjNew.bowtieChartError.selectAll('span').style('display', 'none');
            }
            thisObjNew.root.select('.errorMessage').style({ display: 'none' });
            thisObjNew.root.select('.donutChartGMO').style({ display: '' });
            let header = { gmoDonutTitleOnOffStatus: false, titleText: '', tooltiptext: '', titlefontsize: thisObjNew.getTitleSize(dataView), titlecolor: false, titlebgcolor: '' };
            thisObjNew.printHeader(thisObjNew, dataView, header);
            thisObjNew.maxValue = <number>dataView.categorical.values[0].maxLocal;
            thisObjNew.dataLength = String(d3.round(thisObjNew.maxValue, 0)).length;
            thisObjNew.displayUnit = thisObjNew.assignValue(thisObjNew.dataLength);
            let formatter: IValueFormatter;
            formatter = valueFormatter.create({ format: thisObjNew.formatString, value: convertedData.labelSettings.displayUnits === 0 ? thisObjNew.displayUnit : convertedData.labelSettings.displayUnits, precision: convertedData.labelSettings.precision });
            for (let i: number = 0; i < dataView.categorical.values.length; i++) {
                thisObjNew.sum = thisObjNew.sum + <number>dataView.categorical.values[0].values[i];
            }
            thisObjNew.dataLength = String(d3.round(thisObjNew.sum, 0)).length;
            thisObjNew.aggregatedUnit = thisObjNew.assignValue(thisObjNew.dataLength);
            let aggregateFormatter: IValueFormatter;
            aggregateFormatter = valueFormatter.create({
                format: thisObjNew.formatString,
                value: convertedData.AggregatelabelSettings.displayUnits === 0 ? thisObjNew.aggregatedUnit :
                    convertedData.AggregatelabelSettings.displayUnits, precision: convertedData.AggregatelabelSettings.textPrecision
            });
            dataUpdate.ArcFillColor = DataViewObjects.getFillColor(
                thisObjNew.dataView.metadata.objects,
                bowtieProps.general.ArcFillColor, dataUpdate.ArcFillColor);
            let heightOfTitle: number = 0;
            if (thisObjNew.root.select('.GMODonutTitleDiv')) {
                heightOfTitle = isNaN(parseFloat(
                    thisObjNew.root.select('.GMODonutTitleDiv').style('height'))) ? 0 :
                    parseFloat(thisObjNew.root.select('.GMODonutTitleDiv').style('height'));
            }
            let bowtieChartAggregatedWidthPercentage: number = 12;
            let bowtieChartSVGDestinationWidthPercentage: number = 60;
            let bowtieChartDestinationWidthPercentage: number = 26;
            let fontSize: string = PixelConverter.toString(PixelConverter.fromPointToPixel(convertedData.labelSettings.fontSize));
            let aggregateFontSize: string = PixelConverter.toString(PixelConverter.fromPointToPixel(convertedData.AggregatelabelSettings.fontSize));
            let showHeading: boolean = true;
            let fStartX: number = 0;
            if (convertedData.chartType === 'HalfBowtie') {
                thisObjNew.halfBowTie(thisObjNew, bowtieChartAggregatedWidthPercentage, bowtieChartSVGDestinationWidthPercentage, bowtieChartDestinationWidthPercentage, fontSize, convertedData,
                    dataUpdate, dataView, aggregateFontSize, formatter, fStartX, heightOfTitle, aggregateFormatter, showHeading)
            } else {
                thisObjNew.mainFullChart(thisObjNew, fontSize, bowtieChartAggregatedWidthPercentage, bowtieChartSVGDestinationWidthPercentage, bowtieChartDestinationWidthPercentage,
                    heightOfTitle, convertedData, destinationData, sourceData, aggregateFormatter, aggregateFontSize, fStartX, dataUpdate, formatter, dataView);
            }
            thisObjNew.tooltipServiceWrapper.addTooltip(
                d3.selectAll('svg>*'), (
                    tooltipEvent: TooltipEventArgs<number>) => {
                return tooltipEvent.context['cust-tooltip'];
            },
                (tooltipEvent: TooltipEventArgs<number>) => null,
                true);
            thisObjNew.data = dataUpdate;
        }
        public update(options: VisualUpdateOptions): void {
            this.events.renderingStarted(options);
            this.flagliteral = 0;
            this.categoryLabel = '';
            this.selectionManager = this.selectionManager;
            this.percentageLiteral = '%';
            this.updateCount++;
            if (!options.dataViews || !options.dataViews[0]) {
                return;
            }
            this.currentViewport = {
                height: Math.max(0, options.viewport.height),
                width: Math.max(0, options.viewport.width)
            };

            let dataView1: DataView;
            this.thisObj = this;
            dataView1 = this.dataView = options.dataViews[0];
            this.dataViews = options.dataViews;
            let label: string;
            let sumvalue: number;
            this.updateInternal(dataView1, this.colors, this.host, this.data, this, label, sumvalue, '');
            this.events.renderingFinished(options);
        }
        private dataViewContainsCategory(dataView: DataView): DataViewCategoryColumn {
            return dataView &&
                dataView.categorical &&
                dataView.categorical.categories &&
                dataView.categorical.categories[0];
        }

        // This function returns on/off status of the funnel title properties
        private getShowTitle(dataView: DataView): IDataLabelSettings {
            const gmoDonutTitle: string = 'GMODonutTitle';
            const showLiteral: string = 'show';
            if (dataView && dataView.metadata && dataView.metadata.objects) {
                if (dataView.metadata.objects && dataView.metadata.objects.hasOwnProperty('GMODonutTitle')) {
                    const showTitle: DataViewObject = dataView.metadata.objects[gmoDonutTitle];
                    if (dataView.metadata.objects && showTitle.hasOwnProperty('show')) {
                        return <IDataLabelSettings>showTitle[showLiteral];
                    }
                } else {
                    return <IDataLabelSettings>true;
                }
            }

            return <IDataLabelSettings>true;
        }

        //This function returns the title text given for the title in the format window */
        
        private getTitleText(dataView: DataView): string {
            let returnTitleValues: string;
            let returnTitleLegend: string;
            let returnTitleDetails: string;
            let returnTitle: string;
            let tempTitle: string;
            let gmoDonutTitle: string;
            let titleTextLiteral: string;

            gmoDonutTitle = 'GMODonutTitle';
            titleTextLiteral = 'titleText';
            returnTitleValues = '';
            returnTitleLegend = '';
            returnTitleDetails = '';
            returnTitle = '';
            tempTitle = '';
            if (dataView && dataView.metadata && dataView.metadata.objects) {
                if (dataView.metadata.objects.hasOwnProperty('GMODonutTitle')) {
                    const titletext: DataViewObject = dataView.metadata.objects[gmoDonutTitle];
                    if (titletext && titletext.hasOwnProperty('titleText')) {
                        return titletext[titleTextLiteral].toString();
                    }
                }
            }

            let iLength: number = 0;
            if (dataView && dataView.categorical && dataView.categorical.values) {
                for (iLength = 0; iLength < dataView.categorical.values.length; iLength++) {
                    if (dataView.categorical.values[iLength].source && dataView.categorical.values[iLength].source.roles &&
                        dataView.categorical.values[iLength].source.roles.hasOwnProperty('Value')) {
                        if (dataView.categorical.values[iLength].source.displayName) {
                            returnTitleValues = dataView.categorical.values[iLength].source.displayName;
                            break;
                        }
                    }
                }
            }

            returnTitleLegend = this.getLegendTitle(dataView);

            returnTitleDetails = this.getTitleDetails(dataView);

            if ('' !== returnTitleValues) {
                tempTitle = ' by ';
            }
            if ('' !== returnTitleLegend && '' !== returnTitleDetails) {
                tempTitle = tempTitle;
                tempTitle += returnTitleLegend;
                tempTitle += ' and ';
                tempTitle += returnTitleDetails;
            } else if ('' === returnTitleLegend && '' === returnTitleDetails) {
                tempTitle = '';
            } else {
                // means one in empty and other is non empty
                tempTitle = tempTitle + returnTitleLegend + returnTitleDetails;
            }

            returnTitle = returnTitleValues + tempTitle;

            return returnTitle;
        }

        private getTitleDetails(dataView: DataView): string {
            let returnTitleDetails: string;
            returnTitleDetails = '';
            if (dataView && dataView.categorical && dataView.categorical.categories && dataView.categorical.categories[1]) {
                returnTitleDetails = dataView.categorical.categories[1].source.displayName;
            }

            return returnTitleDetails;
        }

        private getLegendTitle(dataView: DataView): string {
            let legendTitle: string;
            legendTitle = '';
            if (dataView && dataView.categorical && dataView.categorical.categories) {
                legendTitle = dataView.categorical.categories[0].source.displayName;
            }

            return legendTitle;
        }

        // This function returns the tool tip text given for the tooltip in the format window
        private getTooltipText(dataView: DataView): IDataLabelSettings {
            let gmoDonutTitle: string;
            let tooltipTextLiteral: string;
            gmoDonutTitle = 'GMODonutTitle';
            tooltipTextLiteral = 'tooltipText';

            if (dataView && dataView.metadata && dataView.metadata.objects) {
                if (dataView.metadata.objects && dataView.metadata.objects.hasOwnProperty('GMODonutTitle')) {
                    const tooltiptext: DataViewObject = dataView.metadata.objects[gmoDonutTitle];
                    if (tooltiptext && tooltiptext.hasOwnProperty('tooltipText')) {
                        return <IDataLabelSettings>tooltiptext[tooltipTextLiteral];
                    }
                } else {
                    return <IDataLabelSettings>'Your tooltip text goes here';
                }
            }

            return <IDataLabelSettings>'Your tooltip text goes here';
        }

        // This function returns the font colot selected for the title in the format window
        private getTitleFill(dataView: DataView): Fill {
            let gmoDonutTitle: string;
            let fill1Literal: string;
            gmoDonutTitle = 'GMODonutTitle';
            fill1Literal = 'fill1';

            if (dataView && dataView.metadata && dataView.metadata.objects) {
                if (dataView.metadata.objects && dataView.metadata.objects.hasOwnProperty('GMODonutTitle')) {
                    const fTitle: DataViewObject = dataView.metadata.objects[gmoDonutTitle];
                    if (fTitle && fTitle.hasOwnProperty('fill1')) {
                        return <Fill>fTitle[fill1Literal];
                    }
                } else {
                    return dataView && dataView.metadata && DataViewObjects.getValue(
                        dataView.metadata.objects, bowtieProps.titleFill, { solid: { color: '#333333' } });
                }
            }

            return dataView && dataView.metadata && DataViewObjects.getValue(
                dataView.metadata.objects, bowtieProps.titleFill, { solid: { color: '#333333' } });
        }

        // This function returns the background color selected for the title in the format window
        private getTitleBgcolor(dataView: DataView): Fill {
            let gmoDonutTitle: string;
            let backgroundColorLiteral: string;
            gmoDonutTitle = 'GMODonutTitle';
            backgroundColorLiteral = 'backgroundColor';

            if (dataView && dataView.metadata && dataView.metadata.objects) {
                if (dataView.metadata.objects && dataView.metadata.objects.hasOwnProperty('GMODonutTitle')) {
                    const fTitle: DataViewObject = dataView.metadata.objects[gmoDonutTitle];
                    if (fTitle && fTitle.hasOwnProperty('backgroundColor')) {
                        return <Fill>fTitle[backgroundColorLiteral];
                    }
                } else {
                    return dataView && dataView.metadata && DataViewObjects.getValue(
                        dataView.metadata.objects, bowtieProps.titleBackgroundColor, { solid: { color: 'none' } });
                }
            }

            return dataView && dataView.metadata && DataViewObjects.getValue(
                dataView.metadata.objects, bowtieProps.titleBackgroundColor, { solid: { color: 'none' } });
        }

        // This function returns the funnel title font size selected for the title in the format window
        
        private getTitleSize(dataView: DataView): number {
            let gmoDonutTitle: string;
            let fontSizeLiteral: string;
            gmoDonutTitle = 'GMODonutTitle';
            fontSizeLiteral = 'fontSize';

            if (dataView && dataView.metadata && dataView.metadata.objects) {
                if (dataView.metadata.objects && dataView.metadata.objects.hasOwnProperty('GMODonutTitle')) {
                    const fTitle: DataViewObject = dataView.metadata.objects[gmoDonutTitle];
                    if (fTitle && fTitle.hasOwnProperty('fontSize')) {
                        return parseInt(fTitle[fontSizeLiteral].toString(), 10);
                    }
                } else {
                    return 9;
                }
            }

            return 9;
        }

        // This function retruns the values to be displayed in the property pane for each object.
        // Usually it is a bind pass of what the property pane gave you, but sometimes you may want to do
        // validation and return other values/defaults
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {

            let enumeration: VisualObjectInstance[];
            enumeration = [];
            switch (options.objectName) {
                case 'general':
                    enumeration.push({
                        objectName: 'general',
                        displayName: 'General',
                        selector: null,
                        properties: {
                            ArcFillColor: this.data.ArcFillColor
                        }
                    });
                    break;
                case 'GMODonutTitle':
                    enumeration.push({
                        objectName: 'GMODonutTitle',
                        displayName: 'Bowtie title',
                        selector: null,
                        properties: {
                            show: this.getShowTitle(this.dataViews[0]),
                            titleText: this.getTitleText(this.dataViews[0]),
                            tooltipText: this.getTooltipText(this.dataViews[0]),
                            fill1: this.getTitleFill(this.dataViews[0]),
                            backgroundColor: this.getTitleBgcolor(this.dataViews[0]),
                            fontSize: this.getTitleSize(this.dataViews[0])
                        }
                    });
                    break;
                case 'labels':
                    enumeration.push({
                        objectName: 'labels',
                        displayName: 'Data Labels',
                        selector: null,
                        properties: {
                            color: this.data.labelSettings.labelColor,
                            displayUnits: this.data.labelSettings.displayUnits,
                            textPrecision: this.data.labelSettings.precision,
                            fontSize: this.data.labelSettings.fontSize
                        }
                    });
                    break;
                case 'Aggregatelabels':
                    enumeration.push({
                        objectName: 'Aggregatelabels',
                        displayName: 'Summary Label Settings',
                        selector: null,
                        properties: {
                            color: this.data.AggregatelabelSettings.color,
                            displayUnits: this.data.AggregatelabelSettings.displayUnits,
                            textPrecision: this.data.AggregatelabelSettings.textPrecision,
                            fontSize: this.data.AggregatelabelSettings.fontSize,
                            Indicator: this.data.AggregatelabelSettings.Indicator,
                            signIndicator: this.data.AggregatelabelSettings.signIndicator,
                            Threshold: this.data.AggregatelabelSettings.Threshold
                        }
                    });
                    break;
                default:
                    break;
            }

            return enumeration;
        }
    }
}
