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
    import tooltip = powerbi.extensibility.utils.tooltip;
    import ISelectionId = powerbi.visuals.ISelectionId;
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;
    let fytargetChecker: boolean = false;
    let xAxisName: string = "X-Axis";
    let yAxisName: string = "Y-Axis";
    let legendHeight: string = "1.5px";
    let columnValue: DataViewValueColumn;
    const imagePatt: RegExp =
        new RegExp("^https?://(?:[a-z0-9\-]+\.)+[a-z]{2,6}(?:/[^/#?]+)+\.(?:jpg|jpeg|gif|png|svg)$");
    // do not update
    export module DataViewObjects {
        // Gets the value of the given object/property pair.
        export function getValue
            <T>(objects: DataViewObjects, propertyId: DataViewObjectPropertyIdentifier, defaultValue?: T): T {

            if (!objects) { return defaultValue; }

            let objectOrMap: DataViewObject;
            objectOrMap = objects[propertyId.objectName];

            let object: DataViewObject;
            object = <DataViewObject>objectOrMap;

            return DataViewObject.getValue(object, propertyId.propertyName, defaultValue);
        }

        // Gets an object from objects.
        export function getObject(objects: DataViewObjects,
            objectName: string, defaultValue?: DataViewObject): DataViewObject {
            if (objects && objects[objectName]) {
                let object: DataViewObject;
                object = <DataViewObject>objects[objectName];

                return object;
            } else {
                return defaultValue;
            }
        }

        // Gets a map of user-defined objects.
        export function getUserDefinedObjects(objects: DataViewObjects, objectName: string): DataViewObjectMap {
            if (objects && objects[objectName]) {
                let map: DataViewObjectMap;
                map = <DataViewObjectMap>objects[objectName];

                return map;
            }
        }

        // Gets the solid color from a fill property.
        export function getFillColor(
            objects: DataViewObjects, propertyId: DataViewObjectPropertyIdentifier, defaultColor?: string): string {
            let value: Fill;
            value = getValue(objects, propertyId);
            if (!value || !value.solid) {
                return defaultColor;
            }

            return value.solid.color;
        }
    }

    export module DataViewObject {
        export function getValue<T>(object: DataViewObject, propertyName: string, defaultValue?: T): T {

            if (!object) { return defaultValue; }
            let propertyValue: any;
            propertyValue = <T>object[propertyName];
            if (propertyValue === undefined) { return defaultValue; }

            return propertyValue;
        }

        // Gets the solid color from a fill property using only a propertyName
        export function getFillColorByPropertyName(objects: DataViewObjects,
            propertyName: string, defaultColor?: string): string {
            let value: Fill;
            value = DataViewObject.getValue(objects, propertyName);
            if (!value || !value.solid) { return defaultColor; }

            return value.solid.color;
        }

    }
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;
    // do not update
    interface IKPIColumnViewModel {
        dataPoints: IKPIColumnDataPoint[];
        dataMax: number;
        dataMin: number;
        fytarget: number;
        settings: IKPIColumnSettings;
    }

    interface IKPIColumnDataPoint {

        value: PrimitiveValue;
        ytd: PrimitiveValue;
        forecasted: PrimitiveValue;
        category: string;
        color: string;
        selectionId: ISelectionId;
        tooltip: any;
    }

    interface IIndividualTargetData {

        value: PrimitiveValue;
        ytd: PrimitiveValue;
        forecasted: PrimitiveValue;
        category: string;
        color: string;
        selectionId: ISelectionId;

        tooltip: any;
    }

    interface IKPIColumnSettings {
        enableAxis: {
            show: boolean;
        };
    }


    export let chartProperties: any = {
        analytics: {
            avg: { objectName: "analytics", propertyName: "avg" },
            lineColorAvg: { objectName: "analytics", propertyName: "lineColorAvg" },
            lineColorMax: { objectName: "analytics", propertyName: "lineColorMax" },
            lineColorMedian: { objectName: "analytics", propertyName: "lineColorMedian" },
            lineColorMin: { objectName: "analytics", propertyName: "lineColorMin" },
            max: { objectName: "analytics", propertyName: "max" },
            median: { objectName: "analytics", propertyName: "median" },
            min: { objectName: "analytics", propertyName: "min" },
            strokeSizeAvg: { objectName: "analytics", propertyName: "strokeSizeAvg" },
            strokeSizeMax: { objectName: "analytics", propertyName: "strokeSizeMax" },
            strokeSizeMedian: { objectName: "analytics", propertyName: "strokeSizeMedian" },
            strokeSizeMin: { objectName: "analytics", propertyName: "strokeSizeMin" }
        },
        animation: {
            show: { objectName: "animation", propertyName: "show" }
        },
        backgroundImage: {
            imageUrl: { objectName: "backgroundImage", propertyName: "imageUrl" },
            show: { objectName: "backgroundImage", propertyName: "show" },
            transparency: { objectName: "backgroundImage", propertyName: "transparency" }
        },
        dataLabels: {
            displayUnits: { objectName: "dataLabels", propertyName: "displayUnits" },
            fontColor: { objectName: "dataLabels", propertyName: "fontColor" },
            fontFamily: { objectName: "dataLabels", propertyName: "fontFamily" },
            fontSize: { objectName: "dataLabels", propertyName: "fontSize" },
            position: { objectName: "dataLabels", propertyName: "position" },
            show: { objectName: "dataLabels", propertyName: "show" },
            valueDecimal: { objectName: "dataLabels", propertyName: "valueDecimal" }
        },
        enableAxis: {
            show: <DataViewObjectPropertyIdentifier>{ objectName: "enableAxis", propertyName: "show" }
        },
        fullTargetConfig: {
            lineColor: { objectName: "fullYearTarget", propertyName: "lineColor" },
            show: { objectName: "fullYearTarget", propertyName: "show" },
            strokeSize: { objectName: "fullYearTarget", propertyName: "strokeSize" }
        },
        horizontal: {
            show: { objectName: "horizontal", propertyName: "show" }
        },
        legendSettings: {
            fontFamily: <DataViewObjectPropertyIdentifier>{ objectName: "legend", propertyName: "fontFamily" },
            labelColor: <DataViewObjectPropertyIdentifier>{ objectName: "legend", propertyName: "labelColor" },
            labelSize: <DataViewObjectPropertyIdentifier>{ objectName: "legend", propertyName: "fontSize" },
            show: <DataViewObjectPropertyIdentifier>{ objectName: "legend", propertyName: "show" },
            title: <DataViewObjectPropertyIdentifier>{ objectName: "legend", propertyName: "title" }
        },
        xAxisConfig: {
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: "xAxis", propertyName: "fill" },
            fontFamily: <DataViewObjectPropertyIdentifier>{ objectName: "xAxis", propertyName: "fontFamily" },
            fontSize: <DataViewObjectPropertyIdentifier>{ objectName: "xAxis", propertyName: "fontSize" },
            title: <DataViewObjectPropertyIdentifier>{ objectName: "xAxis", propertyName: "title" }
        },
        yAxisConfig: {
            decimalPlaces: <DataViewObjectPropertyIdentifier>{ objectName: "yAxis", propertyName: "decimalPlaces" },
            displayUnits: <DataViewObjectPropertyIdentifier>{ objectName: "yAxis", propertyName: "displayUnits" },
            end: <DataViewObjectPropertyIdentifier>{ objectName: "yAxis", propertyName: "end" },
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: "yAxis", propertyName: "fill" },
            fontFamily: <DataViewObjectPropertyIdentifier>{ objectName: "yAxis", propertyName: "fontFamily" },
            fontSize: <DataViewObjectPropertyIdentifier>{ objectName: "yAxis", propertyName: "fontSize" },
            gridLines: <DataViewObjectPropertyIdentifier>{ objectName: "yAxis", propertyName: "gridLines" },
            start: <DataViewObjectPropertyIdentifier>{ objectName: "yAxis", propertyName: "start" },
            title: <DataViewObjectPropertyIdentifier>{ objectName: "yAxis", propertyName: "title" }

        },
        yTDConfig: {
            lineColor: { objectName: "yTDTarget", propertyName: "lineColor" },
            show: { objectName: "yTDTarget", propertyName: "show" },
            strokeSize: { objectName: "yTDTarget", propertyName: "strokeSize" }
        },
        zoneSettings: {
            defaultColor: <DataViewObjectPropertyIdentifier>{
                objectName: "zoneSettings",
                propertyName: "defaultColor"
            },
            zone1Color: <DataViewObjectPropertyIdentifier>{ objectName: "zoneSettings", propertyName: "zone1Color" },
            zone1Value: <DataViewObjectPropertyIdentifier>{ objectName: "zoneSettings", propertyName: "zone1Value" },
            zone2Color: <DataViewObjectPropertyIdentifier>{ objectName: "zoneSettings", propertyName: "zone2Color" },
            zone2Value: <DataViewObjectPropertyIdentifier>{ objectName: "zoneSettings", propertyName: "zone2Value" },
            zone3Color: <DataViewObjectPropertyIdentifier>{ objectName: "zoneSettings", propertyName: "zone3Color" }

        }
    };

    export interface IZoneSettings {
        zone1Value: number;
        zone2Value: number;
        zone1Color: string;
        zone2Color: string;
        zone3Color: string;
        defaultColor: string;
    }

    export interface IXAxisSettings {
        fontColor: string;
        fontSize: number;
        title: boolean;
        fontFamily: string;
    }
    export interface IYAxisSettings {
        fontColor: string;
        fontSize: number;
        decimalPlaces: number;
        displayUnits: number;
        gridLines: boolean;
        start: number;
        end: number;
        title: boolean;
        fontFamily: string;
    }

    export interface ITargetSettings {
        show: boolean;
        lineColor: string;
        strokeSize: number;
    }

    export interface ILegendSettings {
        show: boolean;
        labelSize: number;
        labelColor: string;
        title: boolean;
        fontFamily: string;
    }
    export interface IDataLabels {
        show: boolean;
        fontColor: string;
        fontSize: number;
        fontFamily: string;
        valueDecimal: number;
        displayUnits: number;
        position: string;
    }
    export interface IBackgroundImage {
        show: boolean;
        imageUrl: string;
        transparency: number;
    }
    export interface IAnalyticsSettings {
        min: boolean;
        lineColorMin: string;
        strokeSizeMin: number;
        max: boolean;
        lineColorMax: string;
        strokeSizeMax: number;
        avg: boolean;
        lineColorAvg: string;
        strokeSizeAvg: number;
        median: boolean;
        lineColorMedian: string;
        strokeSizeMedian: number
    }
    export interface IHorizontal {
        show: boolean;
    }
    export interface IAnimation {
        show: boolean;
    }
    export interface ITooltipDataPoints {
        name: string;
        value: string;
    }

    function subFunctionalityOfVisualTransform(context: KPIColumn, options: VisualUpdateOptions, dataViews: DataView[], category: DataViewCategoryColumn
        , defaultSettings: IKPIColumnSettings, cnt: number, tooltipValues: ITooltipDataPoints[], lengthValues: number, forecasted: DataViewCategoryColumn,
        host: IVisualHost, targetValue: DataViewValueColumn, dataValue: DataViewValueColumn, fytarget: PrimitiveValue): IKPIColumnViewModel {
        let zoneSettings: IZoneSettings = context.getZoneSettings(dataViews[0]);
        let KPIColumnDataPoints: IKPIColumnDataPoint[] = [];
        let objects: DataViewObjects = dataViews[0].metadata.objects;
        let KPIColumnSettings: IKPIColumnSettings = {
            enableAxis: {
                show: getValue<boolean>(objects, "enableAxis", "show", defaultSettings.enableAxis.show)
            }
        };
        for (let index = 0, length = Math.max(category.values.length, dataValue.values.length); index < length; index++) {
            let defaultColor: string;
            let defaultColorNegativetarget: string;
            if (targetValue) {
                let colorValue: number = (<number>dataValue.values[index]) / (<number>targetValue.values[index]);
                if (colorValue < zoneSettings.zone1Value / 100) {
                    defaultColor = zoneSettings.zone1Color;
                    defaultColorNegativetarget = zoneSettings.zone3Color;//Incorrect zone color display is noticed for negative values .Storing zone3Color for zone1 defaultColorNegativetarget will give expected behaviour 
                } else if (colorValue < zoneSettings.zone2Value / 100) {
                    defaultColor = zoneSettings.zone2Color;
                    defaultColorNegativetarget = zoneSettings.zone2Color;
                } else {
                    defaultColor = zoneSettings.zone3Color;
                    defaultColorNegativetarget = zoneSettings.zone1Color;//Incorrect zone color display is noticed for negative values .Storing zone1Color for zone3 defaultColorNegativetarget will give expected behaviour
                }
            } else {
                defaultColor = zoneSettings.defaultColor;
                defaultColorNegativetarget = zoneSettings.defaultColor;
            }
            let formatter: IValueFormatter = valueFormatter.create({ format: options.dataViews[0].categorical.categories[0].source.format });
            const newValues: ITooltipDataPoints[] = [];
            for (let cntIterator: number = 0; cntIterator < cnt; cntIterator++) {
                if (cntIterator === 0) {
                    newValues.push(tooltipValues[index]);
                } else {
                    newValues.push(tooltipValues[index + cntIterator * lengthValues]);
                }
            }
            KPIColumnDataPoints.push({
                category: formatter.format(category.values[index]),
                //For negative target values, zone color are displayed incorrectly.Updated the logic for displaying correct default colors for negative target values also
                color: targetValue ? targetValue.values[index] < 0 ? defaultColorNegativetarget : defaultColor : defaultColor,
                forecasted: forecasted ? forecasted.values[index] : null,
                selectionId: host.createSelectionIdBuilder()
                    .withCategory(category, index).createSelectionId(),
                tooltip: newValues, value: dataValue.values[index], ytd: targetValue ? targetValue.values[index] : null,
            });
        }
        const fontstyle: string = "Segoe UI,wf_segoe-ui_normal,helvetica,arial,sans-serif";
        let xAxisHeight: void =
            category.values.forEach((element: number) => {
                let measureTextProperties: any;
                measureTextProperties = {
                    fontFamily: fontstyle,
                    fontSize: PixelConverter.toString(12), text: category.values[element],
                };
                let xAxisWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties);
            });
        let yAxisHeight: void =
            category.values.forEach((element: number) => {
                let measureTextProperties: any = {
                    fontFamily: fontstyle, fontSize: PixelConverter.toString(12), text: category.values[element],
                };
                let yAxisWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties);
            });
        let dataValMax: number = 0;
        let targetValMax: number = 0;
        let fytargetValMax: number = 0;
        let dataValMin: number = 0;
        let targetValMin: number = 0;
        let fytargetValMin: number = 0;
        if (!!dataValue && !!dataValue.maxLocal) {
            dataValMax = <number>dataValue.maxLocal;
        }
        if (!!targetValue && !!targetValue.maxLocal) {
            targetValMax = <number>targetValue.maxLocal;
        }
        if (fytarget) {
            fytargetValMax = <number>fytarget;
        }
        if (!!dataValue && !!dataValue.minLocal) {
            dataValMin = <number>dataValue.minLocal;
        }
        if (!!targetValue && !!targetValue.minLocal) {
            targetValMin = <number>targetValue.minLocal;
        }
        if (fytarget) {
            fytargetValMin = <number>fytarget;
        }
        let dataMax: number = Math.max(dataValMax, targetValMax, fytargetValMax);
        let dataMin: number = Math.min(dataValMin, targetValMin, fytargetValMin);
        return {
            dataMax,
            dataMin,
            dataPoints: KPIColumnDataPoints,
            fytarget: <number>fytarget,
            settings: KPIColumnSettings
        };
    }
    function visualTransform(options: VisualUpdateOptions, host: IVisualHost, context: KPIColumn): IKPIColumnViewModel {
        let dataViews: DataView[] = options.dataViews;
        let defaultSettings: IKPIColumnSettings = {
            enableAxis: { show: false }
        };
        let viewModel: IKPIColumnViewModel = {
            dataMax: 0, dataMin: 0, dataPoints: [], fytarget: 0, settings: <IKPIColumnSettings>{}
        };
        if (!dataViews || !dataViews[0] || !dataViews[0].categorical || !dataViews[0].categorical.categories || !dataViews[0].categorical.categories[0].source || !dataViews[0].categorical.values
            || !dataViews[0].metadata) { return viewModel; }
        let categorical: DataViewCategorical = dataViews[0].categorical;
        const numberOfCategory: number = categorical.categories.length, numberOfValues: number = categorical.values.length; context.setYtdTarget = 0;
        let category: DataViewCategoryColumn = null; let forecasted: DataViewCategoryColumn = null;
        let categoryRoleLiteral: string = "category", forecastedRoleLiterral: string = "forecasted";
        let measureRoleLiteral: string = "measure", fytargetLiteral: string = "fytarget";
        let ytdtargetLiteral: string = "ytdtarget"; columnValue = categorical.values[2]; const tooltipData: string = "tooltipData";
        const tooltipValues: ITooltipDataPoints[] = []; const tooltipIndividualTargetValues: ITooltipDataPoints[] = [];
        let cnt: number = 0, lengthValues: number = 1;
        for (let iCounter: number = 0; iCounter < numberOfCategory; iCounter++) {
            if (categorical.categories[iCounter].source.roles[categoryRoleLiteral]) {
                category = categorical.categories[iCounter];
            } else if (categorical.categories[iCounter].source.roles[forecastedRoleLiterral]) { forecasted = categorical.categories[iCounter]; }
        }
        for (let iCounter: number = 0; iCounter < numberOfValues; iCounter++) {
            if (categorical.values[iCounter].source.roles[tooltipData]) {
                cnt++;
                lengthValues = categorical.values[iCounter].values.length;
                for (let jCnt: number = 0; jCnt < lengthValues; jCnt++) {
                    const tooltipDataPoint: ITooltipDataPoints = {
                        name: categorical.values[iCounter].source.displayName, value: <string>categorical.values[iCounter].values[jCnt]
                    };
                    tooltipValues.push(tooltipDataPoint);
                }
            }
        }
        const tooltips: any = [];
        xAxisName = categorical.categories[0].source.displayName;
        yAxisName = categorical.values[0].source.displayName;
        for (let valIterator: number = 0; valIterator < lengthValues; valIterator++) {
            const newValues: any = [];
            for (let iCnt: number = 0; iCnt < cnt; iCnt++) {
                if (iCnt === 0) {
                    newValues.push(tooltipValues[valIterator]);
                } else { newValues.push(tooltipValues[valIterator + iCnt * lengthValues]); }
            }
            tooltips.push(newValues);
        }
        const tooltipsIndividual: any = [];
        xAxisName = categorical.categories[0].source.displayName;
        yAxisName = categorical.values[0].source.displayName;
        for (let lenIndex: number = 0; lenIndex < lengthValues; lenIndex++) {
            const newValues: any = [];
            for (let iCnt: number = 0; iCnt < cnt; iCnt++) {
                if (iCnt === 0) {
                    newValues.push(tooltipIndividualTargetValues[lenIndex]);
                } else { newValues.push(tooltipIndividualTargetValues[lenIndex + iCnt * lengthValues]); }
            }
            tooltipsIndividual.push(newValues);
        }
        let values: any = []; let dataValue: DataViewValueColumn = null;
        let fytarget: PrimitiveValue = null, targetValue: DataViewValueColumn = null;
        let sum: number = 0, length: number = 0;
        for (let iCounter: number = 0; iCounter < numberOfValues; iCounter++) {
            if (categorical.values[iCounter].source.roles[measureRoleLiteral]) {
                length = categorical.values[iCounter].values.length;
                categorical.values[iCounter].values.forEach((d: any, iVal: number): void => {
                    if (iVal === 0) {
                        context.min = d; context.max = d;
                    }
                    if (d < context.min) { context.min = d; }
                    if (d > context.max) { context.max = d; }
                    values.push(d); sum = sum + d;
                });
                KPIColumn.thisObj.measureFormat = options.dataViews[0].categorical.values[iCounter].source.format;
                dataValue = categorical.values[iCounter];
            } else if (categorical.values[iCounter].source.roles[fytargetLiteral]) {
                fytarget = categorical.values[iCounter].maxLocal;
                context.isTargetAvailable = true;
                context.targetText = categorical.values[iCounter].source.displayName ?
                    categorical.values[iCounter].source.displayName : "";
            } else if (categorical.values[iCounter].source.roles[ytdtargetLiteral]) {
                KPIColumn.thisObj.targetFormat = options.dataViews[0].categorical.values[iCounter].source.format;
                context.setYtdTarget = 1;
                targetValue = categorical.values[iCounter];
                context.isITAvailable = true;
                context.itText = categorical.values[iCounter].source.displayName ?
                    categorical.values[iCounter].source.displayName : "";
            }
        }
        values = values.sort();
        if (values.length % 2 === 0) {
            context.median = (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
        } else {
            context.median = values[Math.floor(values.length / 2)];
        }
        context.average = sum / length;
        return subFunctionalityOfVisualTransform(context, options, dataViews, category, defaultSettings, cnt, tooltipValues, lengthValues, forecasted, host, targetValue, dataValue, fytarget);
    }
    /**
     *  used to display the visual
     */
    export class KPIColumn implements IVisual {
        public static thisObj: KPIColumn;
        public static config: any = {
            forecastedSolidOpacity: 0.6,
            forecastedTransparentOpacity: 0.4,
            margins: {
                bottom: 90,
                left: 50,
                right: 0,
                top: 0
            },
            solidOpacity: 1,
            transparentOpacity: 0.5,
            xAxisFontMultiplier: 0.04,
            xScalePadding: 0.1,
            yScalePadding: 0.1
        };
        public setYtdTarget: number;
        public measureFormat: string;
        public targetFormat: string;
        public isTargetAvailable: boolean;
        public targetText: string;
        public isITAvailable: boolean;
        public itText: string;
        public min: number = 0;
        public max: number = 0;
        public average: number = 0;
        public median: number = 0;
        public bContainer: d3.Selection<SVGElement>;
        public yMin: number = 0;
        public yMax: number = 0;
        private svg: d3.Selection<SVGElement>;
        private host: IVisualHost;
        private selectionManager: ISelectionManager;
        private KPIColumnContainer: d3.Selection<SVGElement>;
        private barContainer: d3.Selection<SVGElement>;
        private xAxis: d3.Selection<SVGElement>;
        private targetLines: d3.Selection<SVGElement>;
        private yAxis: d3.Selection<SVGElement>;
        private barDataPoints: IKPIColumnDataPoint[];
        private KPIColumnSettings: IKPIColumnSettings;
        private tooltipServiceWrapper: tooltip.ITooltipServiceWrapper;
        private locale: string;
        private dataViews: DataView;
        private xAxisFormatter: IValueFormatter;
        private yAxisFormatter: IValueFormatter;
        private baseDiv: d3.Selection<SVGElement>;
        private rootDiv: d3.Selection<SVGElement>;
        private legHeight: number = 0;
        private viewModel: IKPIColumnViewModel;
        // objects to handle selections
        private barSelection: d3.selection.Update<IKPIColumnDataPoint>;
        private barforecastedSelection: d3.selection.Update<IKPIColumnDataPoint>;
        private bars: any;
        private barforecasted: any;
        private circleData: IKPIColumnDataPoint[];

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
            this.selectionManager.registerOnSelectCallback(() => {
                this.barSelection = this.bars;
                this.barforecastedSelection = this.barforecasted;
                this.syncSelectionState(
                    this.barSelection,
                    this.barforecastedSelection,
                    <ISelectionId[]>this.selectionManager.getSelectionIds()
                );
            });

            this.tooltipServiceWrapper =
                tooltip.createTooltipServiceWrapper(this.host.tooltipService, options.element);

            this.rootDiv = d3.select(options.element)
                .append("div")
                .classed("rootDiv", true);

            this.rootDiv.append("div")
                .classed("legend", true);

            this.baseDiv = this.rootDiv
                .append("div")
                .classed("baseDiv", true);

            let svg: d3.Selection<SVGElement>;
            svg = this.svg = this.baseDiv
                .append("svg")
                .classed("KPIColumn", true)
                .style("width", 0);

            this.locale = options.host.locale;

            this.yAxis = svg.append("g")
                .classed("yAxis", true);

            this.xAxis = svg.append("g")
                .classed("xAxis", true);

            this.barContainer = svg.append("g")
                .classed("barContainer", true);

            this.targetLines = svg.append("g")
                .classed("targetLines", true);
        }

        public getDecimalPlacesCount(value: string): number {
            let decimalPlaces: number = 0;
            if (value && value.split(".").length > 1) {
                decimalPlaces = value.split(".")[1].length;
            }

            return decimalPlaces;
        }
        public subFuncOfAnalytics(options: VisualUpdateOptions, analytics: IAnalyticsSettings, param: any, legendSettings: ILegendSettings, legendItemWidth: number, ytdtargetHeight: number, paramText: string, analyticsClass: string, lineColor: any): void {
            if (param) {
                let lineText: string = paramText;
                let lineProp: TextProperties = {
                    fontFamily: legendSettings.fontFamily,
                    fontSize: PixelConverter.toString(legendSettings.labelSize),
                    text: paramText
                };
                lineText = textMeasurementService.getTailoredTextOrDefault(lineProp, legendItemWidth);
                let lineHeight: number = textMeasurementService.measureSvgTextHeight(lineProp);
                this.rootDiv.select(".legend").append("div").classed(analyticsClass, true)
                    .append("span").classed("legendInnerPart", true)
                    .style({
                        "background-color": lineColor,
                        "font-family": legendSettings.fontFamily,
                        "margin-top": PixelConverter.toString(ytdtargetHeight / 2),
                        "width": PixelConverter.toString(legendSettings.labelSize),
                        "height": legendHeight
                    }).attr("title", paramText + "Line");
                if (legendSettings.title) {
                    this.rootDiv.select("." + analyticsClass).append("span").classed("legendInnerPart", true)
                        .text(lineText).attr("title", paramText)
                        .style({
                            "color": legendSettings.labelColor,
                            "font-family": legendSettings.fontFamily,
                            "font-size": PixelConverter.toString(legendSettings.labelSize),
                            "height": PixelConverter.toString(lineHeight),
                            "max-width": PixelConverter.toString(legendItemWidth)
                        });
                }
            }
        }
        // Function to call Max, Avg, Median lines from analytics option
        public subFunctionalityOfAnalytics(options: VisualUpdateOptions, analytics: IAnalyticsSettings, legendSettings: ILegendSettings,
            legendItemWidth: number, ytdtargetHeight: number): void {
            this.subFuncOfAnalytics(options, analytics, analytics.max, legendSettings, legendItemWidth, ytdtargetHeight, "Max", "maxLegend", analytics.lineColorMax);
            this.subFuncOfAnalytics(options, analytics, analytics.avg, legendSettings, legendItemWidth, ytdtargetHeight, "Avg", "avgLegend", analytics.lineColorAvg);
            this.subFuncOfAnalytics(options, analytics, analytics.median, legendSettings, legendItemWidth, ytdtargetHeight, "Median", "medianLegend", analytics.lineColorMedian);
        }
        // Funtion for legend lines
        public subFunctionalityOfLegendSettings(options: VisualUpdateOptions, analytics: IAnalyticsSettings, legendSettings: ILegendSettings,
            yTDTargetConfig: ITargetSettings, legendHeight: number, marginForLegend: number, fullTargetConfig: ITargetSettings): void {
            let legendLineHeight = "1.5px";
            let legendNumber: number = 0;
            let doubleSpaceLiteral: string = "  ";
            if (analytics.min || analytics.max || analytics.avg) { legendNumber = legendNumber + 1; }
            let legendItemWidth: number;
            if (this.isITAvailable && this.isTargetAvailable) {
                legendNumber = legendNumber + 2;
                legendItemWidth = (options.viewport.width) / 2 - marginForLegend > 0 ? (options.viewport.width) / 2 - marginForLegend : 0;
            } else {
                legendNumber = legendNumber + 1;
                legendItemWidth = options.viewport.width - legendSettings.labelSize - (marginForLegend / 2);
            }
            let iTargetText: string = this.isITAvailable ? this.itText : ""; // this is for solid line
            let ytdtargetTextProps: TextProperties = {
                fontFamily: legendSettings.fontFamily,
                fontSize: PixelConverter.toString(legendSettings.labelSize),
                text: iTargetText,
            };
            iTargetText = textMeasurementService.getTailoredTextOrDefault(ytdtargetTextProps, legendItemWidth);
            let ytdtargetHeight: number = textMeasurementService.measureSvgTextHeight(ytdtargetTextProps);
            let fyTargetText: string = this.isTargetAvailable ? this.targetText : ""; // this is for dashed line
            let fytargetTextProps: TextProperties = {
                fontFamily: legendSettings.fontFamily,
                fontSize: PixelConverter.toString(legendSettings.labelSize),
                text: fyTargetText,
            };
            fyTargetText = textMeasurementService.getTailoredTextOrDefault(fytargetTextProps, legendItemWidth);
            let fyTargetTextHeight: number = textMeasurementService.measureSvgTextHeight(fytargetTextProps);
            if (this.isITAvailable && yTDTargetConfig.show) { // this is for solid line
                legendHeight = ytdtargetHeight;
                this.rootDiv.select(".legend").append("div").classed("yTDTargetLegend", true).append("span").classed("legendInnerPart", true)
                    .style({
                        "background-color": legendSettings.labelColor,
                        "font-family": legendSettings.fontFamily,
                        "margin-top": PixelConverter.toString(ytdtargetHeight / 2),
                        "width": PixelConverter.toString(legendSettings.labelSize),
                        "height": legendLineHeight
                    }).attr("title", this.itText);
                if (legendSettings.title) { // this is for individual target legend
                    this.rootDiv.select(".legend div").append("span").classed("legendInnerPart", true)
                        .text(doubleSpaceLiteral + iTargetText).attr("title", this.itText)
                        .style({
                            "color": legendSettings.labelColor,
                            "font-family": legendSettings.fontFamily,
                            "font-size": PixelConverter.toString(legendSettings.labelSize),
                            "height": PixelConverter.toString(legendHeight),
                            "max-width": PixelConverter.toString(legendItemWidth)
                        });
                }
            }
            if (this.isTargetAvailable && fullTargetConfig.show) { // this is for dashed line
                legendHeight = fyTargetTextHeight;
                this.rootDiv.select(".legend").append("div").classed("fullYearTargetLegend", true)
                    .append("span").text("---").classed("legendInnerPart", true)
                    .style({
                        "color": legendSettings.labelColor, "font-family": legendSettings.fontFamily,
                        "font-size": PixelConverter.toString(legendSettings.labelSize), "line-height": PixelConverter.toString(fyTargetTextHeight)
                    }).attr("title", this.targetText);
            }
            if (legendSettings.title) { // this is for target legend
                this.rootDiv.select(".legend .fullYearTargetLegend").append("span").classed("legendInnerPart", true)
                    .text(fyTargetText).attr("title", this.targetText)
                    .style({
                        "color": legendSettings.labelColor, "font-family": legendSettings.fontFamily,
                        "font-size": PixelConverter.toString(legendSettings.labelSize), "height": PixelConverter.toString(fyTargetTextHeight),
                        "max-width": PixelConverter.toString(legendItemWidth)
                    });
            }
            if (analytics.min) {
                let minLineText: string = "Min";
                let minLineProp: TextProperties = {
                    fontFamily: legendSettings.fontFamily,
                    fontSize: PixelConverter.toString(legendSettings.labelSize),
                    text: "Min",
                };
                minLineText = textMeasurementService.getTailoredTextOrDefault(minLineProp, legendItemWidth);
                const minLineTextHeight: number = textMeasurementService.measureSvgTextHeight(minLineProp);
                this.rootDiv.select(".legend").append("div").classed("minLegend", true)
                    .style({
                        "max-width": PixelConverter.toString(options.viewport.width / 2)
                    }).append("span").classed("legendInnerPart", true)
                    .style({
                        "background-color": analytics.lineColorMin, "font-family": legendSettings.fontFamily,
                        "margin-top": PixelConverter.toString(ytdtargetHeight / 2), "width": PixelConverter.toString(legendSettings.labelSize),
                        "height": legendLineHeight
                    }).attr("title", "Min Line");
                if (legendSettings.title) {
                    this.rootDiv.select(".legend .minLegend").append("span").classed("legendInnerPart", true).text(minLineText).attr("title", "Min")
                        .style({
                            "color": legendSettings.labelColor, "font-family": legendSettings.fontFamily,
                            "font-size": PixelConverter.toString(legendSettings.labelSize), "height": PixelConverter.toString(minLineTextHeight),
                            "max-width": PixelConverter.toString(legendItemWidth)
                        });
                }
            }
            this.subFunctionalityOfAnalytics(options, analytics, legendSettings, legendItemWidth, ytdtargetHeight);
            this.legHeight = legendHeight;
        }
        public subFuncOfHorizontalAnalytics(rightShift: number, analytics: IAnalyticsSettings, condParam: any, param: any, paramText: string, yScale: any, strokeText: any, strokeWidth: any, scrollableHeight: number, dataLabelText: string, labelYVal: number, xAxisTitleShift: number, margins: any): void {
            let viewModel: IKPIColumnViewModel = this.viewModel;
            if (condParam) {
                let line: d3.Selection<SVGElement> = this.targetLines.append("line").classed(paramText, true);
                let yVal: number = yScale(<number>param);
                const displayRightAdjuster: number = 18 + xAxisTitleShift;
                const analyticsStartAdjust: number = 8;
                const analyticsTextAdjust: number = analyticsStartAdjust + 2;
                const marginForWidth: number = 25;
                line.attr({
                    "stroke": strokeText,
                    "stroke-width": strokeWidth,
                    "x1": PixelConverter.toString(yVal + rightShift),
                    "x2": PixelConverter.toString(yVal + rightShift),
                    "y1": 0,
                    "y2": PixelConverter.toString(scrollableHeight)
                });
                let lineDataLabel: d3.Selection<SVGElement> = this.targetLines.append("text").text(this.yAxisFormatter.format(param)).classed(dataLabelText, true);
                lineDataLabel.attr({
                    fill: strokeText,
                    x: PixelConverter.toString(yVal - labelYVal - displayRightAdjuster + rightShift + xAxisTitleShift),
                    y: PixelConverter.toString(margins.left - analyticsTextAdjust)
                });
                lineDataLabel.append("title").text(param);
            }
        }
        public subFunctionalityOfHorizontalAnalytics(fullTargetConfig: ITargetSettings, rightShift: number, analytics: IAnalyticsSettings,
            scrollableHeight: number, yScale: any, xAxisTitleShift: number, labelYVal: number, margins: any): void {
            let viewModel: IKPIColumnViewModel = this.viewModel;
            let xTargetAxis: d3.Selection<SVGElement> = this.targetLines.append("line").classed("xTargetAxis", true);
            const marginForWidth: number = 25, displayRightAdjuster: number = 18 + xAxisTitleShift, analyticsStartAdjust: number = 8;
            const analyticsTextAdjust: number = analyticsStartAdjust + 2;
            if (fullTargetConfig.show && viewModel.fytarget) {
                let yVal: number = yScale(<number>viewModel.fytarget);
                xTargetAxis.attr({
                    "stroke": fullTargetConfig.lineColor,
                    "stroke-width": fullTargetConfig.strokeSize,
                    "x1": PixelConverter.toString(yVal + rightShift), "x2": PixelConverter.toString(yVal + rightShift),
                    "y1": 0, "y2": PixelConverter.toString(scrollableHeight)
                }).append("title").text(viewModel.fytarget);
                let targetLineDataLabel: d3.Selection<SVGElement> = this.targetLines.append("text").text(this.yAxisFormatter.format(viewModel.fytarget)).classed("TargetdataLabel", true);
                targetLineDataLabel.attr({
                    fill: fullTargetConfig.lineColor,
                    x: PixelConverter.toString(yVal - labelYVal - displayRightAdjuster + rightShift + xAxisTitleShift),
                    y: PixelConverter.toString(margins.left - analyticsTextAdjust)
                }).append("title").text(viewModel.fytarget);
            }
            this.subFuncOfHorizontalAnalytics(rightShift, analytics, analytics.min, this.min, "minLine", yScale, analytics.lineColorMin, analytics.strokeSizeMin, scrollableHeight, "minLinedataLabel", labelYVal, xAxisTitleShift, margins);
            this.subFuncOfHorizontalAnalytics(rightShift, analytics, analytics.max, this.max, "maxLine", yScale, analytics.lineColorMax, analytics.strokeSizeMax, scrollableHeight, "maxLinedataLabel", labelYVal, xAxisTitleShift, margins);
            this.subFuncOfHorizontalAnalytics(rightShift, analytics, analytics.avg, this.average, "avgLine", yScale, analytics.lineColorAvg, analytics.strokeSizeAvg, scrollableHeight, "maxLinedataLabel", labelYVal, xAxisTitleShift, margins);
            this.subFuncOfHorizontalAnalytics(rightShift, analytics, analytics.median, this.median, "medianLine", yScale, analytics.lineColorMedian, analytics.strokeSizeMedian, scrollableHeight, "medianLinedataLabel", labelYVal, xAxisTitleShift, margins);
            this.viewModel = viewModel;
        }
        public subFunctionalityOfHorizontalAnimation(animation: IAnimation, xScale: any, yScale: any, rightShift: number, barOrigin: number, transitionDuration: number): void {
            this.bars.enter().reverse().append("rect").classed("bar", true);
            let bars = this.bars.attr({
                fill: (d: any): void => d.color,
                height: xScale.rangeBand(),
                width: 0,
                x: (d: any) => d.value > 0 ? PixelConverter.toString(yScale(barOrigin) + rightShift)
                    : PixelConverter.toString(yScale(<number>d.value) + rightShift),
                y: (d: any) => { return PixelConverter.toString(xScale(d.category)); }
            });
            this.barforecasted.enter().reverse().append("rect").classed("barforecasted", true);
            let barForecasted = this.barforecasted.attr({
                fill: (d: any): any => d.color,
                height: xScale.rangeBand(),
                stroke: (d: any): any => d.color,
                width: 0,
                x: (d: any) => d.value > 0 ? PixelConverter.toString(yScale(barOrigin) + rightShift)
                    : PixelConverter.toString(yScale(<number>d.value) + rightShift),
                y: (d: any) => { return PixelConverter.toString(xScale(d.category)); }
            })

            if (animation.show) {
                bars.transition().duration(transitionDuration).ease("linear").attr({
                    y: (d: any) => {
                        return xScale(<number>d.category);
                    },
                    // tslint:disable-next-line:typedef
                    width: (d: any) => d.value > 0 ? yScale(<number>d.value) - yScale(barOrigin)
                        : yScale(barOrigin) - yScale(d.value)
                });
                barForecasted.transition().duration(transitionDuration).ease("linear").attr({
                    y: (d: any) => {
                        return xScale(d.category);
                    },
                    width: (d: any) => d.value > 0 ? yScale(<number>d.value) - yScale(barOrigin)
                        : yScale(barOrigin) - yScale(d.value)
                });
            }
            else {
                bars.attr({
                    y: (d: any) => {
                        return xScale(<number>d.category);
                    },
                    width: (d: any) => d.value > 0 ? yScale(<number>d.value) - yScale(barOrigin)
                        : yScale(barOrigin) - yScale(d.value)
                });
                barForecasted.attr({
                    y: (d: any) => {
                        return xScale(d.category);
                    },
                    width: (d: any) => d.value > 0 ? yScale(<number>d.value) - yScale(barOrigin)
                        : yScale(barOrigin) - yScale(d.value)
                });
            }
        }
        public subFunctionalityOfVerticalAnimation(animation: IAnimation, xScale: any, yScale: any, barOrigin: number, transitionDuration: number): void {
            this.bars.enter().append("rect").classed("bar", true);
            let bars = this.bars.attr({
                fill: (d: any): void => d.color,
                height: 0,
                width: xScale.rangeBand(),
                x: (d: any) => {
                    return xScale(d.category);
                },
                y: (d: any) => (d.value > 0) ? yScale(barOrigin) : yScale(<number>d.value)
            });
            this.barforecasted.enter().append("rect").classed("barforecasted", true);
            let barForecasted = this.barforecasted.attr({
                fill: (d: any): any => d.color,
                height: 0,
                stroke: (d: any): any => d.color,
                width: xScale.rangeBand(),
                x: (d: any) => { return xScale(d.category); },
                y: (d: any) => (d.value > 0) ? yScale(barOrigin) : yScale(<number>d.value)
            })
            if (animation.show) {
                bars.transition().duration(transitionDuration).ease("linear")
                    .attr({
                        y: (d: any) => (d.value < 0) ? yScale(barOrigin) : yScale(<number>d.value),
                        height: (d: any) => (<number>d.value < 0) ?
                            Math.abs(yScale(d.value) - yScale(barOrigin)) : Math.abs(yScale(barOrigin) - yScale(<number>d.value))
                    });

                barForecasted.transition().duration(transitionDuration).ease("linear")
                    .attr({
                        height: (d: any) => (<number>d.value < 0) ?
                            Math.abs(yScale(d.value) - yScale(barOrigin)) : Math.abs(yScale(barOrigin) - yScale(<number>d.value)),
                        y: (d: any) => (d.value < 0) ? yScale(barOrigin) : yScale(<number>d.value),
                    });
            }
            else {
                bars.attr({
                    y: (d: any) => (d.value < 0) ? yScale(barOrigin) : yScale(<number>d.value),
                    height: (d: any) => (<number>d.value < 0) ?
                        Math.abs(yScale(d.value) - yScale(barOrigin)) : Math.abs(yScale(barOrigin) - yScale(<number>d.value))
                });
                barForecasted.attr({
                    height: (d: any) => (<number>d.value < 0) ?
                        Math.abs(yScale(d.value) - yScale(barOrigin)) : Math.abs(yScale(barOrigin) - yScale(<number>d.value)),
                    y: (d: any) => (d.value < 0) ? yScale(barOrigin) : yScale(<number>d.value),
                });
            }
        }
        public subFunctionalityOfAllowSelection(chartBackground: any, xScale: any, yScale: any, yTDTargetConfig: ITargetSettings,
            lineDataPoints: any, linePoints: string, scrollableHeight: number, backgroundImage: IBackgroundImage, width: number, margins: any, rightShift: number,
            ytdLine: d3.Selection<SVGElement>, xAxis: d3.svg.Axis, xAxisTitleShift: number, barWidths: number, minHeightForVertical: number,
            textTailoredWidth: number, parseIntValue: number, textWordBreakWidth: number): void {

            let viewModel: IKPIColumnViewModel = this.viewModel;
            let circleData: IKPIColumnDataPoint[] = this.circleData;
            this.bars.exit().remove();
            this.barforecasted.exit().remove();
            const imageRightMargin: number = 100 + xAxisTitleShift;
            chartBackground.attr({
                height: PixelConverter.toString(scrollableHeight),
                opacity: backgroundImage.transparency / 100,
                preserveAspectRatio: "none",
                width: PixelConverter.toString(width - imageRightMargin),
                x: margins.left + rightShift, y: 0,
            });
            lineDataPoints = [];
            for (let ytdIterator = 0, len = viewModel.dataPoints.length; ytdIterator < len; ytdIterator++) {
                if (viewModel.dataPoints[ytdIterator].ytd || viewModel.dataPoints[ytdIterator].ytd === 0) {
                    lineDataPoints.push({
                        x1: xScale(viewModel.dataPoints[ytdIterator].category) + (xScale.rangeBand() / 2),
                        y1: yScale(<number>viewModel.dataPoints[ytdIterator].ytd)
                    });
                }
            }
            for (let lineIterator = 0; lineIterator < lineDataPoints.length; lineIterator++) {
                if (yTDTargetConfig.show) {
                    let circle: d3.Selection<SVGElement>;
                    circle = this.targetLines.append("circle").classed("circle", true)
                        .attr({
                            cx: lineDataPoints[lineIterator].y1 + rightShift,
                            cy: lineDataPoints[lineIterator].x1,
                            r: yTDTargetConfig.strokeSize + 1
                        });
                }
                linePoints += `${lineDataPoints[lineIterator].y1 + rightShift},${lineDataPoints[lineIterator].x1} `;
            }

            const circles: d3.selection.Update<IKPIColumnDataPoint> = this.targetLines.selectAll(".circle").data(circleData);
            if (yTDTargetConfig.show) {
                ytdLine = this.targetLines.append("polyline");
                ytdLine.attr({
                    "fill": "none",
                    "points": linePoints,
                    "stroke": yTDTargetConfig.lineColor,
                    "stroke-width": yTDTargetConfig.strokeSize
                });
            }
            // X-axis
            xAxis = d3.svg.axis().scale(xScale).orient("left");
            const xAxisShift: number = 100 + xAxisTitleShift;
            const translateLeft: string = `translate(${xAxisShift},0)`;
            this.xAxis.attr("transform", translateLeft).call(xAxis);
            this.xAxis.selectAll("path").classed("path", true);
            this.svg.selectAll(".xAxis .tick").append("title").text((d: any): string => { return d.toString(); });
            if (barWidths < minHeightForVertical) {
                this.xAxis.attr("transform", translateLeft);
                this.svg.selectAll(".xAxis .tick text")
                    .text((d: any): string => {
                        if (d.toString().length <= 13) {
                            return d.toString();
                        } else {
                            let textProperties: TextProperties;
                            textProperties = { fontFamily: "sans-serif", fontSize: "12px", text: d.toString() };
                            return textMeasurementService.getTailoredTextOrDefault(textProperties, textTailoredWidth);
                        }
                    }).style("text-anchor", "end");
            } else {
                const boxes: d3.Selection<SVGElement> = this.svg.selectAll(".barContainer rect");
                const adjustedbarWidthValue: number = 90;
                if (boxes[0].length) {
                    const barWidthValue: number = parseInt(boxes.attr("width"), parseIntValue) + adjustedbarWidthValue;
                    let xTicksLabels: any = this.svg.selectAll(".xAxis .tick text")[0];
                    let len = xTicksLabels.length - 1;
                    while (len >= 0) {
                        let xAxisLabel: any;
                        xAxisLabel = xTicksLabels[len];
                        xAxisLabel.style.textAnchor = "left";
                        textMeasurementService.wordBreak(xAxisLabel, barWidthValue, textWordBreakWidth);
                        len--;
                    }
                }
            }
            this.viewModel = viewModel;
            this.circleData = circleData;
        }
        public subFunctionalityOfVerticalAllowSelection(chartBackground: any, xScale: any, yScale: any, yTDTargetConfig: ITargetSettings,
            lineDataPoints: any, linePoints: string, backgroundImage: IBackgroundImage, margins: any,
            ytdLine: d3.Selection<SVGElement>, xAxis: d3.svg.Axis, barWidths: number, textTailoredWidth: number, parseIntValue: number,
            textWordBreakWidth: number, dynamicWidth: number, minWidthForVertical: number, height: number, yAxisConfig: IYAxisSettings): void {

            let viewModel: IKPIColumnViewModel = this.viewModel;
            let circleData: IKPIColumnDataPoint[] = this.circleData;
            this.bars.exit().remove();
            this.barforecasted.exit().remove();
            chartBackground.attr({
                height: PixelConverter.toString($(".yAxis")[0].getBoundingClientRect().height),
                opacity: backgroundImage.transparency / 100,
                preserveAspectRatio: "none",
                width: PixelConverter.toString(dynamicWidth - margins.left),
                x: margins.left, y: 10
            });
            lineDataPoints = [];
            for (let ytdIndex = 0, len = viewModel.dataPoints.length; ytdIndex < len; ytdIndex++) {
                if (viewModel.dataPoints[ytdIndex].ytd || viewModel.dataPoints[ytdIndex].ytd === 0) {
                    lineDataPoints.push({
                        x1: xScale(viewModel.dataPoints[ytdIndex].category) + (xScale.rangeBand() / 2),
                        y1: yScale(<number>viewModel.dataPoints[ytdIndex].ytd)
                    });
                }
            }
            for (let yIndex = 0; yIndex < lineDataPoints.length; yIndex++) {
                if (yTDTargetConfig.show) {
                    let circle: d3.Selection<SVGElement> = this.targetLines.append("circle").classed("circle", true)
                        .attr({
                            cx: lineDataPoints[yIndex].x1,
                            cy: lineDataPoints[yIndex].y1,
                            r: yTDTargetConfig.strokeSize + 1
                        });
                }
                linePoints += `${lineDataPoints[yIndex].x1},${lineDataPoints[yIndex].y1} `;
            }
            const circles: any = this.targetLines.selectAll(".circle").data(circleData);
            if (yTDTargetConfig.show) {
                ytdLine = this.targetLines.append("polyline");
                ytdLine.attr({
                    "fill": "none",
                    "points": linePoints,
                    "stroke": yTDTargetConfig.lineColor,
                    "stroke-width": yTDTargetConfig.strokeSize
                });
            }
            // X-axis
            xAxis = d3.svg.axis().scale(xScale).orient("bottom");
            let translateHeight: string = `translate(0, ${yScale(yAxisConfig.start)} )`;
            this.xAxis.attr("transform", translateHeight).call(xAxis);
            this.xAxis.selectAll("path").classed("path", true);
            this.svg.selectAll(".xAxis .tick").append("title")
                .text((d: any): string => { return d.toString(); });
            translateHeight = `translate(-10, ${height})`;
            if (barWidths < minWidthForVertical) {
                this.svg.selectAll(".xAxis .tick text")
                    .text((d: any): string => {
                        if (d.toString().length <= 10) {
                            return d.toString();
                        } else {
                            let textProperties: TextProperties;
                            textProperties = {
                                fontFamily: "sans-serif",
                                fontSize: "12px",
                                text: d.toString(),
                            };
                            return textMeasurementService.getTailoredTextOrDefault(textProperties, textTailoredWidth);
                        }
                    }).attr("transform", "rotate(-45)").style("text-anchor", "end");
            } else {
                let boxes: d3.Selection<SVGElement> = this.svg.selectAll(".barContainer rect");
                if (boxes[0].length) {
                    const barWidthValue: number = parseInt(boxes.attr("width"), parseIntValue);
                    const xTicksLabels: any = this.svg.selectAll(".xAxis .tick text")[0];
                    let len = xTicksLabels.length - 1;
                    while (len >= 0) {
                        let xAxisLabel: any = xTicksLabels[len];
                        xAxisLabel.style.textAnchor = "middle";
                        textMeasurementService.wordBreak(xAxisLabel, barWidthValue, textWordBreakWidth);
                        len--;
                    }
                }
            }
            this.viewModel = viewModel;
            this.circleData = circleData;
        }
        public subFunctionalityOfDatalabels(dataLabels: IDataLabels, xScale: any, yScale: any, barOrigin: number, rightShift: number,
            marginForDataLabel: number, parseIntValue: number): void {
            let viewModel: IKPIColumnViewModel = this.viewModel;
            if (dataLabels.show) {
                let measureFormat: string = this.measureFormat;
                let targetLinesHeight: string = $(".xTargetAxis").attr("y1");
                let displayValLabels: number;
                if (dataLabels.displayUnits === 0) {
                    const valLen: number = viewModel.dataMax.toString().length;
                    displayValLabels = this.getAutoDisplayUnits(valLen);
                }
                let formatter: IValueFormatter = valueFormatter.create({
                    format: measureFormat ? measureFormat : valueFormatter.DefaultNumericFormat,
                    precision: dataLabels.valueDecimal,
                    value: dataLabels.displayUnits === 0 ? displayValLabels : dataLabels.displayUnits
                });
                const centerDataLabelAdjust: number = 90;
                const endDataLabelAdjust: number = 15;
                const baseDataLabelAdjust: number = 10;
                const barMiddleAdjust: number = 3;
                const yCoordinateAdjust: number = 62;
                let labelMargin: any = { top: 20, right: 10, left: 2 };
                this.barContainer.append("g").classed("labelGraphicContext", true)
                    .selectAll("text").data(viewModel.dataPoints).enter()
                    .append("text").classed("dataLabel", true).style("fill", dataLabels.fontColor)
                    .text((d: any): string => {
                        let labelFormattedText: string = formatter.format(d.value);
                        let textproperties: TextProperties = {
                            fontFamily: dataLabels.fontFamily,
                            fontSize: PixelConverter.toString(dataLabels.fontSize),
                            text: labelFormattedText,
                        };
                        const dataTextHeight: number = textMeasurementService.measureSvgTextHeight(textproperties);
                        // tslint:disable-next-line:typedef
                        let barheight: number = d.value > 0 ? yScale(<number>d.value) - yScale(barOrigin) : yScale(barOrigin) - yScale(d.value);
                        // tslint:disable-next-line:no-unused-expression
                        textproperties.text = barheight < dataTextHeight ? "" : textproperties.text;
                        return textMeasurementService.getTailoredTextOrDefault(textproperties, 50);
                    }).attr({
                        "dataBarY": (d: any): any => yScale(<number>d.value) + yCoordinateAdjust,
                        "font-family": dataLabels.fontFamily,
                        "font-size": PixelConverter.toString(dataLabels.fontSize),
                        "x": (d: any): any => d.value >= 0 ?
                            (dataLabels.position === "insideCenter" ? d.value === 0 ? yScale(barOrigin) + (dataLabels.fontSize / 2) +
                                baseDataLabelAdjust + rightShift : (yScale(<number>d.value) + yScale(barOrigin)) / 2 + centerDataLabelAdjust :
                                dataLabels.position === "insideEnd" ? d.value === 0 ? yScale(barOrigin) + (dataLabels.fontSize / 2) +
                                    baseDataLabelAdjust + rightShift : yScale(<number>d.value) + yCoordinateAdjust + (dataLabels.fontSize / 2) :
                                    yScale(barOrigin) + (dataLabels.fontSize / 2) + baseDataLabelAdjust + rightShift)
                            : (dataLabels.position === "insideCenter" ? d.value === 0 ? yScale(barOrigin) - (dataLabels.fontSize / 2) +
                                rightShift - marginForDataLabel : ((yScale(<number>d.value) + yScale(barOrigin)) / 2) + rightShift :
                                dataLabels.position === "insideEnd" ? d.value === 0 ? yScale(barOrigin) - (dataLabels.fontSize / 2) +
                                    rightShift - marginForDataLabel : yScale(<number>d.value) + endDataLabelAdjust + rightShift :
                                    yScale(barOrigin) - (dataLabels.fontSize / 2) + rightShift - marginForDataLabel),
                        "y": (d: any): any => xScale(d.category) + xScale.rangeBand() / 2 + barMiddleAdjust,
                    }).append("title").text((d: IKPIColumnDataPoint): number => <number>d.value);
                $(".labelGraphicContext").find("text").each(function (): void {
                    let labelWidth: number = dataLabels.fontSize / 2;
                    let barlabel: string = $(this).attr("x");
                    const yValue: any = $(this).attr("dataBarY");
                    const yNum: number = parseInt(yValue, parseIntValue);
                    let diff: number = parseInt(barlabel, parseIntValue) - 0;
                    if (diff < labelWidth) { $(this).attr("x", parseInt(barlabel, parseIntValue)); }
                });
            }
            this.tooltipServiceWrapper.addTooltip(
                this.barContainer.selectAll(".bar,.barforecasted"),
                (tooltipEvent: tooltip.TooltipEventArgs<IKPIColumnDataPoint>) => this.getTooltipData(tooltipEvent.data),
                (tooltipEvent: tooltip.TooltipEventArgs<IKPIColumnDataPoint>) => tooltipEvent.data.selectionId);
            this.tooltipServiceWrapper.addTooltip(this.targetLines.selectAll(".circle"),
                (tooltipEvent:
                    tooltip.TooltipEventArgs<IKPIColumnDataPoint>) => this.getTooltipIndividualTargetData(tooltipEvent.data),
                (tooltipEvent:
                    tooltip.TooltipEventArgs<IKPIColumnDataPoint>) => tooltipEvent.data.selectionId);
        }
        public subFunctionalityOfVerticalDatalabels(dataLabels: IDataLabels, xScale: any, yScale: any, barOrigin: number, barWidths: number, parseIntValue: number): void {
            let viewModel: IKPIColumnViewModel = this.viewModel;
            if (dataLabels.show) {
                let measureFormat: string = this.measureFormat;
                let targetLinesHeight: string = $(".xTargetAxis").attr("y1");
                let displayValLabels: number = 0;
                if (dataLabels.displayUnits === 0) {
                    const valLen: number = viewModel.dataMax.toString().length;
                    displayValLabels = this.getAutoDisplayUnits(valLen);
                }
                let formatter: IValueFormatter = valueFormatter.create({
                    format: measureFormat ? measureFormat : valueFormatter.DefaultNumericFormat,
                    precision: dataLabels.valueDecimal,
                    value: dataLabels.displayUnits === 0 ? displayValLabels : dataLabels.displayUnits
                });
                const baseDataLabelAdjust: number = 10;
                const barMiddleAdjust: number = 2;
                let labelMargin: any = { top: 20, right: 10, left: 2 };
                this.barContainer.append("g").classed("labelGraphicContext", true).selectAll("text").data(viewModel.dataPoints)
                    .enter().append("text").classed("dataLabel", true).style("fill", dataLabels.fontColor)
                    .text((d: any): string => {
                        let barheight: number;
                        let labelFormattedText: string = formatter.format(d.value);
                        let textproperties: TextProperties = {
                            fontFamily: dataLabels.fontFamily,
                            fontSize: PixelConverter.toString(dataLabels.fontSize),
                            text: labelFormattedText,
                        };
                        const dataTextHeight: number = textMeasurementService.measureSvgTextHeight(textproperties);
                        barheight = (<number>d.value < 0) ? (yScale(d.value) - yScale(barOrigin)) : yScale(barOrigin) - yScale(<number>d.value);
                        textproperties.text = barheight < dataTextHeight ? "" : textproperties.text;
                        return textMeasurementService.getTailoredTextOrDefault(textproperties, barWidths);
                    }).attr({
                        "font-family": dataLabels.fontFamily,
                        "font-size": PixelConverter.toString(dataLabels.fontSize),
                        "x": (d: any): any => xScale(d.category) + xScale.rangeBand() / 2 + barMiddleAdjust,
                        "y": (d: any): any => d.value >= 0 ?
                            (dataLabels.position === "insideCenter" ? d.value === 0 ? yScale(barOrigin) + (dataLabels.fontSize / 2) - baseDataLabelAdjust :
                                yScale(<number>d.value - (<number>d.value - barOrigin) / 2) + (dataLabels.fontSize / 2)
                                : dataLabels.position === "insideEnd" ? d.value === 0 ? yScale(barOrigin) + (dataLabels.fontSize / 2) - baseDataLabelAdjust :
                                    yScale(<number>d.value) + (dataLabels.fontSize / 2) + baseDataLabelAdjust
                                    : yScale(barOrigin) + (dataLabels.fontSize / 2) - baseDataLabelAdjust
                            ) :
                            (dataLabels.position === "insideCenter" ? d.value === 0 ?
                                yScale(barOrigin) + (dataLabels.fontSize / 2) + baseDataLabelAdjust : yScale(<number>d.value - (<number>d.value - barOrigin) / 2)
                                + (dataLabels.fontSize / 2) : dataLabels.position === "insideEnd" ? d.value === 0 ?
                                    yScale(barOrigin) + (dataLabels.fontSize / 2) + baseDataLabelAdjust : yScale(<number>d.value)
                                    + (dataLabels.fontSize / 2) - baseDataLabelAdjust : yScale(barOrigin) + (dataLabels.fontSize / 2) + baseDataLabelAdjust
                            ),
                    }).append("title").text((d: IKPIColumnDataPoint): number => <number>d.value);
                $(".labelGraphicContext").find("text").each(function (): void {
                    const labelHeight: number = $(this).height();
                    const barlabel: string = $(this).attr("y");
                    // Convert barlabel to integer and store in diff
                    const diff: number = parseInt(barlabel, parseIntValue) - 0;
                    if (diff < labelHeight) { $(this).attr("y", parseInt(barlabel, parseIntValue)); }
                });
            }
            this.tooltipServiceWrapper.addTooltip(
                this.barContainer.selectAll(".bar,.barforecasted"),
                (tooltipEvent: tooltip.TooltipEventArgs<IKPIColumnDataPoint>) =>
                    this.getTooltipData(tooltipEvent.data),
                (tooltipEvent: tooltip.TooltipEventArgs<IKPIColumnDataPoint>) =>
                    tooltipEvent.data.selectionId);
            this.tooltipServiceWrapper.addTooltip(
                this.targetLines.selectAll(".circle"),
                (tooltipEvent: tooltip.TooltipEventArgs<IKPIColumnDataPoint>) =>
                    this.getTooltipIndividualTargetData(tooltipEvent.data),
                (tooltipEvent: tooltip.TooltipEventArgs<IKPIColumnDataPoint>) =>
                    tooltipEvent.data.selectionId);
        }
        public subFunctionalityOfVerticalAnalytics(options: VisualUpdateOptions, analytics: IAnalyticsSettings, legendSettings: ILegendSettings,
            margins: any, dynamicWidth: number, labelYVal: number, fullTargetConfig: ITargetSettings, yScale: any): void {
            let xTargetAxis: d3.Selection<SVGElement> = this.targetLines.append("line").classed("xTargetAxis", true);
            let viewModel: IKPIColumnViewModel = this.viewModel
            if (fullTargetConfig.show && viewModel.fytarget) {
                let yVal: number = yScale(<number>viewModel.fytarget);
                xTargetAxis.attr({
                    "stroke": fullTargetConfig.lineColor,
                    "stroke-width": fullTargetConfig.strokeSize,
                    "x1": margins.left, "x2": dynamicWidth, "y1": yVal, "y2": yVal
                }).append("title").text(viewModel.fytarget);
                let targetLineDataLabel: d3.Selection<SVGElement> = this.targetLines
                    .append("text").text(this.yAxisFormatter.format(viewModel.fytarget))
                    .classed("TargetdataLabel", true);
                targetLineDataLabel.attr({
                    fill: fullTargetConfig.lineColor,
                    x: margins.left, y: yVal - labelYVal
                });
                targetLineDataLabel.append("title").text(viewModel.fytarget);
            }
            if (analytics.min) {
                let minLine: d3.Selection<SVGElement> = this.targetLines.append("line").classed("minLine", true);
                let yValMin: number = yScale(<number>this.min);
                minLine.attr({
                    "stroke": analytics.lineColorMin,
                    "stroke-width": analytics.strokeSizeMin,
                    "x1": margins.left, "x2": dynamicWidth, "y1": yValMin, "y2": yValMin
                });
                let minLinedataLabel: d3.Selection<SVGElement> = this.targetLines
                    .append("text").text(this.yAxisFormatter.format(this.min)).classed("minLinedataLabel", true);
                minLinedataLabel.attr({
                    fill: analytics.lineColorMin,
                    x: margins.left, y: yValMin - labelYVal
                });
                minLinedataLabel.append("title").text(this.min);
            }
            if (analytics.max) {
                let maxLine: d3.Selection<SVGElement> = this.targetLines.append("line").classed("maxLine", true);
                let yValMax: number = yScale(<number>this.max);
                maxLine.attr({
                    "stroke": analytics.lineColorMax,
                    "stroke-width": analytics.strokeSizeMax,
                    "x1": margins.left, "x2": dynamicWidth, "y1": yValMax, "y2": yValMax
                });
                let maxLinedataLabel: d3.Selection<SVGElement> = this.targetLines
                    .append("text").text(this.yAxisFormatter.format(this.max)).classed("maxLinedataLabel", true);
                maxLinedataLabel.attr({
                    fill: analytics.lineColorMax,
                    x: margins.left, y: yValMax - labelYVal
                });
                maxLinedataLabel.append("title").text(this.max);
            }
            if (analytics.avg) {
                let avgLine: d3.Selection<SVGElement> = this.targetLines.append("line").classed("avgLine", true);
                let yValAvg: number = yScale(<number>this.average);
                avgLine.attr({
                    "stroke": analytics.lineColorAvg,
                    "stroke-width": analytics.strokeSizeAvg,
                    "x1": margins.left, "x2": dynamicWidth, "y1": yValAvg, "y2": yValAvg,
                });
                let avgLinedataLabel: d3.Selection<SVGElement> = this.targetLines
                    .append("text").text(this.yAxisFormatter.format(this.average)).classed("maxLinedataLabel", true);
                avgLinedataLabel.attr({
                    fill: analytics.lineColorAvg,
                    x: margins.left, y: yValAvg - labelYVal
                });
                avgLinedataLabel.append("title").text(this.average);
            }
            if (analytics.median) {
                let medianLine: d3.Selection<SVGElement> = this.targetLines.append("line").classed("medianLine", true);
                let yValMedian: any = yScale(<number>this.median);
                medianLine.attr({
                    "stroke": analytics.lineColorMedian,
                    "stroke-width": analytics.strokeSizeMedian,
                    "x1": margins.left, "x2": dynamicWidth, "y1": yValMedian, "y2": yValMedian
                });
                let medianLinedataLabel: d3.Selection<SVGElement> = this.targetLines
                    .append("text").text(this.yAxisFormatter.format(this.median)).classed("medianLinedataLabel", true);
                medianLinedataLabel.attr({
                    fill: analytics.lineColorMedian,
                    x: margins.left, y: yValMedian - labelYVal
                });
                medianLinedataLabel.append("title").text(this.median);
            }
            this.viewModel = viewModel;
        }

        public subFunctionalityOfHorizontalShow(xScale: any, yScale: any, margins: any, height: number, width: number, barWidths: number, minVisibleBarWidth: number,
            minHeightForHorizontal: number, horizontalEndRange: number, minWidthForHorizontal: number, widthForScroll: number, xAxisConfig: IXAxisSettings, yAxisConfig: IYAxisSettings, fullTargetConfig: ITargetSettings, analytics: IAnalyticsSettings, options: VisualUpdateOptions, yAxis: any, xAxis: any, parseIntValue: number, backgroundImage: IBackgroundImage,
            animation: IAnimation, thisObj: this, marginForYAxis: number, labelYVal: number, barOrigin: number, transitionDuration: number, yTDTargetConfig: ITargetSettings, lineDataPoints: any, linePoints: string, ytdLine: d3.Selection<SVGElement>, dataLabels: IDataLabels,
            minHeightForVertical: number, textTailoredWidth: number, marginForDataLabel: number, textWordBreakWidth: number): void {
            let viewModel: IKPIColumnViewModel = this.viewModel;
            barWidths = xScale.rangeBand();
            let scrollableHeight: number, flag: boolean = true;
            const axisDisplayHeight: number = 50;
            if (barWidths < minVisibleBarWidth) {
                barWidths = minVisibleBarWidth; height = minHeightForHorizontal; scrollableHeight = height;
                xScale.rangeBands([scrollableHeight, horizontalEndRange], 0.2, 0.3);
            } else {
                scrollableHeight = height; flag = false;
                xScale.rangeBands([scrollableHeight, horizontalEndRange], 0.2, 0.3);
            }
            this.rootDiv.select(".KPIColumn").style("height", PixelConverter.toString(scrollableHeight + axisDisplayHeight));
            this.rootDiv.select(".baseDiv").style("height", PixelConverter.toString(scrollableHeight + axisDisplayHeight));
            if (width < minWidthForHorizontal) { width = minWidthForHorizontal; }
            this.rootDiv.select(".baseDiv").style("width", PixelConverter.toString(width - widthForScroll));
            this.rootDiv.select(".KPIColumn").style("width", PixelConverter.toString(width - widthForScroll));
            let xAxisTitleShift: number = 0, xAxisTitleMargin: number = 140, xAxisTitleXPosition: number = 17;
            if (xAxisConfig.title) {
                xAxisTitleShift = xAxisConfig.fontSize * 1.2; innerWidth -= margins.left;
                this.svg.append("text").classed("xTitle", true).text(xAxisName)
                    .attr("transform", `translate(${xAxisTitleXPosition},${(scrollableHeight + xAxisTitleMargin) / 2}) rotate(-90)`)
                    .style({
                        "color": xAxisConfig.fontColor,
                        "font-family": xAxisConfig.fontFamily, "font-size": PixelConverter.toString(xAxisConfig.fontSize), "max-width": PixelConverter.toString(options.viewport.width / 2)
                    }).append("title").text(xAxisName);
            } // Y scale
            if (width <= minWidthForHorizontal) { // set overflow to auto when width gets lower than limit
                this.rootDiv.style("overflow-x", "auto");
                yScale = d3.scale.linear().domain([(<number>yAxisConfig.start), (<number>yAxisConfig.end) * 1.12]).range([margins.left, width - margins.left - marginForYAxis]);
            } else {
                yScale = d3.scale.linear().domain([(<number>yAxisConfig.start), (<number>yAxisConfig.end) * 1.12]).range([margins.left, width - margins.left]);
            }
            const rightShift: number = 70 + xAxisTitleShift;
            this.viewModel = viewModel;
            this.subFunctionalityOfHorizontalAnalytics(fullTargetConfig, rightShift, analytics, scrollableHeight, yScale, xAxisTitleShift, labelYVal, margins);
            this.svg.selectAll(".xAxisText").remove();
            yAxis = d3.svg.axis().scale(yScale).orient("bottom").tickFormat(this.yAxisFormatter.format).ticks(options.viewport.height / 80);// Format Y Axis labels and render Y Axis labels
            const translate: number = margins.left; const translateHeight: string = `translate(${rightShift},${scrollableHeight})`;
            this.yAxis.attr("transform", translateHeight).call(yAxis);
            this.yAxis.selectAll("path").classed("path", true);
            let yTitleTooltip: IValueFormatter = valueFormatter.create({ format: options.dataViews[0].categorical.values[0].source.format });
            let yTicks: any; yTicks = this.svg.selectAll(".yAxis .tick");
            yTicks.append("title").text((d: string) => { return yTitleTooltip.format(d); });
            const adjustBar: number = 30, tickLeng: number = yTicks.size();
            for (let tickIterator = 0; tickIterator < tickLeng; tickIterator++) {
                let yCoordinate: string = yTicks[0][tickIterator].getAttribute("transform").substring(10, yTicks[0][tickIterator].getAttribute("transform").length - 3);
                if (parseFloat(yCoordinate) !== (viewModel.fytarget && yScale(<number>viewModel.fytarget)) || !fullTargetConfig.show) {
                    if (yAxisConfig.gridLines) {
                        this.xAxis.append("line").classed("yAxisGrid", true).attr({
                            x1: PixelConverter.toString(parseInt(yCoordinate, parseIntValue) - adjustBar),
                            x2: PixelConverter.toString(parseInt(yCoordinate, parseIntValue) - adjustBar),
                            y1: 0, y2: PixelConverter.toString(scrollableHeight)
                        });
                    }
                }
            }
            const marginsForYAxisTitle: number = 50;
            if (yAxisConfig.title) {
                this.svg.append("text").classed("yTitle", true).text(yAxisName)
                    .attr("transform", `translate(${yScale(yAxisConfig.end) / 2 + marginsForYAxisTitle},${scrollableHeight + axisDisplayHeight})`)
                    .style({
                        "color": yAxisConfig.fontColor, "font-family": yAxisConfig.fontFamily, "font-size": PixelConverter.toString(yAxisConfig.fontSize)
                    }).append("title").text(yAxisName);
            }
            let validImage: boolean = imagePatt.test(backgroundImage.imageUrl);
            const chartBackground: any = this.barContainer.append("image").attr("xlink:href", validImage ? backgroundImage.imageUrl : "");
            let barData: IKPIColumnDataPoint[] = [], barforecastedData: IKPIColumnDataPoint[] = [];
            let circleData: IKPIColumnDataPoint[] = [];
            for (let forecastIndex = 0; forecastIndex < viewModel.dataPoints.length; forecastIndex++) {
                if (viewModel.dataPoints[forecastIndex].forecasted !== 1) {
                    barData.push(viewModel.dataPoints[forecastIndex]);
                } else { barforecastedData.push(viewModel.dataPoints[forecastIndex]); }
                circleData.push(viewModel.dataPoints[forecastIndex]);
            }
            this.bars = this.barContainer.selectAll(".bar").data(barData);
            this.barforecasted = this.barContainer.selectAll(".barforecasted").data(barforecastedData);
            this.subFunctionalityOfHorizontalAnimation(animation, xScale, yScale, rightShift, barOrigin, transitionDuration); // animation check
            this.barforecasted.on("click", (d: any): void => {
                if (allowInteractions) { // Allow selection only if the visual is rendered in a view that supports interactivity (e.g. Report)
                    selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                        thisObj.barSelection = thisObj.bars; thisObj.barforecastedSelection = thisObj.barforecasted;
                        thisObj.syncSelectionState(thisObj.barSelection, thisObj.barforecastedSelection, ids);
                    }); (<Event>d3.event).stopPropagation();
                }
            });
            this.bars.on("click", (d: any): void => { //This must be an anonymous function instead of a lambda because d3 uses 'this' as the reference to the element that was clicked.
                if (allowInteractions) { // Allow selection only if the visual is rendered in a view that supports interactivity (e.g. Report)
                    selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                        thisObj.barSelection = thisObj.bars; thisObj.barforecastedSelection = thisObj.barforecasted;
                        thisObj.syncSelectionState(thisObj.barSelection, thisObj.barforecastedSelection, ids);
                    }); (<Event>d3.event).stopPropagation();
                }
            });
            this.circleData = circleData;
            this.subFunctionalityOfAllowSelection(chartBackground, xScale, yScale, yTDTargetConfig, lineDataPoints, linePoints, scrollableHeight, backgroundImage,
                width, margins, rightShift, ytdLine, xAxis, xAxisTitleShift, barWidths, minHeightForVertical, textTailoredWidth, parseIntValue, textWordBreakWidth);
            this.subFunctionalityOfDatalabels(dataLabels, xScale, yScale, barOrigin, rightShift, marginForDataLabel, parseIntValue); // datalabels
            let selectionManager: ISelectionManager = this.selectionManager; let allowInteractions: boolean = this.host.allowInteractions;
        }
        public subFunctionalityOfVerticalShow(xScale: any, yScale: any, margins: any, height: number, width: number, barWidths: number, minVisibleBarWidth: number,
            horizontalEndRange: number, widthForScroll: number, xAxisConfig: IXAxisSettings, yAxisConfig: IYAxisSettings, fullTargetConfig: ITargetSettings, analytics: IAnalyticsSettings, options: VisualUpdateOptions, yAxis: any, xAxis: any, parseIntValue: number, backgroundImage: IBackgroundImage,
            animation: IAnimation, thisObj: this, labelYVal: number, barOrigin: number, transitionDuration: number, yTDTargetConfig: ITargetSettings, lineDataPoints: any, linePoints: string, ytdLine: d3.Selection<SVGElement>, dataLabels: IDataLabels,
            textTailoredWidth: number, textWordBreakWidth: number, marginForyAxis: number, legendSettings: ILegendSettings, marginForXAxis: number, minWidthForVertical: number): void {
            let viewModel: IKPIColumnViewModel = this.viewModel;
            this.rootDiv.style("overflow-y", "hidden").style("overflow-x", "hidden");
            xScale = d3.scale.ordinal().domain(viewModel.dataPoints.map((d: IKPIColumnDataPoint) => d.category)).rangeBands([margins.left, width], 0.2, 0.3);
            barWidths = xScale.rangeBand(); let dynamicWidth: number;
            if (yAxisConfig.title) { margins.left += marginForyAxis; }
            minVisibleBarWidth = 17;
            if (barWidths < minVisibleBarWidth) { // setting overflow to auto when width is less
                this.rootDiv.style("overflow-x", "auto");
                dynamicWidth = width + (viewModel.dataPoints.length * (minVisibleBarWidth - barWidths)) - widthForScroll;
                xScale.rangeBands([margins.left, dynamicWidth], 0.2, 0.3);
                this.rootDiv.select(".baseDiv").style("width", PixelConverter.toString(dynamicWidth));
                this.rootDiv.select(".KPIColumn").style("width", PixelConverter.toString(dynamicWidth));
                height = height - widthForScroll; // shifting up to give space to scroll bar
            } else {
                dynamicWidth = width; xScale.rangeBands([margins.left, dynamicWidth], 0.2, 0.3); this.rootDiv.select(".baseDiv").style("width", PixelConverter.toString(dynamicWidth));
                this.rootDiv.select(".KPIColumn").style("width", PixelConverter.toString(dynamicWidth));
            }
            yScale = d3.scale.linear().domain([(<number>yAxisConfig.start), (<number>yAxisConfig.end) * 1.1]).range([(<number>height), horizontalEndRange]);
            if (d3.select(".rootDiv")[0][0] !== null || d3.select(".rootDiv")[0][0] !== undefined) {
                this.rootDiv.select(".KPIColumn").style("height", PixelConverter.toString($(d3.select(".rootDiv")[0][0]).height()));
            }
            this.viewModel = viewModel; this.subFunctionalityOfVerticalAnalytics(options, analytics, legendSettings, margins, dynamicWidth, labelYVal, fullTargetConfig, yScale);
            this.svg.selectAll(".xAxisText").remove();// Format Y Axis labels and render Y Axis labels
            yAxis = d3.svg.axis().scale(yScale).orient("left").tickFormat(this.yAxisFormatter.format).ticks(options.viewport.height / 80);
            const translate: number = margins.left; const translateLeft: string = `translate( ${translate},0)`; const yTitleXCoordinate: number = 40;
            if (yAxisConfig.title) {
                this.svg.append("text").classed("yTitle", true).text(yAxisName)
                    .attr("transform", `translate(${yTitleXCoordinate},${height / 2 + marginForXAxis}) rotate(-90)`)
                    .style({
                        "color": yAxisConfig.fontColor,
                        "font-family": yAxisConfig.fontFamily, "font-size": PixelConverter.toString(yAxisConfig.fontSize),
                        "max-width": PixelConverter.toString(options.viewport.width / 2),
                    }).append("title").text(yAxisName);
            }
            const adjustedHeight: number = height + 80;
            if (xAxisConfig.title) {
                this.svg.append("text").classed("xTitle", true).text(xAxisName).attr("transform", `translate(${dynamicWidth / 2},${adjustedHeight})`)
                    .style({
                        "color": xAxisConfig.fontColor, "font-family": xAxisConfig.fontFamily, "font-size": PixelConverter.toString(xAxisConfig.fontSize)
                    }).append("title").text(xAxisName);
            }
            this.yAxis.attr("transform", translateLeft).call(yAxis);
            this.yAxis.selectAll("path").classed("path", true);
            let yTitleTooltip: IValueFormatter = valueFormatter.create({ format: options.dataViews[0].categorical.values[0].source.format }); // Draw Y Axis grid lines
            let yTicks: any = this.svg.selectAll(".yAxis .tick");
            yTicks.append("title").text((d: string) => { return yTitleTooltip.format(d); });
            let tickLeng: number = yTicks.size(); const marginForGridLines: number = 80;
            for (let tickIndex = 0; tickIndex < tickLeng; tickIndex++) {
                let yCoordinate: string = yTicks[0][tickIndex].getAttribute("transform").substring(12, yTicks[0][tickIndex].getAttribute("transform").length - 1);
                if (parseFloat(yCoordinate) !== (viewModel.fytarget && yScale(<number>viewModel.fytarget)) || !fullTargetConfig.show) {
                    if (yAxisConfig.gridLines) {
                        this.yAxis.append("line").classed("yAxisGrid", true)
                            .attr({
                                x1: 0, x2: dynamicWidth, y1: yCoordinate, y2: yCoordinate
                            });
                    }
                }
            }
            let validImage: boolean = imagePatt.test(backgroundImage.imageUrl);
            const chartBackground: any = this.barContainer.append("image").attr("xlink:href", validImage ? backgroundImage.imageUrl : "");
            let barData: IKPIColumnDataPoint[] = [];
            let barforecastedData: IKPIColumnDataPoint[] = [];
            let circleData: IKPIColumnDataPoint[] = [];
            for (let dataPointIterator = 0; dataPointIterator < viewModel.dataPoints.length; dataPointIterator++) {
                if (viewModel.dataPoints[dataPointIterator].forecasted !== 1) {
                    barData.push(viewModel.dataPoints[dataPointIterator]);
                } else { barforecastedData.push(viewModel.dataPoints[dataPointIterator]); }
                circleData.push(viewModel.dataPoints[dataPointIterator]);
            }
            let add: number = 0;
            if ((this.yMax > 0 && this.yMin < 0) || ((this.yMax < 0 && this.yMin < 0))) { add = (height - yScale(Math.abs(this.yMin))); }
            this.bars = this.barContainer.selectAll(".bar").data(barData);
            this.barforecasted = this.barContainer.selectAll(".barforecasted").data(barforecastedData);
            this.subFunctionalityOfVerticalAnimation(animation, xScale, yScale, barOrigin, transitionDuration);
            this.barforecasted.on("click", (d: any): void => { // Allow selection only if the visual is rendered in a view that supports interactivity (e.g. Report)
                if (allowInteractions) {
                    selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                        thisObj.barSelection = thisObj.bars;
                        thisObj.barforecastedSelection = thisObj.barforecasted;
                        thisObj.syncSelectionState(thisObj.barSelection, thisObj.barforecastedSelection, ids);
                    }); (<Event>d3.event).stopPropagation();
                }
            }); // This must be an anonymous function instead of a lambda because d3 uses 'this' as the reference to the element that was clicked.
            this.bars.on("click", (d: any): void => {  // Allow selection only if the visual is rendered in a view that supports interactivity (e.g. Report)
                if (allowInteractions) {
                    selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                        thisObj.barSelection = thisObj.bars;
                        thisObj.barforecastedSelection = thisObj.barforecasted;
                        thisObj.syncSelectionState(thisObj.barSelection, thisObj.barforecastedSelection, ids);
                    }); (<Event>d3.event).stopPropagation();
                }
            });
            this.circleData = circleData;
            this.subFunctionalityOfVerticalAllowSelection(chartBackground, xScale, yScale, yTDTargetConfig, lineDataPoints, linePoints, backgroundImage, margins,
                ytdLine, xAxis, barWidths, textTailoredWidth, parseIntValue, textWordBreakWidth, dynamicWidth, minWidthForVertical, height, yAxisConfig);
            this.subFunctionalityOfVerticalDatalabels(dataLabels, xScale, yScale, barOrigin, barWidths, parseIntValue);
            let selectionManager: ISelectionManager = this.selectionManager;
            let allowInteractions: boolean = this.host.allowInteractions;
        }
        public subFunctionalityOfViewport(options: VisualUpdateOptions, marginForLegend: number, fontstyle: string, thisObj: this, labelYVal: number, transitionDuration: number): void {
            if (options.viewport.height > 100) {
                let viewModel: IKPIColumnViewModel = visualTransform(options, this.host, this);
                this.yMin = viewModel.dataMin;
                this.yMax = viewModel.dataMax;
                let settings: IKPIColumnSettings = this.KPIColumnSettings = viewModel.settings;
                this.barDataPoints = viewModel.dataPoints;
                let width: number = options.viewport.width, height: number = options.viewport.height, legendHeight: number = 0;
                const xAxisConfig: IXAxisSettings = this.getXAxisSettings(this.dataViews), yAxisConfig: IYAxisSettings = this.getYAxisSettings(this.dataViews);
                const fullTargetConfig: ITargetSettings = this.getFullTargetSettings(this.dataViews), yTDTargetConfig: ITargetSettings = this.getYTDSettings(this.dataViews);
                const legendSettings: ILegendSettings = this.getLegendSettings(this.dataViews), dataLabels: IDataLabels = this.getDataLabelSettings(this.dataViews);
                const analytics: IAnalyticsSettings = this.getAnalyticsSettings(this.dataViews), horizontal: IHorizontal = this.getHorizontalSettings(this.dataViews);
                const animation: IAnimation = this.getAnimationSettings(this.dataViews), backgroundImage: IBackgroundImage = this.getBackgroundImageSettings(this.dataViews);
                if (legendSettings.show) {
                    this.subFunctionalityOfLegendSettings(options, analytics, legendSettings, yTDTargetConfig, legendHeight, marginForLegend, fullTargetConfig);
                    legendHeight = this.legHeight;
                }
                const legendInnerPart: JQuery = $(".legendInnerPart");
                if (legendInnerPart.length > 0) {
                    const dimension: ClientRect = $(legendInnerPart)[legendInnerPart.length - 1].getBoundingClientRect();
                    legendHeight = dimension.height + dimension.top;
                } else { legendHeight = 0; }
                height = height - legendHeight > 0 ? height - legendHeight : 0;
                this.svg.attr({ height, width });
                let margins: any = KPIColumn.config.margins;
                height -= margins.bottom;
                let displayVal: number = 0;
                if (yAxisConfig.displayUnits === 0) {
                    const valLen: number = viewModel.dataMax.toString().length;
                    displayVal = this.getAutoDisplayUnits(valLen);
                }
                if (options.dataViews[0].categorical.values[0].source.format && options.dataViews[0].categorical.values[0].source.format.indexOf("%") !== -1) {
                    this.yAxisFormatter = valueFormatter.create({
                        format: options.dataViews[0].categorical.values[0].source.format, precision: yAxisConfig.decimalPlaces, value: yAxisConfig.displayUnits === 0 ? 0 : yAxisConfig.displayUnits
                    });
                } else {
                    this.yAxisFormatter = valueFormatter.create({
                        format: options.dataViews[0].categorical.values[0].source.format, precision: yAxisConfig.decimalPlaces,
                        value: yAxisConfig.displayUnits === 0 ? displayVal : yAxisConfig.displayUnits
                    });
                }
                const yAxisStartLength: number = yAxisConfig.start.toString().length, yAxisEndLength: number = yAxisConfig.end.toString().length;
                const yAxisFormatMaxValue: number = yAxisStartLength > yAxisEndLength ? yAxisConfig.start : yAxisConfig.end;
                const dataSetMaxLength: number = viewModel.dataMax.toString().length, dataSetMinLength: number = viewModel.dataMin.toString().length;
                const dataSetFormatMaxValue: number = dataSetMaxLength > dataSetMinLength ? viewModel.dataMax : viewModel.dataMin;
                const maxValue: number = yAxisFormatMaxValue.toString().length > dataSetFormatMaxValue.toString().length ? yAxisFormatMaxValue : dataSetFormatMaxValue;
                let formattedMaxMeasure: string = this.yAxisFormatter.format(parseFloat(maxValue.toString()) * 1.3);
                let measureTextProperties: TextProperties = {
                    fontFamily: fontstyle,
                    fontSize: "12px",
                    text: formattedMaxMeasure
                };
                const yAxisWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties);
                margins.left = yAxisWidth + 10;
                this.yAxis.classed("yAxis", true).style({ fill: yAxisConfig.fontColor });
                fytargetChecker = false;
                if (viewModel.fytarget) { fytargetChecker = true; }
                this.xAxis.classed("xAxis", true).style({ fill: xAxisConfig.fontColor });
                let xScale: any;
                let xAxis: d3.svg.Axis;
                let barWidths: number;
                let yScale: any;
                let yAxis: any;
                let lineDataPoints: any;
                let linePoints: string = "";
                let ytdLine: d3.Selection<SVGElement>;
                let minVisibleBarWidth: number = 19;
                let barOrigin: number = 0;
                const minWidthForHorizontal: number = 800;
                const widthForScroll: number = 20;
                const minHeightForHorizontal: number = 330;
                const minWidthForVertical: number = 40;
                const minHeightForVertical: number = 70;
                const marginForXAxis: number = 40;
                const marginForyAxis: number = 50;
                const marginForYAxis: number = 70;
                const marginForDataLabel: number = 10;
                const parseIntValue: number = 10;
                const horizontalEndRange: number = 10;
                const textWordBreakWidth: number = 50;
                const textTailoredWidth: number = 70;
                if (yAxisConfig.start > 0) { barOrigin = <number>yAxisConfig.start; }
                this.viewModel = viewModel;
                if (horizontal.show) { // hide overflow initially
                    margins.left = 30;
                    this.rootDiv.style("overflow-y", "auto").style("overflow-x", "hidden");
                    xScale = d3.scale.ordinal().domain(viewModel.dataPoints.reverse().map((d: IKPIColumnDataPoint) => d.category)).rangeBands([height, horizontalEndRange], 0.2, 0.3);
                    this.subFunctionalityOfHorizontalShow(xScale, yScale, margins, height, width, barWidths, minVisibleBarWidth, minHeightForHorizontal, horizontalEndRange,
                        minWidthForHorizontal, widthForScroll, xAxisConfig, yAxisConfig, fullTargetConfig, analytics, options, yAxis, xAxis, parseIntValue, backgroundImage,
                        animation, thisObj, marginForYAxis, labelYVal, barOrigin, transitionDuration, yTDTargetConfig, lineDataPoints, linePoints, ytdLine, dataLabels,
                        minHeightForVertical, textTailoredWidth, marginForDataLabel, textWordBreakWidth);
                } else { // set overflow hidden initially
                    this.subFunctionalityOfVerticalShow(xScale, yScale, margins, height, width, barWidths, minVisibleBarWidth, horizontalEndRange, widthForScroll, xAxisConfig,
                        yAxisConfig, fullTargetConfig, analytics, options, yAxis, xAxis, parseIntValue, backgroundImage, animation, thisObj, labelYVal, barOrigin, transitionDuration,
                        yTDTargetConfig, lineDataPoints, linePoints, ytdLine, dataLabels, textTailoredWidth, textWordBreakWidth, marginForyAxis, legendSettings, marginForXAxis, minWidthForVertical);
                }
            }
        }
        public update(options: VisualUpdateOptions): void {
            const thisObj: this = this;
            this.svg.attr({ height: 0, width: 0 });
            try {
                this.host.eventService.renderingStarted(options);
                $("#textToDisplay").remove();
                this.baseDiv.style("width", 0);
                this.svg.selectAll(".yTitle").remove();
                this.svg.selectAll(".xTitle").remove();
                const fontstyle: string = "Segoe UI,wf_segoe-ui_normal,helvetica,arial,sans-serif";
                const transitionDuration: number = 1000, marginForLegend: number = 60, labelYVal: number = 5;
                let measureRoleLiteral: string = "measure", ytdtargetLiteral: string = "ytdtarget";
                let doubleSpaceLiteral: string = "  ";
                KPIColumn.thisObj = this; this.isITAvailable = false; this.itText = "";
                this.targetText = ""; this.isTargetAvailable = false;
                let dataView: DataView = this.dataViews = options.dataViews[0];
                this.xAxis.selectAll("*").remove();
                this.yAxis.selectAll("*").remove();
                this.targetLines.selectAll("*").remove();
                this.svg.selectAll(".barContainer").selectAll("*").remove();
                let numberOfValues: number = -1; let numberOfCategory: number = -1;
                if (dataView.categorical.values) { numberOfValues = dataView.categorical.values.length; }
                if (dataView.categorical.categories) { numberOfCategory = dataView.categorical.categories.length; } let iIndex: number;
                let iIndexOfCategory: number = -1, iIndexOfForecasted: number = -1, iIndexOfYtd: number = -1;
                const dataviewCategory: DataViewCategoryColumn = dataView.categorical.categories[0];
                const dataviewCategoryLength: number = dataView.categorical.categories[0].values.length;
                this.rootDiv.selectAll(".legend .medianLegend,.legend .yTDTargetLegend,.legend .fullYearTargetLegend, .legend .avgLegend, .legend .maxLegend, .legend .minLegend").remove();
                if (numberOfValues !== -1) {
                    for (let iCounter: number = 0; iCounter < numberOfValues; iCounter++) {
                        if (dataView.categorical.values[iCounter].source.roles[measureRoleLiteral]) {
                            this.measureFormat = options.dataViews[0].categorical.values[iCounter].source.format;
                        } else if (dataView.categorical.values[iCounter].source.roles[ytdtargetLiteral]) {
                            this.targetFormat = options.dataViews[0].categorical.values[iCounter].source.format;
                        }
                    }
                }
                for (let dataViewValueIterator: number = 0; dataViewValueIterator < dataviewCategoryLength; dataViewValueIterator++) { // conversion from null to (Blank)
                    if (dataviewCategory.values[dataViewValueIterator] === "") { dataviewCategory.values[dataViewValueIterator] = "(Blank)"; }
                }
                if (numberOfCategory !== -1) { // assigning proper index for category KPI Name
                    for (iIndex = 0; iIndex < numberOfCategory; iIndex++) {
                        if (dataView.categorical.categories[iIndex].source.roles[`category`]) {
                            iIndexOfCategory = iIndex;
                        } else if (dataView.categorical.categories[iIndex].source.roles[`forecasted`]) { iIndexOfForecasted = iIndex; }
                    }
                }
                if (numberOfValues !== -1) { // assigning proper index for measures
                    for (iIndex = 0; iIndex < numberOfValues; iIndex++) {// assigning index for measure KPI Current Value
                        if (dataView.categorical.values[iIndex].source.roles[`measure`]) { // assigning index for measure KPI Last Value
                            iIndexOfYtd = iIndex;
                        }
                    }
                }
                if (iIndexOfCategory === -1 && iIndexOfYtd === -1) {
                    this.displayBasicRequirement(0, options.viewport.height);
                    return;
                } else if (iIndexOfCategory === -1) {
                    this.displayBasicRequirement(1, options.viewport.height);
                } else if (iIndexOfYtd === -1) {
                    this.displayBasicRequirement(2, options.viewport.height);
                    return;
                }
                if (iIndexOfForecasted !== -1) { // if status column has values other than 0 and 1
                    const oStatusData: PrimitiveValue[] = dataView.categorical.categories[iIndexOfForecasted].values;
                    const iLengthOfData: number = oStatusData.length;
                    for (iIndex = 0; iIndex < iLengthOfData; iIndex++) {
                        if (oStatusData[iIndex] === null || !(oStatusData[iIndex] === 1 ||
                            oStatusData[iIndex] === 0)) {
                            this.displayBasicRequirement(3, options.viewport.height);
                            return;
                        }
                    }
                }
                this.min = 0; this.max = 0;
                this.subFunctionalityOfViewport(options, marginForLegend, fontstyle, thisObj, labelYVal, transitionDuration); // viewport height
                this.barSelection = this.bars; this.barforecastedSelection = this.barforecasted;
                this.syncSelectionState(
                    this.barSelection, this.barforecastedSelection,
                    <ISelectionId[]>this.selectionManager.getSelectionIds());
                this.svg.on(
                    "click",
                    () => this.selectionManager.clear().then(() => {
                        this.barSelection = this.bars; this.barforecastedSelection = this.barforecasted;
                        this.syncSelectionState(this.barSelection, this.barforecastedSelection, []);
                    }));
                this.svg.on("contextmenu", () => { // handle context menu
                    const mouseEvent: MouseEvent = <MouseEvent>d3.event; const eventTarget: EventTarget = mouseEvent.target;
                    const dataPoint: any = d3.select(eventTarget).datum();
                    if (dataPoint !== undefined) {
                        this.selectionManager.showContextMenu(dataPoint.selectionId, {
                            x: mouseEvent.clientX, y: mouseEvent.clientY
                        });
                        mouseEvent.preventDefault();
                    }
                });
                this.host.eventService.renderingFinished(options);
            } catch (exeption) {
                this.host.eventService.renderingFailed(options, exeption);
            }
        }

        // method to set the display units when selected as auto
        public getAutoDisplayUnits(valLen: number): number {
            let displayVal: number;
            if (valLen > 9) {
                displayVal = 1e9;
            } else if (valLen <= 9 && valLen > 6) {
                displayVal = 1e6;
            } else if (valLen <= 6 && valLen >= 4) {
                displayVal = 1e3;
            } else {
                displayVal = 10;
            }

            return displayVal;
        }

        /*
                * method to display text if basic requirements are not satisfied
                */
        public displayBasicRequirement(iStatus: number, height: number): void {
            this.rootDiv.selectAll("*").empty();
            this.svg.selectAll("*").empty();
            // Change basediv height to 0 when basic requirements are not satisfied
            this.rootDiv.select(".baseDiv").style("height", `${height / 2}px`);
            $("<div>").attr("id", "textToDisplay").appendTo(".rootDiv");
            if (iStatus === 0) { // if category and measure fields are not selected
                document.getElementById("textToDisplay").textContent = `Please select 'Category' and 'Measure' `;
            } else if (iStatus === 1) { // if column for category is not selected
                document.getElementById("textToDisplay").textContent = `Please select 'Category' `;
            } else if (iStatus === 2) { // if column is not selected for measure
                document.getElementById("textToDisplay").textContent = `Please select 'Measure' `;
            } else { // if appropriate column for forecasted is not selected
                document.getElementById("textToDisplay").textContent =
                    `Please select a column with values 0 and 1 for forecasted values `;
            }
        }

        public getHorizontalSettings(dataView: DataView): IHorizontal {
            let objects: DataViewObjects = null;
            let horizontalSetting: IHorizontal;
            horizontalSetting = this.getDefaultHorizontalSettings();

            if (!dataView.metadata || !dataView.metadata.objects) { return horizontalSetting; }
            objects = dataView.metadata.objects;
            horizontalSetting.show = DataViewObjects.getValue(objects,
                chartProperties.horizontal.show, horizontalSetting.show);

            return horizontalSetting;
        }

        public getDefaultHorizontalSettings(): IHorizontal {
            return {
                show: false
            };
        }

        public getAnimationSettings(dataView: DataView): IAnimation {
            let objects: DataViewObjects = null;
            let animationSetting: IAnimation;
            animationSetting = this.getDefaultAnimationSettings();

            if (!dataView.metadata || !dataView.metadata.objects) { return animationSetting; }
            objects = dataView.metadata.objects;
            animationSetting.show = DataViewObjects.getValue(objects,
                chartProperties.animation.show, animationSetting.show);

            return animationSetting;
        }

        public getDefaultAnimationSettings(): IAnimation {
            return {
                show: false
            };
        }

        public getZoneSettings(dataView: DataView): IZoneSettings {
            let objects: DataViewObjects = null;
            let zoneSetting: IZoneSettings;
            zoneSetting = this.getDefaultZoneSettings();

            if (!dataView.metadata || !dataView.metadata.objects) { return zoneSetting; }

            objects = dataView.metadata.objects;
            zoneSetting.zone1Value = DataViewObjects.getValue(objects,
                chartProperties.zoneSettings.zone1Value, zoneSetting.zone1Value);
            zoneSetting.zone2Value = DataViewObjects.getValue(objects,
                chartProperties.zoneSettings.zone2Value, zoneSetting.zone2Value);
            zoneSetting.zone1Color = DataViewObjects.getFillColor(objects,
                chartProperties.zoneSettings.zone1Color, zoneSetting.zone1Color);
            zoneSetting.zone2Color = DataViewObjects.getFillColor(objects,
                chartProperties.zoneSettings.zone2Color, zoneSetting.zone2Color);
            zoneSetting.zone3Color = DataViewObjects.getFillColor(objects,
                chartProperties.zoneSettings.zone3Color, zoneSetting.zone3Color);
            zoneSetting.defaultColor = DataViewObjects.getFillColor(
                objects, chartProperties.zoneSettings.defaultColor, zoneSetting.defaultColor);

            return zoneSetting;
        }

        public getDefaultZoneSettings(): IZoneSettings {
            return {
                defaultColor: "#01B8AA",
                zone1Color: "#fd625e",
                zone1Value: 90,
                zone2Color: "#f5d33f",
                zone2Value: 101,
                zone3Color: "#01b8aa"
            };
        }

        public getDefaultYAxisSettings(): IYAxisSettings {
            return {
                decimalPlaces: 0,
                displayUnits: 0,
                end: this.yMax,
                fontColor: "#000000",
                fontFamily: "Arial",
                fontSize: 12,
                gridLines: true,
                start: this.yMin,
                title: true,
            };
        }

        public getDefaultAnalyticsSettings(): IAnalyticsSettings {
            return {
                avg: false,
                lineColorAvg: "#FF0000",
                lineColorMax: "#551A8B",
                lineColorMedian: "#0000FF",
                lineColorMin: "#000000",
                max: false,
                median: false,
                min: false,
                strokeSizeAvg: 1,
                strokeSizeMax: 1,
                strokeSizeMedian: 1,
                strokeSizeMin: 1
            };
        }

        public getDefaultXAxisSettings(): IXAxisSettings {
            return {
                fontColor: "#000000",
                fontFamily: "Arial",
                fontSize: 12,
                title: true
            };
        }

        public getDefaultTargetSettings(): ITargetSettings {
            return {
                lineColor: "#808080",
                show: true,
                strokeSize: 1
            };
        }

        public getDefaultBackgroundImageSettings(): IBackgroundImage {
            return {
                imageUrl: "",
                show: false,
                transparency: 50
            };
        }

        public getDefaultLegendSettings(): ILegendSettings {
            return {
                fontFamily: "Segoe UI",
                labelColor: "#000",
                labelSize: 12,
                show: true,
                title: true
            };
        }

        public getLegendSettings(dataView: DataView): ILegendSettings {
            let legendSettings: ILegendSettings;
            legendSettings = this.getDefaultLegendSettings();
            let objects: DataViewObjects = null;
            if (!dataView.metadata || !dataView.metadata.objects) {
                return legendSettings;
            }
            objects = dataView.metadata.objects;
            let legendProps: any;
            legendProps = chartProperties.legendSettings;
            legendSettings.show = DataViewObjects.getValue(objects, legendProps.show, legendSettings.show);
            legendSettings.labelColor = DataViewObjects.getFillColor(objects,
                legendProps.labelColor, legendSettings.labelColor);
            legendSettings.labelSize = DataViewObjects.getValue(objects,
                legendProps.labelSize, legendSettings.labelSize);
            legendSettings.title = DataViewObjects.getValue(objects,
                legendProps.title, legendSettings.title);
            legendSettings.fontFamily = DataViewObjects.getValue(objects,
                legendProps.fontFamily, legendSettings.fontFamily);
            if (legendSettings.labelSize > 20) {
                legendSettings.labelSize = 20;
            }

            return legendSettings;
        }

        public getDataLabelSettings(dataView: DataView): IDataLabels {
            let dataLabelsSettings: IDataLabels;
            dataLabelsSettings = this.getDefaultDataLabelSettings();
            let objects: DataViewObjects = null;
            if (!dataView.metadata || !dataView.metadata.objects) {
                return dataLabelsSettings;
            }
            objects = dataView.metadata.objects;
            let dataProps: any;
            dataProps = chartProperties.dataLabels;
            dataLabelsSettings.show = DataViewObjects.getValue(objects, dataProps.show, dataLabelsSettings.show);
            dataLabelsSettings.fontColor = DataViewObjects.getFillColor(objects,
                dataProps.fontColor, dataLabelsSettings.fontColor);
            dataLabelsSettings.fontSize = DataViewObjects.getValue(objects,
                dataProps.fontSize, dataLabelsSettings.fontSize);
            dataLabelsSettings.fontFamily = DataViewObjects.getValue(objects,
                dataProps.fontFamily, dataLabelsSettings.fontFamily);
            dataLabelsSettings.displayUnits = DataViewObjects.getValue(objects,
                dataProps.displayUnits, dataLabelsSettings.displayUnits);
            dataLabelsSettings.valueDecimal = DataViewObjects.getValue(objects,
                dataProps.valueDecimal, dataLabelsSettings.valueDecimal);
            dataLabelsSettings.position = DataViewObjects.getValue(objects,
                dataProps.position, dataLabelsSettings.position);
            // Allowed decimal paces from 0 to 4 only
            if (dataLabelsSettings.valueDecimal > 4) {
                dataLabelsSettings.valueDecimal = 4;
            } else if (dataLabelsSettings.valueDecimal < 0) {
                dataLabelsSettings.valueDecimal = 0;
            }
            // Restrict data labels font size to 20 max
            if (dataLabelsSettings.fontSize > 20) {
                dataLabelsSettings.fontSize = 20;
            }

            return dataLabelsSettings;
        }

        // Function to get the default label settings
        public getDefaultDataLabelSettings(): IDataLabels {
            return {
                displayUnits: 0,
                fontColor: "#7c7c7c",
                fontFamily: "Segoe UI",
                fontSize: 11,
                position: "insideEnd",
                show: false,
                valueDecimal: 0
            };
        }
        public subEnumerationAnalytics(analytics: IAnalyticsSettings): any {
            const obj: {} = {};
            obj[`min`] = analytics.min;
            if (analytics.min) {
                obj[`lineColorMin`] = analytics.lineColorMin;
                obj[`strokeSizeMin`] = analytics.strokeSizeMin;
            }
            obj[`max`] = analytics.max;
            if (analytics.max) {
                obj[`lineColorMax`] = analytics.lineColorMax;
                obj[`strokeSizeMax`] = analytics.strokeSizeMax;
            }
            obj[`avg`] = analytics.avg;
            if (analytics.avg) {
                obj[`lineColorAvg`] = analytics.lineColorAvg;
                obj[`strokeSizeAvg`] = analytics.strokeSizeAvg;
            }
            obj[`median`] = analytics.median;
            if (analytics.median) {
                obj[`lineColorMedian`] = analytics.lineColorMedian;
                obj[`strokeSizeMedian`] = analytics.strokeSizeMedian;
            }
            return obj;
        }
        public subEnumerationYAxis(yAxisConfigs: IYAxisSettings): any {
            const yObjProps: {} = {};
            yObjProps[`fill`] = yAxisConfigs.fontColor;
            yObjProps[`displayUnits`] = yAxisConfigs.displayUnits;
            yObjProps[`decimalPlaces`] = yAxisConfigs.decimalPlaces;
            yObjProps[`gridLines`] = yAxisConfigs.gridLines;
            if (fytargetChecker && this.setYtdTarget) {
                yObjProps[`start`] = yAxisConfigs.start;
                yObjProps[`end`] = yAxisConfigs.end;
            }
            yObjProps[`title`] = yAxisConfigs.title;
            if (yAxisConfigs.title) {
                yObjProps[`fontSize`] = yAxisConfigs.fontSize,
                    yObjProps[`fontFamily`] = yAxisConfigs.fontFamily;
            }
            return yObjProps;
        }
        public subEnumerationXAxis(xAxisConfigs: IXAxisSettings): any {
            const xObjProps: {} = {};
            xObjProps[`fill`] = xAxisConfigs.fontColor;
            xObjProps[`title`] = xAxisConfigs.title;
            if (xAxisConfigs.title) {
                xObjProps[`fontSize`] = xAxisConfigs.fontSize;
                xObjProps[`fontFamily`] = xAxisConfigs.fontFamily;
            }
            return xObjProps;
        }
        // Function to enumerate object instances
        // tslint:disable-next-line:cyclomatic-complexity
        // tslint:disable:object-literal-sort-keys
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let zoneSetting: IZoneSettings = this.getZoneSettings(this.dataViews), yAxisConfigs: IYAxisSettings = this.getYAxisSettings(this.dataViews);
            let yTDConfigs: ITargetSettings = this.getYTDSettings(this.dataViews), fullYearConfigs: ITargetSettings = this.getFullTargetSettings(this.dataViews);
            let xAxisConfigs: IXAxisSettings = this.getXAxisSettings(this.dataViews), legendConfig: ILegendSettings = this.getLegendSettings(this.dataViews);
            let dataLabels: IDataLabels = this.getDataLabelSettings(this.dataViews), analytics: IAnalyticsSettings = this.getAnalyticsSettings(this.dataViews);
            let horizontal: IHorizontal = this.getHorizontalSettings(this.dataViews), animation: IAnimation = this.getAnimationSettings(this.dataViews);
            let backgroundImage: IBackgroundImage = this.getBackgroundImageSettings(this.dataViews), objectName: string = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];
            switch (objectName) {
                case "yAxis":
                    objectEnumeration.push({
                        objectName, properties: this.subEnumerationYAxis(yAxisConfigs), selector: null
                    }); break;
                case "xAxis":
                    objectEnumeration.push({
                        objectName, properties: this.subEnumerationXAxis(xAxisConfigs), selector: null
                    }); break;
                case "horizontal":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            show: horizontal.show
                        },
                        selector: null
                    }); break;
                case "animation":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            show: animation.show
                        },
                        selector: null
                    }); break;
                case "fullYearTarget":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            lineColor: fullYearConfigs.lineColor, show: fullYearConfigs.show, strokeSize: fullYearConfigs.strokeSize
                        },
                        selector: null
                    }); break;
                case "yTDTarget":
                    if (this.setYtdTarget) {
                        objectEnumeration.push({
                            objectName,
                            properties: {
                                show: yTDConfigs.show, lineColor: yTDConfigs.lineColor, strokeSize: yTDConfigs.strokeSize
                            },
                            selector: null
                        }); break;
                    }
                case "analytics":
                    objectEnumeration.push({
                        objectName, properties: this.subEnumerationAnalytics(analytics), selector: null
                    }); break;
                case "zoneSettings":
                    if (this.setYtdTarget) {
                        objectEnumeration.push({
                            objectName,
                            properties: {
                                zone1Value: zoneSetting.zone1Value, zone2Value: zoneSetting.zone2Value, defaultColor: zoneSetting.defaultColor,
                                zone1Color: zoneSetting.zone1Color, zone2Color: zoneSetting.zone2Color, zone3Color: zoneSetting.zone3Color
                            },
                            selector: null
                        }); break;
                    }
                case "legend":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            show: legendConfig.show, labelColor: legendConfig.labelColor, fontSize: legendConfig.labelSize,
                            title: legendConfig.title, fontFamily: legendConfig.fontFamily
                        },
                        selector: null
                    }); break;
                case "dataLabels":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            show: dataLabels.show, fontColor: dataLabels.fontColor,
                            fontSize: dataLabels.fontSize, fontFamily: dataLabels.fontFamily,
                            displayUnits: dataLabels.displayUnits, valueDecimal: dataLabels.valueDecimal, position: dataLabels.position
                        },
                        selector: null
                    }); break;
                case "backgroundImage":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            show: backgroundImage.show,
                            imageUrl: backgroundImage.imageUrl,
                            transparency: backgroundImage.transparency
                        },
                        selector: null
                    }); break;
                default: break;
            }
            return objectEnumeration;
        }
        // tslint:enable

        public getDecimalDigits(value: number): number {
            let decimalDigits: number;
            if (Math.floor(value) === value) {
                return 0;
            } else {
                decimalDigits = value.toString().split(".")[1].length;

                return (decimalDigits > 4 ? 4 : decimalDigits);
            }
        }

        // method to sync the ISelectionID and apply formatting based on selection
        private syncSelectionState(
            selection1: d3.Selection<IKPIColumnDataPoint>,
            selection2: d3.Selection<IKPIColumnDataPoint>,
            selectionIds: ISelectionId[]
        ): void {
            if (!selection1 || !selection2 || !selectionIds) {

                return;
            }

            if (!selectionIds.length) {
                selection1.style("fill-opacity", null);
                selection2.style("fill-opacity", null);

                return;
            }

            const self: this = this;

            selection1.each(function (barDataPoint: IKPIColumnDataPoint): void {
                const isSelected: boolean = self.isSelectionIdInArray(selectionIds, barDataPoint.selectionId);
                // add changes to the selection here
                d3.select(this).style({
                    "fill-opacity": isSelected ? KPIColumn.config.solidOpacity : KPIColumn.config.transparentOpacity
                });
            });

            selection2.each(function (barDataPoint: IKPIColumnDataPoint): void {
                const isSelected: boolean = self.isSelectionIdInArray(selectionIds, barDataPoint.selectionId);
                // add changes to the selection here
                d3.select(this).style({
                    "fill-opacity": isSelected ? KPIColumn.config.forecastedSolidOpacity :
                        KPIColumn.config.forecastedTransparentOpacity
                });
            });

            return;
        }

        // method to return boolean value if given ISelectionID is selected from the given ISelectionID array
        private isSelectionIdInArray(selectionIds: ISelectionId[], selectionId: ISelectionId): boolean {
            if (!selectionIds || !selectionId) {
                return false;
            }

            return selectionIds.some((currentSelectionId: ISelectionId) => {
                return currentSelectionId.includes(selectionId);
            });
        }

        private getYAxisSettings(dataView: DataView): IYAxisSettings {
            let objects: DataViewObjects = null;
            let yAxisSetting: IYAxisSettings;
            yAxisSetting = this.getDefaultYAxisSettings();

            if (!dataView.metadata || !dataView.metadata.objects) { return yAxisSetting; }

            objects = dataView.metadata.objects;
            yAxisSetting.fontColor = DataViewObjects.getFillColor(objects,
                chartProperties.yAxisConfig.fontColor, yAxisSetting.fontColor);
            yAxisSetting.displayUnits = DataViewObjects.getValue(
                objects, chartProperties.yAxisConfig.displayUnits, yAxisSetting.displayUnits);
            yAxisSetting.decimalPlaces = DataViewObjects.getValue(
                objects, chartProperties.yAxisConfig.decimalPlaces, yAxisSetting.decimalPlaces);
            yAxisSetting.gridLines = DataViewObjects.getValue(objects,
                chartProperties.yAxisConfig.gridLines, yAxisSetting.gridLines);
            yAxisSetting.start = DataViewObjects.getValue(objects,
                chartProperties.yAxisConfig.start, yAxisSetting.start);
            yAxisSetting.end = DataViewObjects.getValue(objects, chartProperties.yAxisConfig.end, yAxisSetting.end);
            yAxisSetting.fontSize = DataViewObjects.getValue(objects,
                chartProperties.yAxisConfig.fontSize, yAxisSetting.fontSize);
            yAxisSetting.title = DataViewObjects.getValue(objects,
                chartProperties.yAxisConfig.title, yAxisSetting.title);
            yAxisSetting.fontFamily = DataViewObjects.getValue(objects,
                chartProperties.yAxisConfig.fontFamily, yAxisSetting.fontFamily);
            if (yAxisSetting.start > this.yMin) {
                yAxisSetting.start = this.yMin;
            }
            if (this.yMin > 0) {
                if (yAxisSetting.start < 0) {
                    yAxisSetting.start = 0;
                }
            }
            if (yAxisSetting.end < this.yMax) {
                yAxisSetting.end = this.yMax;
            }
            if (yAxisSetting.decimalPlaces > 4) {
                yAxisSetting.decimalPlaces = 4;
            } else if (yAxisSetting.decimalPlaces < 0) {
                yAxisSetting.decimalPlaces = 0;
            }
            if (yAxisSetting.fontSize > 20) {
                yAxisSetting.fontSize = 20;
            }

            return yAxisSetting;
        }

        private getAnalyticsSettings(dataView: DataView): IAnalyticsSettings {
            let objects: DataViewObjects = null;
            let analyticsSettings: IAnalyticsSettings;
            analyticsSettings = this.getDefaultAnalyticsSettings();

            if (!dataView.metadata || !dataView.metadata.objects) { return analyticsSettings; }

            objects = dataView.metadata.objects;
            analyticsSettings.min = DataViewObjects.getValue(objects,
                chartProperties.analytics.min, analyticsSettings.min);
            analyticsSettings.lineColorMin = DataViewObjects.getFillColor
                (objects, chartProperties.analytics.lineColorMin, analyticsSettings.lineColorMin);
            analyticsSettings.strokeSizeMin = DataViewObjects.getValue
                (objects, chartProperties.analytics.strokeSizeMin, analyticsSettings.strokeSizeMin) > 5 ? 5
                : DataViewObjects.getValue
                    (objects, chartProperties.analytics.strokeSizeMin, analyticsSettings.strokeSizeMin);
            analyticsSettings.max = DataViewObjects.getValue(objects,
                chartProperties.analytics.max, analyticsSettings.max);
            analyticsSettings.lineColorMax = DataViewObjects.getFillColor
                (objects, chartProperties.analytics.lineColorMax, analyticsSettings.lineColorMax);
            analyticsSettings.strokeSizeMax = DataViewObjects.getValue
                (objects, chartProperties.analytics.strokeSizeMax, analyticsSettings.strokeSizeMax) > 5 ? 5
                : DataViewObjects.getValue
                    (objects, chartProperties.analytics.strokeSizeMax, analyticsSettings.strokeSizeMax);
            analyticsSettings.avg = DataViewObjects.getValue(objects,
                chartProperties.analytics.avg, analyticsSettings.avg);
            analyticsSettings.lineColorAvg = DataViewObjects.getFillColor
                (objects, chartProperties.analytics.lineColorAvg, analyticsSettings.lineColorAvg);
            analyticsSettings.strokeSizeAvg = DataViewObjects.getValue
                (objects, chartProperties.analytics.strokeSizeAvg, analyticsSettings.strokeSizeAvg) > 5 ? 5
                : DataViewObjects.getValue
                    (objects, chartProperties.analytics.strokeSizeAvg, analyticsSettings.strokeSizeAvg);
            analyticsSettings.median = DataViewObjects.getValue(objects,
                chartProperties.analytics.median, analyticsSettings.median);
            analyticsSettings.lineColorMedian = DataViewObjects.getFillColor
                (objects, chartProperties.analytics.lineColorMedian, analyticsSettings.lineColorMedian);
            analyticsSettings.strokeSizeMedian = DataViewObjects.getValue
                (objects, chartProperties.analytics.strokeSizeMedian, analyticsSettings.strokeSizeMedian) > 5 ? 5
                : DataViewObjects.getValue(objects, chartProperties.analytics.strokeSizeMedian,
                    analyticsSettings.strokeSizeMedian);

            analyticsSettings.strokeSizeAvg = analyticsSettings.strokeSizeAvg < 1 ? 1 : analyticsSettings.strokeSizeAvg;
            analyticsSettings.strokeSizeMin = analyticsSettings.strokeSizeMin < 1 ? 1 : analyticsSettings.strokeSizeMin;
            analyticsSettings.strokeSizeMax = analyticsSettings.strokeSizeMax < 1 ? 1 : analyticsSettings.strokeSizeMax;
            analyticsSettings.strokeSizeMedian = analyticsSettings.strokeSizeMedian < 1 ? 1 :
                analyticsSettings.strokeSizeMedian;

            return analyticsSettings;
        }

        private getXAxisSettings(dataView: DataView): IXAxisSettings {
            let objects: DataViewObjects = null;
            let xAxisSetting: IXAxisSettings;
            xAxisSetting = this.getDefaultXAxisSettings();

            if (!dataView.metadata || !dataView.metadata.objects) { return xAxisSetting; }

            objects = dataView.metadata.objects;
            xAxisSetting.fontColor = DataViewObjects.getFillColor(objects,
                chartProperties.xAxisConfig.fontColor, xAxisSetting.fontColor);
            xAxisSetting.fontSize = DataViewObjects.getValue(objects,
                chartProperties.xAxisConfig.fontSize, xAxisSetting.fontSize);
            xAxisSetting.title = DataViewObjects.getValue(objects,
                chartProperties.xAxisConfig.title, xAxisSetting.title);
            xAxisSetting.fontFamily = DataViewObjects.getValue(objects,
                chartProperties.xAxisConfig.fontFamily, xAxisSetting.fontFamily);
            if (xAxisSetting.fontSize > 20) {
                xAxisSetting.fontSize = 20;
            }

            return xAxisSetting;
        }

        private getYTDSettings(dataView: DataView): ITargetSettings {
            let objects: DataViewObjects = null;
            let yTDSetting: ITargetSettings;
            yTDSetting = this.getDefaultTargetSettings();

            if (!dataView.metadata || !dataView.metadata.objects) { return yTDSetting; }

            objects = dataView.metadata.objects;
            yTDSetting.show = DataViewObjects.getValue(objects, chartProperties.yTDConfig.show, yTDSetting.show);
            yTDSetting.lineColor = DataViewObjects.getFillColor(objects,
                chartProperties.yTDConfig.lineColor, yTDSetting.lineColor);
            yTDSetting.strokeSize = DataViewObjects.getValue(objects,
                chartProperties.yTDConfig.strokeSize, yTDSetting.strokeSize);
            // Allowed stroke size from 1 to 5 only
            if (yTDSetting.strokeSize > 5) {
                yTDSetting.strokeSize = 5;
            } else if (yTDSetting.strokeSize < 1) {
                yTDSetting.strokeSize = 1;
            }

            return yTDSetting;
        }

        private getFullTargetSettings(dataView: DataView): ITargetSettings {
            let objects: DataViewObjects = null;
            let fullTargetSettings: ITargetSettings;
            fullTargetSettings = this.getDefaultTargetSettings();

            if (!dataView.metadata || !dataView.metadata.objects) { return fullTargetSettings; }

            objects = dataView.metadata.objects;
            fullTargetSettings.show = DataViewObjects.getValue(objects,
                chartProperties.fullTargetConfig.show, fullTargetSettings.show);
            fullTargetSettings.lineColor = DataViewObjects.getFillColor(
                objects, chartProperties.fullTargetConfig.lineColor, fullTargetSettings.lineColor);
            fullTargetSettings.strokeSize = DataViewObjects.getValue(
                objects, chartProperties.fullTargetConfig.strokeSize, fullTargetSettings.strokeSize);
            // Allowed stroke size form 1 to 5 only
            if (fullTargetSettings.strokeSize > 5) {
                fullTargetSettings.strokeSize = 5;
            } else if (fullTargetSettings.strokeSize < 1) {
                fullTargetSettings.strokeSize = 1;
            }

            return fullTargetSettings;
        }

        private getBackgroundImageSettings(dataView: DataView): IBackgroundImage {
            let objects: DataViewObjects = null;
            let backgroundImageSettings: IBackgroundImage;
            backgroundImageSettings = this.getDefaultBackgroundImageSettings();

            if (!dataView.metadata || !dataView.metadata.objects) { return backgroundImageSettings; }
            objects = dataView.metadata.objects;
            // tslint:disable-next-line:max-line-length
            if (dataView.metadata.objects.hasOwnProperty("backgroundImage") && objects.backgroundImage.show) { // checks for the backgroundimage index in objects. if present then only it is liable to check condition objects.backgroundImage.show
                backgroundImageSettings.show = DataViewObjects.getValue
                    (objects, chartProperties.backgroundImage.show, backgroundImageSettings.show);
                backgroundImageSettings.imageUrl = DataViewObjects.getValue
                    (objects, chartProperties.backgroundImage.imageUrl, backgroundImageSettings.imageUrl);
                backgroundImageSettings.transparency = DataViewObjects.getValue
                    (objects, chartProperties.backgroundImage.transparency, backgroundImageSettings.transparency);
            }

            return backgroundImageSettings;
        }
        // Function to display tooltip data on bars
        private getTooltipData(value: any): VisualTooltipDataItem[] {
            let language: string;
            const tooltipDataPoints: VisualTooltipDataItem[] = [];
            language = getLocalizedString(this.locale, "LanguageKey");
            let measureFormat: string;
            measureFormat = this.measureFormat;
            let targetFormat: string;
            targetFormat = this.targetFormat;
            let ytdDisplayName: string = "";
            let ytdTarget: string;
            ytdTarget = "ytdtarget";
            this.dataViews.metadata.columns.forEach((element: any) => {
                if (element.roles[ytdTarget]) {
                    ytdDisplayName = element.displayName;
                }
            });
            let formatter: IValueFormatter;
            formatter = valueFormatter.create({
                format: measureFormat ? measureFormat : valueFormatter.DefaultNumericFormat
            });
            if (value.ytd) {
                let formatter1: IValueFormatter;
                formatter1 = valueFormatter.create({
                    format: targetFormat ? targetFormat : valueFormatter.DefaultNumericFormat
                });
                tooltipDataPoints.push(
                    {
                        displayName: value.category,
                        value: formatter.format(value.value.toFixed(this.getDecimalDigits(value.value)))
                    },
                    {
                        displayName: ytdDisplayName,
                        value: formatter1.format(value.ytd.toFixed(this.getDecimalDigits(value.ytd)))
                    });
            } else {
                tooltipDataPoints.push({
                    displayName: value.category,
                    value: formatter.format(value.value.toFixed(this.getDecimalDigits(value.value)))
                });
            }
            for (const iCounter of value.tooltip) {
                const tooltipData: VisualTooltipDataItem = {
                    displayName: "",
                    value: ""
                };
                tooltipData.displayName = iCounter.name.toString();
                tooltipData.value = iCounter.value.toString();
                tooltipDataPoints.push(tooltipData);
            }

            return tooltipDataPoints;

        }

        // Function to display tooltip data on indivdual target datapoints
        private getTooltipIndividualTargetData(value: any): VisualTooltipDataItem[] {
            let language: string;
            const tooltipDataPoints: VisualTooltipDataItem[] = [];
            language = getLocalizedString(this.locale, "LanguageKey");
            let measureFormat: string;
            measureFormat = this.measureFormat;
            let targetFormat: string;
            targetFormat = this.targetFormat;
            let ytdDisplayName: string = "";
            let ytdTarget: string;
            ytdTarget = "ytdtarget";
            this.dataViews.metadata.columns.forEach((element: any) => {
                if (element.roles[ytdTarget]) {
                    ytdDisplayName = element.displayName;
                }
            });
            let formatter: IValueFormatter;
            formatter = valueFormatter.create({
                format: measureFormat ? measureFormat : valueFormatter.DefaultNumericFormat
            });
            if (value.ytd) {
                let formatter1: IValueFormatter;
                formatter1 = valueFormatter.create({
                    format: targetFormat ? targetFormat : valueFormatter.DefaultNumericFormat
                });
                tooltipDataPoints.push(
                    {
                        displayName: ytdDisplayName,
                        value: formatter1.format(value.ytd)
                    });
            } else {
                tooltipDataPoints.push({
                    displayName: value.category,
                    value: formatter.format(value.value)
                });
            }
            for (const iCounter of value.tooltip) {
                const tooltipData: VisualTooltipDataItem = {
                    displayName: "",
                    value: ""
                };
                tooltipData.displayName = iCounter.name.toString();
                tooltipData.value = iCounter.value.toString();
                tooltipDataPoints.push(tooltipData);
            }

            return tooltipDataPoints;
        }

    }
}
